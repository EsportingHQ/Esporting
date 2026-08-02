    import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
    import { corsHeaders } from '../_shared/cors.ts'
    import { createAdminClient } from '../_shared/supabase.ts'

    serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
        return new Response(
            JSON.stringify({ error: 'Missing Authorization header' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 2. Parse body
        const {
        match_id,
        corrected_event_id,  // the wrong event to void
        reason,              // why it's being corrected
        // Optional: replacement event data
        // If provided, inserts a new correct event after voiding the wrong one
        replacement_event_type,
        replacement_team_id,
        replacement_player_id,
        replacement_value,
        replacement_meta,
        replacement_match_map_id
        } = await req.json()

        if (!match_id || !corrected_event_id) {
        return new Response(
            JSON.stringify({ error: 'match_id and corrected_event_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        const adminClient = createAdminClient()

        // 3. Verify user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

        if (userError || !user) {
        return new Response(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 4. Fetch the match
        const { data: match, error: matchError } = await adminClient
        .from('matches')
        .select('id, status, contrib_id')
        .eq('id', match_id)
        .single()

        if (matchError || !match) {
        return new Response(
            JSON.stringify({ error: 'Match not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 5. Check permission
        const isAssigned = match.contrib_id === user.id
        if (!isAssigned) {
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
            JSON.stringify({ error: 'You are not assigned to this match' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
        }

        // 6. Fetch the event to be corrected
        const { data: wrongEvent, error: eventError } = await adminClient
        .from('match_events')
        .select('id, match_id, event_type, is_void, is_correction')
        .eq('id', corrected_event_id)
        .single()

        if (eventError || !wrongEvent) {
        return new Response(
            JSON.stringify({ error: 'Event to correct not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 7. Event must belong to this match
        if (wrongEvent.match_id !== match_id) {
        return new Response(
            JSON.stringify({ error: 'Event does not belong to this match' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 8. Cannot correct an already voided event
        if (wrongEvent.is_void) {
        return new Response(
            JSON.stringify({ error: 'This event has already been voided' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 9. Cannot correct a correction event itself
        if (wrongEvent.is_correction) {
        return new Response(
            JSON.stringify({ error: 'Cannot correct a correction event' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 10. Insert the correction event
        // The DB trigger (trg_void_corrected_event) will automatically
        // mark the wrong event as is_void = true
        const { data: correctionEvent, error: correctionError } = await adminClient
        .from('match_events')
        .insert({
            match_id,
            event_type:          'correction',
            is_correction:       true,
            corrected_event_id,
            triggered_by:        user.id,
            meta: {
            reason: reason ?? 'No reason provided',
            corrected_event_type: wrongEvent.event_type
            },
            is_void: false
        })
        .select()
        .single()

        if (correctionError) throw correctionError

        // 11. If a replacement event was provided, insert it now
        let replacementEvent = null
        if (replacement_event_type) {
        const { data: repEvent, error: repError } = await adminClient
            .from('match_events')
            .insert({
            match_id,
            match_map_id:   replacement_match_map_id ?? null,
            event_type:     replacement_event_type,
            team_id:        replacement_team_id ?? null,
            player_id:      replacement_player_id ?? null,
            value:          replacement_value ?? null,
            meta:           replacement_meta ?? {},
            triggered_by:   user.id,
            is_correction:  false,
            is_void:        false
            })
            .select()
            .single()

        if (repError) throw repError
        replacementEvent = repEvent
        }

        // 12. Recalculate match_scores from scratch
        // Since an event was voided, we need to rebuild the score
        await recalculateScore(match_id, match, adminClient)

        return new Response(
        JSON.stringify({
            success: true,
            correction_event_id: correctionEvent.id,
            voided_event_id: corrected_event_id,
            replacement_event_id: replacementEvent?.id ?? null,
            match_id,
            timestamp: correctionEvent.created_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('correct-match-event error:', error)
        return new Response(
        JSON.stringify({ error: 'Internal server error', detail: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
    })

    // ============================================================
    // RECALCULATE SCORE
    // ============================================================
    // Called after a correction to rebuild match_scores from
    // all non-void events. This is the source of truth recalc.

    async function recalculateScore(
    match_id: string,
    match: Record<string, string>,
    adminClient: ReturnType<typeof createAdminClient>
    ) {
    // Fetch all non-void goal events for this match
    const { data: goalEvents } = await adminClient
        .from('match_events')
        .select('event_type, team_id, value')
        .eq('match_id', match_id)
        .in('event_type', ['goal', 'penalty_goal', 'own_goal'])
        .eq('is_void', false)

    if (!goalEvents) return

    let homeGoals = 0
    let awayGoals = 0

    for (const evt of goalEvents) {
        if (evt.event_type === 'own_goal') {
        // Own goal counts for the opponent
        if (evt.team_id === match.team_home_id) awayGoals += (evt.value ?? 1)
        else homeGoals += (evt.value ?? 1)
        } else {
        if (evt.team_id === match.team_home_id) homeGoals += (evt.value ?? 1)
        else awayGoals += (evt.value ?? 1)
        }
    }

    // Get last non-void event id
    const { data: lastEvent } = await adminClient
        .from('match_events')
        .select('id')
        .eq('match_id', match_id)
        .eq('is_void', false)
        .order('sequence_no', { ascending: false })
        .limit(1)
        .single()

    // Upsert match_scores with recalculated values
    await adminClient
        .from('match_scores')
        .upsert({
        match_id,
        home_current_score: homeGoals,
        away_current_score: awayGoals,
        score_breakdown: {
            home_goals: homeGoals,
            away_goals: awayGoals
        },
        last_event_id: lastEvent?.id ?? null,
        updated_at: new Date().toISOString()
        }, { onConflict: 'match_id' })
    }