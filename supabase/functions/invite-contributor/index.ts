import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, display_name, comp_instance_id } = await req.json()

    if (!email || !comp_instance_id) {
      return new Response(
        JSON.stringify({ error: 'email and comp_instance_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createAdminClient()

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify this competition belongs to the caller (or caller is admin)
    const { data: instance } = await adminClient
      .from('comp_instances')
      .select('id, name, organiser_id')
      .eq('id', comp_instance_id)
      .single()

    if (!instance) {
      return new Response(
        JSON.stringify({ error: 'Competition not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (instance.organiser_id !== user.id) {
      const { data: roleData } = await adminClient
        .from('user_role_assignments')
        .select('roles(name)')
        .eq('user_id', user.id)
        .is('revoked_at', null)
        .is('comp_instance_id', null)

      const isAdmin = (roleData as { roles: { name: string } }[] | null)
        ?.some(r => r.roles?.name === 'super_admin')

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: 'You are not the organiser of this competition' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check if a user with this email already exists AND has confirmed their account
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find((u: { email?: string }) => u.email === email)
    const isConfirmed = existingUser?.email_confirmed_at != null

    if (existingUser && isConfirmed) {
    // User has a fully active account — just assign the scoped contributor role
    const { data: contributorRole } = await adminClient
        .from('roles')
        .select('id')
        .eq('name', 'contributor')
        .single()

    const { error: assignError } = await adminClient
        .from('user_role_assignments')
        .insert({
        user_id: existingUser.id,
        role_id: contributorRole?.id,
        comp_instance_id,
        granted_by: user.id,
        })

    if (assignError && assignError.code !== '23505') {
        throw assignError
    }

    return new Response(
        JSON.stringify({
        success: true,
        mode: 'existing_user_assigned',
        message: `${email} already has an account and was added as a contributor to ${instance.name}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    }

    if (existingUser && !isConfirmed) {
  const { error: resendError } = await adminClient
    .auth.admin.inviteUserByEmail(email, {
      data: {
        display_name: display_name ?? null,
        invited_as: 'contributor',
        invited_by: user.id,
        comp_instance_id,
      },
      redirectTo: 'http://localhost:3000/callback'
    })

  if (resendError) {
    throw resendError
  }

  return new Response(
    JSON.stringify({
      success: true,
      mode: 'invite_resent',
      message: `A new invite link was sent to ${email}`,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

    // New user — send an invite
    const { data: inviteData, error: inviteError } = await adminClient
        .auth.admin.inviteUserByEmail(email, {
            data: {
            display_name: display_name ?? null,
            invited_as:   'contributor',
            invited_by:   user.id
            },
            redirectTo: 'http://localhost:3000/callback'
    })

    if (inviteError) {
      if (inviteError.message?.includes('rate limit')) {
        return new Response(
          JSON.stringify({ error: 'Too many invites sent. Please wait before trying again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw inviteError
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'invited',
        invited_user: {
          id: inviteData.user.id,
          email: inviteData.user.email,
        },
        message: `Invite sent to ${email} for ${instance.name}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('invite-contributor error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})