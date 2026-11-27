'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

type Team = { id: string; name: string; slug: string | null };
type RawMatch = {
  id: string;
  status: string;
  game_title_id: string;
  team_home_id: string | null;
  team_away_id: string | null;
  winner_team_id: string | null;
  mvp_player_id: string | null;
  game_titles: One<{ name: string; game_types?: One<{ slug: string }> }>;
  home_team: One<Team>;
  away_team: One<Team>;
};
type RawMap = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  map_winner: string | null;
  mvp_player_id: string | null;
};
type RawEvent = { match_id: string; event_type: string; team_id: string | null; player_id: string | null; value: number | null };

type TeamRow = { team: Team; played: number; wins: number; mapsWon: number; points: number; goals: number };
type PlayerRow = { id: string; name: string; team: string | null; mapMvps: number; matchMvps: number; goals: number };
type GameStats = { id: string; name: string; kind: 'football' | 'br' | 'multiplayer'; teams: TeamRow[]; players: PlayerRow[] };

// Points for the MVP ranking: a map MVP is worth 1, a match MVP is worth 2
const MAP_MVP_POINTS = 1;
const MATCH_MVP_POINTS = 2;

export default function CompetitionStats({ compId }: { compId: string }) {
  const [games, setGames] = useState<GameStats[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    (async () => {
      const { data: mRows } = await supabase
        .from('matches')
        .select(
          `id, status, game_title_id, team_home_id, team_away_id, winner_team_id, mvp_player_id,
           game_titles(name, game_types(slug)),
           home_team:teams!matches_team_home_id_fkey(id, name, slug),
           away_team:teams!matches_team_away_id_fkey(id, name, slug)`,
        )
        .eq('comp_instance_id', compId)
        .is('deleted_at', null)
        .in('status', ['completed', 'walkover', 'live']);
      const matches = (mRows ?? []) as unknown as RawMatch[];
      const ids = matches.map((m) => m.id);
      if (ids.length === 0) {
        if (!cancelled) setGames([]);
        return;
      }
      const [{ data: mapRows }, { data: evRows }, { data: lineRows }] = await Promise.all([
        supabase
          .from('match_maps')
          .select('match_id, home_score, away_score, map_winner, mvp_player_id')
          .in('match_id', ids)
          .eq('status', 'completed'),
        supabase
          .from('match_events')
          .select('match_id, event_type, team_id, player_id, value')
          .in('match_id', ids)
          .eq('is_void', false)
          .in('event_type', ['goal', 'penalty_goal']),
        supabase.from('match_lineups').select('match_id, team_id, player_id').in('match_id', ids),
      ]);
      const maps = (mapRows ?? []) as RawMap[];
      const events = (evRows ?? []) as RawEvent[];
      const lineups = (lineRows ?? []) as { match_id: string; team_id: string; player_id: string }[];

      const playerIds = new Set<string>();
      for (const m of matches) if (m.mvp_player_id) playerIds.add(m.mvp_player_id);
      for (const m of maps) if (m.mvp_player_id) playerIds.add(m.mvp_player_id);
      for (const e of events) if (e.player_id) playerIds.add(e.player_id);
      const { data: pRows } = playerIds.size
        ? await supabase.from('players').select('id, gamertag').in('id', [...playerIds])
        : { data: [] as { id: string; gamertag: string }[] };
      const gamertag = new Map((pRows ?? []).map((p) => [p.id, p.gamertag]));
      const teamName = new Map<string, string>();
      for (const m of matches) {
        const h = one(m.home_team);
        const a = one(m.away_team);
        if (h) teamName.set(h.id, h.name);
        if (a) teamName.set(a.id, a.name);
      }
      const teamOfPlayer = (matchId: string, playerId: string) =>
        lineups.find((l) => l.match_id === matchId && l.player_id === playerId)?.team_id ?? null;

      const byGame = new Map<string, RawMatch[]>();
      for (const m of matches) byGame.set(m.game_title_id, [...(byGame.get(m.game_title_id) ?? []), m]);

      const out: GameStats[] = [];
      for (const [gameId, list] of byGame) {
        const gt = one(list[0].game_titles);
        const slug = one(gt?.game_types ?? null)?.slug ?? '';
        const kind: GameStats['kind'] = slug === 'football' ? 'football' : slug.includes('br') ? 'br' : 'multiplayer';
        if (kind === 'br') continue; // battle royale kills are not tracked yet
        const gameMatchIds = new Set(list.map((m) => m.id));

        const teams = new Map<string, TeamRow>();
        const row = (t: Team) => {
          if (!teams.has(t.id)) teams.set(t.id, { team: t, played: 0, wins: 0, mapsWon: 0, points: 0, goals: 0 });
          return teams.get(t.id)!;
        };
        for (const m of list) {
          const h = one(m.home_team);
          const a = one(m.away_team);
          if (!h || !a) continue;
          const done = m.status === 'completed' || m.status === 'walkover';
          if (done) {
            row(h).played += 1;
            row(a).played += 1;
            if (m.winner_team_id === h.id) row(h).wins += 1;
            if (m.winner_team_id === a.id) row(a).wins += 1;
          }
        }
        for (const mp of maps) {
          if (!gameMatchIds.has(mp.match_id)) continue;
          const m = list.find((x) => x.id === mp.match_id)!;
          const h = one(m.home_team);
          const a = one(m.away_team);
          if (!h || !a) continue;
          row(h).points += Number(mp.home_score ?? 0);
          row(a).points += Number(mp.away_score ?? 0);
          if (mp.map_winner === 'home') row(h).mapsWon += 1;
          if (mp.map_winner === 'away') row(a).mapsWon += 1;
        }
        const players = new Map<string, PlayerRow>();
        const prow = (id: string, matchId: string) => {
          if (!players.has(id)) {
            const tid = teamOfPlayer(matchId, id);
            players.set(id, { id, name: gamertag.get(id) ?? 'Player', team: tid ? (teamName.get(tid) ?? null) : null, mapMvps: 0, matchMvps: 0, goals: 0 });
          }
          return players.get(id)!;
        };
        for (const e of events) {
          if (!gameMatchIds.has(e.match_id) || !e.player_id) continue;
          const g = Number(e.value ?? 1);
          prow(e.player_id, e.match_id).goals += g;
          const m = list.find((x) => x.id === e.match_id);
          const t = m && [one(m.home_team), one(m.away_team)].find((tt) => tt?.id === e.team_id);
          if (t) row(t).goals += g;
        }
        for (const m of list) if (m.mvp_player_id) prow(m.mvp_player_id, m.id).matchMvps += 1;
        for (const mp of maps) if (gameMatchIds.has(mp.match_id) && mp.mvp_player_id) prow(mp.mvp_player_id, mp.match_id).mapMvps += 1;

        out.push({
          id: gameId,
          name: gt?.name ?? 'Game',
          kind,
          teams: [...teams.values()],
          players: [...players.values()],
        });
      }
      out.sort((a, b) => a.name.localeCompare(b.name));
      if (!cancelled) setGames(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [compId]);

  if (games === null) return <p className="text-sm text-text-muted">Loading stats...</p>;
  if (games.length === 0) return <p className="text-sm text-text-muted">Stats appear once matches are played.</p>;

  return (
    <div className="space-y-10">
      {games.map((g) => (
        <GameBlock key={g.id} game={g} />
      ))}
    </div>
  );
}

const th = 'py-2 px-3 text-left font-display font-bold uppercase tracking-wider text-text-muted';
const thc = 'py-2 px-3 text-center font-display font-bold uppercase tracking-wider text-text-muted';

function GameBlock({ game }: { game: GameStats }) {
  const football = game.kind === 'football';
  const teams = [...game.teams].sort((a, b) =>
    football
      ? b.goals - a.goals || b.wins - a.wins
      : b.mapsWon - a.mapsWon || b.points - a.points || b.wins - a.wins,
  );
  const players = football
    ? game.players.filter((p) => p.goals > 0).sort((a, b) => b.goals - a.goals)
    : game.players
        .filter((p) => p.mapMvps + p.matchMvps > 0)
        .sort(
          (a, b) =>
            b.mapMvps * MAP_MVP_POINTS + b.matchMvps * MATCH_MVP_POINTS -
              (a.mapMvps * MAP_MVP_POINTS + a.matchMvps * MATCH_MVP_POINTS) || b.matchMvps - a.matchMvps,
        );

  return (
    <section className="space-y-4">
      <h3 className="font-display font-black text-lg uppercase tracking-wider">{game.name}</h3>

      <div className="bg-bg-surface border border-border-line rounded overflow-x-auto">
        <p className="px-3 pt-3 text-[11px] font-display font-bold uppercase tracking-wider text-text-muted">
          {football ? 'Team ranking: goals scored' : 'Team ranking: maps won, then points'}
        </p>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-line">
              <th className={`${thc} w-10`}>#</th>
              <th className={th}>Team</th>
              <th className={thc}>P</th>
              <th className={thc}>W</th>
              {football ? <th className={thc}>Goals</th> : (<><th className={thc}>Maps won</th><th className={thc}>Points</th></>)}
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => (
              <tr key={t.team.id} className="border-b border-border-line/60 last:border-0">
                <td className="py-2 px-3 text-center font-data text-text-muted">{i + 1}</td>
                <td className="py-2 px-3 font-medium">
                  <Link href={`/teams/${t.team.slug ?? t.team.id}`} className="hover:text-accent-primary">
                    {t.team.name}
                  </Link>
                </td>
                <td className="py-2 px-3 text-center font-data">{t.played}</td>
                <td className="py-2 px-3 text-center font-data">{t.wins}</td>
                {football ? (
                  <td className="py-2 px-3 text-center font-data font-bold">{t.goals}</td>
                ) : (
                  <>
                    <td className="py-2 px-3 text-center font-data font-bold">{t.mapsWon}</td>
                    <td className="py-2 px-3 text-center font-data">{t.points}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-bg-surface border border-border-line rounded overflow-x-auto">
        <p className="px-3 pt-3 text-[11px] font-display font-bold uppercase tracking-wider text-text-muted">
          {football ? 'Top scorers' : 'MVP ranking'}
        </p>
        {players.length === 0 ? (
          <p className="px-3 py-4 text-xs text-text-muted">{football ? 'No goals recorded yet.' : 'No MVPs picked yet.'}</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-line">
                <th className={`${thc} w-10`}>#</th>
                <th className={th}>Player</th>
                {football ? (
                  <th className={thc}>Goals</th>
                ) : (
                  <>
                    <th className={thc}>Map MVP</th>
                    <th className={thc}>Match MVP</th>
                    <th className={thc}>Points</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-b border-border-line/60 last:border-0">
                  <td className="py-2 px-3 text-center font-data text-text-muted">{i + 1}</td>
                  <td className="py-2 px-3">
                    <Link href={`/players/${p.id}`} className="font-medium hover:text-accent-primary">
                      {p.name}
                    </Link>
                    {p.team ? <span className="ml-2 text-text-muted">{p.team}</span> : null}
                  </td>
                  {football ? (
                    <td className="py-2 px-3 text-center font-data font-bold">{p.goals}</td>
                  ) : (
                    <>
                      <td className="py-2 px-3 text-center font-data">{p.mapMvps}</td>
                      <td className="py-2 px-3 text-center font-data">{p.matchMvps}</td>
                      <td className="py-2 px-3 text-center font-data font-bold">
                        {p.mapMvps * MAP_MVP_POINTS + p.matchMvps * MATCH_MVP_POINTS}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
