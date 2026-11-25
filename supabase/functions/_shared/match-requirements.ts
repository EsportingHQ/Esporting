// Rules a match must meet before it goes live or ends:
//  * every team that has a roster for this game must have its roster confirmed for the match
//  * a game other than football needs an MVP before the match can end
// Returns an error message, or null when the match is good to go.
// deno-lint-ignore no-explicit-any
export async function checkMatchRequirements(admin: any, matchId: string, stage: 'live' | 'completed'): Promise<string | null> {
  const { data: m } = await admin
    .from('matches')
    .select('comp_instance_id, game_title_id, team_home_id, team_away_id, mvp_player_id, game_titles(game_types(slug))')
    .eq('id', matchId)
    .single()
  if (!m) return null

  const teamIds = new Set<string>()
  if (m.team_home_id) teamIds.add(m.team_home_id)
  if (m.team_away_id) teamIds.add(m.team_away_id)
  const { data: parts } = await admin.from('match_participants').select('team_id').eq('match_id', matchId)
  for (const p of parts ?? []) if (p.team_id) teamIds.add(p.team_id)

  const { data: lineups } = await admin.from('match_lineups').select('team_id').eq('match_id', matchId)
  const played = new Set<string>((lineups ?? []).map((l: { team_id: string }) => l.team_id))

  for (const teamId of teamIds) {
    const { count } = await admin
      .from('player_game_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('comp_instance_id', m.comp_instance_id)
      .eq('game_title_id', m.game_title_id)
      .eq('team_id', teamId)
      .eq('is_active', true)
    if ((count ?? 0) > 0 && !played.has(teamId)) {
      const { data: t } = await admin.from('teams').select('name').eq('id', teamId).single()
      return `Confirm the rosters first (${t?.name ?? 'a team'} is not confirmed).`
    }
  }

  if (stage === 'completed') {
    const gt = Array.isArray(m.game_titles) ? m.game_titles[0] : m.game_titles
    const gtype = Array.isArray(gt?.game_types) ? gt.game_types[0] : gt?.game_types
    if (gtype?.slug !== 'football' && played.size > 0 && !m.mvp_player_id) {
      return 'Pick the match MVP before ending the match.'
    }
  }
  return null
}
