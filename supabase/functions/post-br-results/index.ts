import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.js'
import { createAdminClient } from '../_shared/supabase.js'

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
      // Array of results:
      // {
      //   participant_id,  // from match_participants table
      //   placement,       // 1, 2, 3...
      //   kills            // number of kills
      // }
      results
    } = await req.json()

    // 3. Validate
    if (!match_id || !results || !Array.isArray(results) || results.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'match_id and results array are required',
          hint: 'results must be an array of { participant_id, placement, kills }'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createAdminClient()

    // 4. Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Fetch the match
    const { data: match, error: matchError } = await adminClient
      .from('matches')
      .select('id, status, contrib_id, match_format, comp_instance_id, game_title_id')
      .eq('id', match_id)
      .single()

    if (matchError || !match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Must be a BR match
    if (match.match_format !== 'battle_royale') {
      return new Response(
        JSON.stringify({ error: 'This function is only for Battle Royale matches' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Match must be live
    if (match.status !== 'live') {
      return new Response(
        JSON.stringify({
          error: `Match is not live. Current status: '${match.status}'`,
          hint: 'Trigger the match to live first using trigger-match-status'
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Check permission
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

    // 9. Check results haven't already been posted
    const { data: existingResults } = await adminClient
      .from('br_match_results')
      .select('id')
      .eq('match_id', match_id)
      .limit(1)

    if (existingResults && existingResults.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Results have already been posted for this match',
          hint: 'Use correct-match-event to void and repost if needed'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 10. Validate placements are unique and sequential
    const placements = results.map((r: { placement: number }) => r.placement)
    const uniquePlacements = new Set(placements)

    if (uniquePlacements.size !== results.length) {
      return new Response(
        JSON.stringify({ error: 'Duplicate placements found — each team must have a unique placement' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 11. Fetch BR points config for this competition + game title
    const { data: pointsConfig } = await adminClient
      .from('br_points_config')
      .select('placement, placement_points, kill_points')
      .eq('comp_instance_id', match.comp_instance_id)
      .eq('game_title_id', match.game_title_id)
      .order('placement', { ascending: true })

    // Build a placement → points map
    type PointsConfig = {
        placement: number,
        placement_points: number,
        kill_points: number
    }

    const pointsMap = new Map<number, PointsConfig>(
        (pointsConfig ?? []).map((p: PointsConfig) => [p.placement, p])
    )

    // 12. Validate all participant IDs belong to this match
    const participantIds = results.map((r: { participant_id: string }) => r.participant_id)

    const { data: participants } = await adminClient
      .from('match_participants')
      .select('id')
      .eq('match_id', match_id)
      .in('id', participantIds)

    if (!participants || participants.length !== results.length) {
      return new Response(
        JSON.stringify({
          error: 'One or more participant IDs do not belong to this match',
          hint: 'Check match_participants for valid participant IDs for this match'
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 13. Build result rows with calculated points
    const resultRows = results.map((r: {
      participant_id: string,
      placement: number,
      kills: number
    }) => {
      const config = pointsMap.get(r.placement) as PointsConfig | undefined
      const placementPts = config?.placement_points ?? 0
      const killPts      = (r.kills ?? 0) * (config?.kill_points ?? 1)

      return {
        match_id,
        participant_id:  r.participant_id,
        placement:       r.placement,
        kills:           r.kills ?? 0,
        placement_pts:   placementPts,
        kill_pts:        killPts,
        posted_by:       user.id
      }
    })

    // 14. Insert all results
    const { data: insertedResults, error: insertError } = await adminClient
      .from('br_match_results')
      .insert(resultRows)
      .select()

    if (insertError) throw insertError

    // 15. Mark match as completed
    await adminClient
      .from('matches')
      .update({
        status:   'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', match_id)

    // 16. Log status change
    await adminClient
      .from('match_status_log')
      .insert({
        match_id,
        old_status:   'live',
        new_status:   'completed',
        triggered_by: user.id,
        reason:       'BR results posted'
      })

    // 17. Return results sorted by placement
    const sortedResults = (insertedResults ?? [])
      .sort((a: { placement: number }, b: { placement: number }) =>
        a.placement - b.placement
      )
      .map((r: {
        participant_id: string,
        placement: number,
        kills: number,
        placement_pts: number,
        kill_pts: number,
        total_pts: number
      }) => ({
        participant_id: r.participant_id,
        placement:      r.placement,
        kills:          r.kills,
        placement_pts:  r.placement_pts,
        kill_pts:       r.kill_pts,
        total_pts:      r.total_pts
      }))

    return new Response(
      JSON.stringify({
        success: true,
        match_id,
        results: sortedResults,
        match_status: 'completed',
        message: `BR results posted — ${sortedResults.length} teams recorded`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('post-br-results error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})