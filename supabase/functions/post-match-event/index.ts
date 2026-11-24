    import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
    import { corsHeaders } from '../_shared/cors.ts'
    import { createAdminClient } from '../_shared/supabase.ts'

    serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth header
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
        match_map_id,  // required for shooter games, null for football single match
        event_type,
        team_id,
        player_id,
        value,
        meta
        } = await req.json()

        // 3. Validate required fields
        if (!match_id || !event_type) {
        return new Response(
            JSON.stringify({ error: 'match_id and event_type are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 4. Validate event_type is allowed
        const ALLOWED_EVENTS = [
        // Football
        'goal', 'own_goal', 'penalty_goal', 'penalty_miss',
        'yellow_card', 'red_card', 'half_time', 'full_time', 'extra_time',
        // Shooter MP
        'score_update', 'round_end', 'map_end',
        // System
        'map_selected', 'mode_selected'
        ]

        if (!ALLOWED_EVENTS.includes(event_type)) {
        return new Response(
            JSON.stringify({
            error: `Invalid event_type: '${event_type}'`,
            allowed: ALLOWED_EVENTS
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        const adminClient = createAdminClient()

        // 5. Verify user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

        if (userError || !user) {
        return new Response(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 6. Fetch the match
        const { data: match, error: matchError } = await adminClient
        .from('matches')
        .select('id, status, contrib_id, match_format, game_title_id, team_home_id, team_away_id, best_of')
        .eq('id', match_id)
        .single()

        if (matchError || !match) {
        return new Response(
            JSON.stringify({ error: 'Match not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 7. Match must be LIVE to accept events
        // Exception: map_selected and mode_selected can be set before live
        const requiresLive = !['map_selected', 'mode_selected'].includes(event_type)
        if (requiresLive && match.status !== 'live') {
        return new Response(
            JSON.stringify({
            error: `Match is not live. Current status: '${match.status}'`,
            hint: 'Trigger the match to live first using trigger-match-status'
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 8. Check permission — assigned contributor or super_admin
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

        // 9. Game-specific validation
        const validationError = await validateEvent({
        match,
        event_type,
        team_id,
        player_id,
        value,
        match_map_id,
        meta,
        adminClient
        })

        if (validationError) {
        return new Response(
            JSON.stringify({ error: validationError }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        }

        // 10. Insert the event
        const { data: event, error: insertError } = await adminClient
        .from('match_events')
        .insert({
            match_id,
            match_map_id:   match_map_id ?? null,
            event_type,
            team_id:        team_id ?? null,
            player_id:      player_id ?? null,
            value:          value ?? null,
            meta:           meta ?? {},
            triggered_by:   user.id,
            is_correction:  false,
            is_void:        false
        })
        .select()
        .single()

        if (insertError) throw insertError

        // 11. Handle side effects per event type
        await handleSideEffects({
        match,
        event,
        event_type,
        match_map_id,
        team_id,
        value,
        meta,
        adminClient
        })

        return new Response(
        JSON.stringify({
            success: true,
            event_id: event.id,
            match_id,
            event_type,
            timestamp: event.created_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('post-match-event error:', error)
        return new Response(
        JSON.stringify({ error: 'Internal server error', detail: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
    })

    // ============================================================
    // VALIDATION — game-specific rules
    // ============================================================

    async function validateEvent({
    match,
    event_type,
    team_id,
    player_id,
    value,
    match_map_id,
    meta,
    adminClient
    }: {
    match: Record<string, string | number>,
    event_type: string,
    team_id: string | null,
    player_id: string | null,
    value: number | null,
    match_map_id: string | null,
    meta: Record<string, unknown> | null | undefined,
    adminClient: ReturnType<typeof createAdminClient>
    }): Promise<string | null> {

    // ── Football events ──────────────────────────────────────
    if (['goal', 'own_goal', 'penalty_goal', 'penalty_miss'].includes(event_type)) {

        // Must be a head_to_head match
        if (match.match_format !== 'head_to_head') {
        return 'Football events can only be posted on head_to_head matches'
        }

        // Football series (best of 2+): every goal belongs to the match being played
        if (Number(match.best_of) > 1 || match_map_id) {
        if (!match_map_id) return 'Start a match first, goals are logged against the live match'
        const { data: liveMatch } = await adminClient
            .from('match_maps')
            .select('id, status')
            .eq('id', match_map_id)
            .eq('match_id', match.id)
            .single()
        if (!liveMatch) return 'match_map_id does not belong to this match'
        if (liveMatch.status !== 'live') return 'That match is not live. Start it before logging goals'
        }

        // team_id is required for goal events
        if (!team_id) {
        return `team_id is required for event '${event_type}'`
        }

        // team_id must be one of the two teams in this match
        if (team_id !== match.team_home_id && team_id !== match.team_away_id) {
        return 'team_id does not belong to this match'
        }

        // player_id must be in the lineup if provided
        if (player_id) {
        const { data: lineup } = await adminClient
            .from('match_lineups')
            .select('id')
            .eq('match_id', match.id)
            .eq('player_id', player_id)
            .eq('team_id', team_id)
            .single()

        if (!lineup) {
            return 'Player is not in the lineup for this match'
        }
        }
    }

    // ── Card events ──────────────────────────────────────────
    if (['yellow_card', 'red_card'].includes(event_type)) {
        if (!team_id) return 'team_id is required for card events'
        if (!player_id) return 'player_id is required for card events'

        if (team_id !== match.team_home_id && team_id !== match.team_away_id) {
        return 'team_id does not belong to this match'
        }
    }

    // ── CODM MP score update ─────────────────────────────────
    if (event_type === 'score_update') {
        if (!match_map_id) {
        return 'match_map_id is required for score_update events'
        }

        if (!team_id) {
        return 'team_id is required for score_update events'
        }

        // Verify the match_map belongs to this match
        const { data: matchMap } = await adminClient
        .from('match_maps')
        .select('id, status')
        .eq('id', match_map_id)
        .eq('match_id', match.id)
        .single()

        if (!matchMap) {
        return 'match_map_id does not belong to this match'
        }

        if (matchMap.status !== 'live') {
        return `Map is not live. Current map status: '${matchMap.status}'`
        }

        // value must be provided and non-negative
        if (value === null || value === undefined || value < 0) {
        return 'value must be a non-negative number for score_update'
        }

        // the score must belong to one of the two teams in this match
        if (team_id !== match.team_home_id && team_id !== match.team_away_id) {
        return 'team_id does not belong to this match'
        }
    }

    // ── Map end ──────────────────────────────────────────────
    if (event_type === 'map_end') {
        if (!match_map_id) return 'match_map_id is required for map_end'

        const { data: matchMap } = await adminClient
        .from('match_maps')
        .select('id, status, home_score, away_score')
        .eq('id', match_map_id)
        .eq('match_id', match.id)
        .single()

        if (!matchMap) return 'match_map_id does not belong to this match'
        if (matchMap.status !== 'live') return 'Map is not currently live'

        // MOBA (MLBB): the winner is whoever destroys the base, picked by the
        // contributor. Scores (kills) are optional.
        const { data: titleRow } = await adminClient
        .from('game_titles')
        .select('game_types(slug)')
        .eq('id', match.game_title_id)
        .single()
        const typeRel = (titleRow as { game_types?: { slug?: string } | { slug?: string }[] | null } | null)?.game_types
        const typeSlug = Array.isArray(typeRel) ? typeRel[0]?.slug : typeRel?.slug
        if (typeSlug === 'football') return null  // score comes from the goals logged in this match
        if (typeSlug === 'moba') {
        const w = (meta as Record<string, unknown> | null | undefined)?.winner
        if (w !== 'home' && w !== 'away') return 'Pick which team won this game before ending it'
        return null
        }

        // A game can only end once a score has been entered for BOTH teams.
        // match_maps scores default to 0, so "entered" is read from the
        // score_update events, not from the score columns.
        const { data: scoreEvents, error: scoreEventsError } = await adminClient
        .from('match_events')
        .select('team_id')
        .eq('match_id', match.id)
        .eq('match_map_id', match_map_id)
        .eq('event_type', 'score_update')
        .or('is_void.is.null,is_void.eq.false')

        if (scoreEventsError) return 'Could not check the scores for this game. Please try again.'

        const scoredTeams = new Set((scoreEvents ?? []).map((e: { team_id: string | null }) => e.team_id))
        if (!scoredTeams.has(match.team_home_id) || !scoredTeams.has(match.team_away_id)) {
        return 'Enter the score for both teams before ending this game'
        }
    }

    // ── Map/mode selection ───────────────────────────────────
    if (['map_selected', 'mode_selected'].includes(event_type)) {
        if (!match_map_id) return 'match_map_id is required for map/mode selection'
    }

    return null  // no validation error
    }

    // ============================================================
    // SIDE EFFECTS — what happens after an event is inserted
    // ============================================================

    async function handleSideEffects({
    match,
    event,
    event_type,
    match_map_id,
    team_id,
    value,
    meta,
    adminClient
    }: {
    match: Record<string, string | number>,
    event: Record<string, unknown>,
    event_type: string,
    match_map_id: string | null,
    team_id: string | null,
    value: number | null,
    meta: Record<string, unknown>,
    adminClient: ReturnType<typeof createAdminClient>
    }) {

    // ── score_update: update match_maps scores ───────────────
    if (event_type === 'score_update' && match_map_id && team_id) {
        const isHome = team_id === match.team_home_id

        if (isHome) {
        await adminClient
            .from('match_maps')
            .update({ home_score: value })
            .eq('id', match_map_id)
        } else {
        await adminClient
            .from('match_maps')
            .update({ away_score: value })
            .eq('id', match_map_id)
        }
    }

    // ── football goal logged in a series match: refresh that match's score ──
    if (['goal', 'penalty_goal', 'own_goal'].includes(event_type) && match_map_id) {
        await syncMapScoreFromGoals(adminClient, match, match_map_id)
    }

    // ── map_end: mark map completed, determine winner ────────
    if (event_type === 'map_end' && match_map_id) {
        const { data: mapData } = await adminClient
        .from('match_maps')
        .select('home_score, away_score')
        .eq('id', match_map_id)
        .single()

        // Football: the match score is exactly the goals logged, so the winner follows them
        const { data: titleRow2 } = await adminClient
        .from('game_titles')
        .select('game_types(slug)')
        .eq('id', match.game_title_id)
        .single()
        const rel2 = (titleRow2 as { game_types?: { slug?: string } | { slug?: string }[] | null } | null)?.game_types
        const slug2 = Array.isArray(rel2) ? rel2[0]?.slug : rel2?.slug
        if (slug2 === 'football') {
        await syncMapScoreFromGoals(adminClient, match, match_map_id)
        const { data: fresh } = await adminClient
            .from('match_maps').select('home_score, away_score').eq('id', match_map_id).single()
        if (fresh && mapData) { mapData.home_score = fresh.home_score; mapData.away_score = fresh.away_score }
        }

        if (mapData) {
        const pickedWinner = (meta as Record<string, unknown> | null | undefined)?.winner
        const mapWinner =
            pickedWinner === 'home' || pickedWinner === 'away' ? pickedWinner :
            mapData.home_score > mapData.away_score ? 'home' :
            mapData.away_score > mapData.home_score ? 'away' : 'draw'

        const durationSeconds = meta?.duration_seconds as number ?? null

        await adminClient
            .from('match_maps')
            .update({
            status: 'completed',
            map_winner: mapWinner,
            ended_at: new Date().toISOString(),
            duration_seconds: durationSeconds
            })
            .eq('id', match_map_id)

        // Update maps won count on the match
        const { data: allMaps } = await adminClient
            .from('match_maps')
            .select('map_winner')
            .eq('match_id', match.id)
            .eq('status', 'completed')

        if (allMaps) {
            const homeMapsWon = allMaps.filter((m: { map_winner: string }) => m.map_winner === 'home').length
            const awayMapsWon = allMaps.filter((m: { map_winner: string }) => m.map_winner === 'away').length
            
            await adminClient
            .from('matches')
            .update({
                home_maps_won: homeMapsWon,
                away_maps_won: awayMapsWon
            })
            .eq('id', match.id)
        }
        }
    }

    // ── full_time: mark match completed ─────────────────────
    if (event_type === 'full_time') {
        // Get final score from match_scores
        const { data: scoreData } = await adminClient
        .from('match_scores')
        .select('home_current_score, away_current_score')
        .eq('match_id', match.id)
        .single()

        if (scoreData) {
        const winner =
            scoreData.home_current_score > scoreData.away_current_score
            ? match.team_home_id
            : scoreData.away_current_score > scoreData.home_current_score
            ? match.team_away_id
            : null  // draw

        await adminClient
            .from('matches')
            .update({
            status: 'completed',
            ended_at: new Date().toISOString(),
            winner_team_id: winner
            })
            .eq('id', match.id)

        // Log the status change
        await adminClient
            .from('match_status_log')
            .insert({
            match_id: match.id,
            old_status: 'live',
            new_status: 'completed',
            triggered_by: event.triggered_by,
            reason: 'Full time'
            })
        }
    }

    // ── map_selected: update match_maps with map_id ──────────
    if (event_type === 'map_selected' && match_map_id && meta?.map_id) {
        await adminClient
        .from('match_maps')
        .update({ map_id: meta.map_id as string })
        .eq('id', match_map_id)
    }

    // ── mode_selected: update match_maps with mode_id ────────
    if (event_type === 'mode_selected' && match_map_id && meta?.mode_id) {
        await adminClient
        .from('match_maps')
        .update({ mode_id: meta.mode_id as string })
        .eq('id', match_map_id)
    }
    }

// Goals logged against one match of a series decide that match's score
// (own goals count for the other team). Voided and corrected events are ignored.
async function syncMapScoreFromGoals(
    adminClient: ReturnType<typeof createAdminClient>,
    match: Record<string, string | number>,
    matchMapId: string
) {
    const { data: goals } = await adminClient
    .from('match_events')
    .select('event_type, team_id, value')
    .eq('match_id', match.id)
    .eq('match_map_id', matchMapId)
    .in('event_type', ['goal', 'penalty_goal', 'own_goal'])
    .or('is_void.is.null,is_void.eq.false')

    let home = 0
    let away = 0
    for (const g of (goals ?? []) as { event_type: string, team_id: string | null, value: number | null }[]) {
    const v = Number(g.value ?? 1)
    const forHome = g.event_type === 'own_goal' ? g.team_id === match.team_away_id : g.team_id === match.team_home_id
    if (forHome) home += v; else away += v
    }

    await adminClient
    .from('match_maps')
    .update({ home_score: home, away_score: away })
    .eq('id', matchMapId)
}
