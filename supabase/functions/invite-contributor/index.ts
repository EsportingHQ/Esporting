import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase.ts'

type AdminClient = ReturnType<typeof createAdminClient>
type RoleRow = { roles: { name: string } | { name: string }[] | null }
type CompetitionRow = { id: string; name: string; organiser_id: string | null }

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    const body = await req.json()
    let { email, display_name, comp_instance_id } = body
    const requestId: string | null = body.request_id ? String(body.request_id) : null

    if (!email && !requestId) {
      return json({ error: 'email is required' }, 400)
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const adminClient = createAdminClient()
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return json({ error: 'Invalid or expired token' }, 401)
    }

    const isAdmin = await hasGlobalAdminRole(adminClient, user.id)

    // Admin approving an organiser's request: invite exactly what was requested.
    if (requestId) {
      if (!isAdmin) return json({ error: 'Only Esporting can approve contributor requests' }, 403)
      const { data: reqRow } = await adminClient
        .from('contributor_invite_requests')
        .select('email, display_name, comp_instance_id, status')
        .eq('id', requestId)
        .single()
      if (!reqRow || reqRow.status !== 'pending') {
        return json({ error: 'Request not found or already reviewed' }, 404)
      }
      email = reqRow.email
      display_name = reqRow.display_name
      comp_instance_id = reqRow.comp_instance_id
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    const competitionId = comp_instance_id ? String(comp_instance_id) : null

    if (!isAdmin && !competitionId) {
      return json({ error: 'comp_instance_id is required for organiser contributor invites' }, 400)
    }

    let instance: CompetitionRow | null = null
    if (competitionId) {
      const { data } = await adminClient
        .from('comp_instances')
        .select('id, name, organiser_id')
        .eq('id', competitionId)
        .single()

      if (!data) {
        return json({ error: 'Competition not found' }, 404)
      }

      instance = data as CompetitionRow

      if (!isAdmin && instance.organiser_id !== user.id) {
        return json({ error: 'You are not the organiser of this competition' }, 403)
      }
    }

    if (!isAdmin && instance?.organiser_id !== user.id) {
      return json({ error: 'You are not allowed to invite contributors here' }, 403)
    }

    if (!emailRegex.test(normalizedEmail)) {
      return json({ error: 'Invalid email format' }, 400)
    }

    // Organisers only ask. Esporting approves, then the invite email is sent.
    if (!isAdmin) {
      const { error: insertError } = await adminClient.from('contributor_invite_requests').insert({
        comp_instance_id: competitionId,
        email: normalizedEmail,
        display_name: display_name ?? null,
        requested_by: user.id,
      })
      if (insertError) {
        if (insertError.code === '23505') {
          return json({ error: `${normalizedEmail} is already waiting for approval for this tournament` }, 409)
        }
        throw insertError
      }
      return json({
        success: true,
        mode: 'pending_approval',
        message: `Request sent. Esporting will approve ${normalizedEmail} as a contributor for ${instance?.name ?? 'your tournament'}, then they get the invite email.`,
      })
    }

    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (authUser: { email?: string }) => authUser.email?.toLowerCase() === normalizedEmail,
    )

    const redirectTo = `${Deno.env.get('SITE_URL') ?? req.headers.get('origin') ?? 'http://localhost:3000'}/callback`
    const markApproved = async () => {
      if (!requestId) return
      await adminClient
        .from('contributor_invite_requests')
        .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId)
    }
    const scopeLabel = instance ? instance.name : 'all competitions'

    if (existingUser?.email_confirmed_at) {
      await assignContributorRole(adminClient, {
        userId: existingUser.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      })

      await markApproved()
      return json({
        success: true,
        mode: 'existing_user_assigned',
        contributor_scope: competitionId ? 'competition' : 'global',
        message: `${normalizedEmail} already has an account and was added as a contributor for ${scopeLabel}`,
      })
    }

    if (existingUser && !existingUser.email_confirmed_at) {
      const { error: resendError } = await adminClient.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            display_name: display_name ?? null,
            invited_as: 'contributor',
            invited_by: user.id,
            comp_instance_id: competitionId,
          },
          redirectTo,
        },
      )

      if (resendError) throw resendError

      await assignContributorRole(adminClient, {
        userId: existingUser.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      })

      await markApproved()
      return json({
        success: true,
        mode: 'invite_resent',
        contributor_scope: competitionId ? 'competition' : 'global',
        message: `A new invite link was sent to ${normalizedEmail}`,
      })
    }

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          display_name: display_name ?? null,
          invited_as: 'contributor',
          invited_by: user.id,
          comp_instance_id: competitionId,
        },
        redirectTo,
      })

    let invitedUser = inviteData?.user ?? null
    let emailWarning: string | null = null

    if (inviteError) {
      const reason = (inviteError as { message?: string }).message ?? JSON.stringify(inviteError)
      if (reason.includes('rate limit')) {
        return json({ error: 'Too many invites sent. Please wait before trying again.' }, 429)
      }
      // The account is created before the email goes out, so an email-service error can leave a
      // valid invited user behind. Look for it instead of reporting a false failure.
      const { data: after } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
      const created = after?.users?.find(
        (authUser: { email?: string }) => authUser.email?.toLowerCase() === normalizedEmail,
      )
      if (!created) throw inviteError
      invitedUser = created
      emailWarning = reason
      console.error('invite-contributor: user created but email step reported:', reason)
    }

    if (invitedUser?.id) {
      await assignContributorRole(adminClient, {
        userId: invitedUser.id,
        compInstanceId: competitionId,
        grantedBy: user.id,
      })
    }

    await markApproved()
    return json({
      success: true,
      mode: 'invited',
      contributor_scope: competitionId ? 'competition' : 'global',
      invited_user: invitedUser ? { id: invitedUser.id, email: invitedUser.email } : null,
      email_warning: emailWarning,
      message: emailWarning
        ? `${normalizedEmail} was added as a contributor for ${scopeLabel}, but the email service reported a problem (${emailWarning}). If they don't receive the invite, ask them to use "Forgot password" on the sign-in page.`
        : `Invite sent to ${normalizedEmail} for ${scopeLabel}`,
    })
  } catch (err) {
    // Supabase client errors are often plain objects, so String(err) would hide the real reason.
    const e = err as { message?: string; code?: string; details?: string; hint?: string } | null
    const message =
      err instanceof Error ? err.message : e?.message ?? (typeof err === 'string' ? err : JSON.stringify(err))
    console.error('invite-contributor error:', message, e?.code ?? '', e?.details ?? '', e?.hint ?? '')
    return json({ error: message || 'Internal server error', code: e?.code ?? null }, 500)
  }
})

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function hasGlobalAdminRole(adminClient: AdminClient, userId: string) {
  const { data: roleData } = await adminClient
    .from('user_role_assignments')
    .select('roles(name)')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .is('comp_instance_id', null)

  return ((roleData ?? []) as RoleRow[]).some((row) => {
    const roles = Array.isArray(row.roles) ? row.roles : [row.roles]
    return roles.some((role) => role?.name === 'super_admin')
  })
}

async function assignContributorRole(
  adminClient: AdminClient,
  {
    userId,
    compInstanceId,
    grantedBy,
  }: {
    userId: string
    compInstanceId: string | null
    grantedBy: string
  },
) {
  const { data: contributorRole } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'contributor')
    .single()

  if (!contributorRole?.id) {
    throw new Error('Contributor role not found')
  }

  const { error } = await adminClient
    .from('user_role_assignments')
    .insert({
      user_id: userId,
      role_id: contributorRole.id,
      comp_instance_id: compInstanceId,
      granted_by: grantedBy,
    })

  if (error && error.code !== '23505') {
    throw error
  }
}
