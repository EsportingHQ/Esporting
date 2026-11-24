// Win / draw / loss history for a team or a player, built from completed matches.
// A match counts the moment the contributor ends it (status 'completed' + winner_team_id).

export type FormResult = 'W' | 'D' | 'L';

export interface FormEntry {
  matchId: string;
  result: FormResult;
  teamId: string;
  teamName: string;
  opponentName: string;
  opponentSlug: string | null;
  scoreFor: number;
  scoreAgainst: number;
  gameName: string;
  competitionName: string;
  competitionSlug: string | null;
  playedAt: string | null;
}

type TeamRef = { id: string; name: string; slug: string | null };
type Maybe<T> = T | T[] | null;

export interface RawFormMatch {
  id: string;
  status: string;
  scheduled_at: string | null;
  ended_at: string | null;
  best_of: number;
  winner_team_id: string | null;
  team_home_id: string | null;
  team_away_id: string | null;
  home_maps_won: number | null;
  away_maps_won: number | null;
  game_title_id: string | null;
  comp_instance_id: string | null;
  home_team: Maybe<TeamRef>;
  away_team: Maybe<TeamRef>;
  game_titles: Maybe<{ name: string }>;
  comp_instances: Maybe<{ name: string; slug: string }>;
  match_scores: Maybe<{ home_current_score: number; away_current_score: number }>;
}

export const FORM_MATCH_SELECT = `
  id, status, scheduled_at, ended_at, best_of, winner_team_id, team_home_id, team_away_id,
  home_maps_won, away_maps_won, game_title_id, comp_instance_id,
  home_team:teams!matches_team_home_id_fkey(id, name, slug),
  away_team:teams!matches_team_away_id_fkey(id, name, slug),
  game_titles(name),
  comp_instances(name, slug),
  match_scores(home_current_score, away_current_score)
`;

function one<T>(v: Maybe<T> | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** The match as seen from `teamId`'s side. Returns null if that team did not play it. */
export function toFormEntry(m: RawFormMatch, teamId: string): FormEntry | null {
  const isHome = m.team_home_id === teamId;
  const isAway = m.team_away_id === teamId;
  if (!isHome && !isAway) return null;

  const home = one(m.home_team);
  const away = one(m.away_team);
  const me = isHome ? home : away;
  const opp = isHome ? away : home;

  // Series (best of 2+) show games won; single matches show the score.
  const scores = one(m.match_scores);
  const series = m.best_of > 1;
  const homeScore = series ? (m.home_maps_won ?? 0) : (scores?.home_current_score ?? 0);
  const awayScore = series ? (m.away_maps_won ?? 0) : (scores?.away_current_score ?? 0);

  const result: FormResult = m.winner_team_id === teamId ? 'W' : m.winner_team_id ? 'L' : 'D';

  return {
    matchId: m.id,
    result,
    teamId,
    teamName: me?.name ?? 'Team',
    opponentName: opp?.name ?? 'TBD',
    opponentSlug: opp?.slug ?? null,
    scoreFor: isHome ? homeScore : awayScore,
    scoreAgainst: isHome ? awayScore : homeScore,
    gameName: one(m.game_titles)?.name ?? 'Match',
    competitionName: one(m.comp_instances)?.name ?? '',
    competitionSlug: one(m.comp_instances)?.slug ?? null,
    playedAt: m.ended_at ?? m.scheduled_at,
  };
}

/** Newest first. */
export function sortNewestFirst(entries: FormEntry[]): FormEntry[] {
  return [...entries].sort((a, b) => (b.playedAt ?? '').localeCompare(a.playedAt ?? ''));
}

export function recordOf(entries: FormEntry[]) {
  const won = entries.filter((e) => e.result === 'W').length;
  const drawn = entries.filter((e) => e.result === 'D').length;
  const lost = entries.filter((e) => e.result === 'L').length;
  return {
    played: entries.length,
    won,
    drawn,
    lost,
    winRate: entries.length ? Math.round((won / entries.length) * 100) : 0,
  };
}
