'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  FORM_MATCH_SELECT,
  recordOf,
  sortNewestFirst,
  toFormEntry,
  type FormEntry,
  type RawFormMatch,
} from '@/lib/profile-form';

export interface PlayerAssignment {
  competitionName: string;
  competitionSlug: string;
  competitionStatus: string;
  teamId: string;
  teamName: string;
  teamSlug: string;
  gameId: string;
  gameName: string;
}

// One MVP award, with where it came from (the map and mode are already known from the match setup)
export interface MvpEntry {
  id: string;
  matchId: string;
  kind: 'map' | 'match';
  gameName: string;
  mapName: string | null;
  modeName: string | null;
  /** Game number within the series, for map MVPs of a series */
  mapNumber: number | null;
  opponentName: string | null;
  competitionName: string;
  competitionSlug: string | null;
  at: string | null;
}

export interface PlayerDetail {
  id: string;
  username: string;
  displayName: string;
  teamName: string | null;
  teamSlug: string | null;
  avatarUrl: string | null;
  bio: string | null;
  stats: { label: string; value: string; mvp?: 'match' | 'map' }[];
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface RawAssignment {
  comp_instance_id: string;
  team_id: string;
  game_title_id: string;
  assigned_at: string | null;
  teams: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
  game_titles: { name: string } | { name: string }[] | null;
  comp_instances: { name: string; slug: string; status: string } | { name: string; slug: string; status: string }[] | null;
}

export function usePlayerDetail(id: string) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [assignments, setAssignments] = useState<PlayerAssignment[]>([]);
  const [form, setForm] = useState<FormEntry[]>([]);
  const [mvps, setMvps] = useState<{ match: MvpEntry[]; map: MvpEntry[] }>({ match: [], map: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const { data: playerRow, error: playerErr } = await supabase
          .from('players')
          .select('id, gamertag, real_name, avatar_url')
          .eq('id', id)
          .single();

        if (playerErr || !playerRow) {
          setNotFound(true);
          return;
        }

        // Where this player plays: one row per competition, team and game they were entered for.
        const { data: assignRows } = await supabase
          .from('player_game_assignments')
          .select(
            'comp_instance_id, team_id, game_title_id, assigned_at, teams(id, name, slug), game_titles(name), comp_instances(name, slug, status)',
          )
          .eq('player_id', playerRow.id)
          .order('assigned_at', { ascending: false });

        const raw = (assignRows ?? []) as unknown as RawAssignment[];
        const mapped: PlayerAssignment[] = raw.flatMap((a) => {
          const team = one(a.teams);
          const comp = one(a.comp_instances);
          if (!team || !comp) return [];
          return [
            {
              competitionName: comp.name,
              competitionSlug: comp.slug,
              competitionStatus: comp.status,
              teamId: team.id,
              teamName: team.name,
              teamSlug: team.slug,
              gameId: a.game_title_id,
              gameName: one(a.game_titles)?.name ?? 'Game',
            },
          ];
        });
        setAssignments(mapped);

        // Form counts only the matches this player actually played: the contributor ticks
        // them in "Who played", and only finished matches count.
        let entries: FormEntry[] = [];
        const { data: lineupRows } = await supabase
          .from('match_lineups')
          .select('match_id, team_id')
          .eq('player_id', playerRow.id);
        const played = (lineupRows ?? []) as { match_id: string; team_id: string }[];

        if (played.length > 0) {
          const { data: matchRows } = await supabase
            .from('matches')
            .select(FORM_MATCH_SELECT)
            .in('id', played.map((l) => l.match_id))
            .eq('status', 'completed');

          for (const m of (matchRows ?? []) as unknown as RawFormMatch[]) {
            const teamId = played.find((l) => l.match_id === m.id)?.team_id;
            const entry = teamId ? toFormEntry(m, teamId) : null;
            if (entry) entries.push({ ...entry, isMvp: m.mvp_player_id === playerRow.id });
          }
          entries = sortNewestFirst(entries);
        }
        setForm(entries);

        // MVP awards: whole-match MVPs, and MVPs of single games (maps). The map and mode come from
        // the match setup, so no extra input is needed.
        const teamOf = new Map(played.map((l) => [l.match_id, l.team_id]));
        const opponentOf = (home: { id: string; name: string } | null, away: { id: string; name: string } | null, matchId: string) => {
          const mine = teamOf.get(matchId);
          if (!mine) return null;
          return (home?.id === mine ? away : home)?.name ?? null;
        };
        const matchMvps: MvpEntry[] = [];
        const mvpEntries = entries.filter((e) => e.isMvp);
        const mvpMatchIds = mvpEntries.map((e) => e.matchId);
        const { data: mvpMapRows } = mvpMatchIds.length
          ? await supabase
              .from('match_maps')
              .select('match_id, map_number, maps(name), modes(name)')
              .in('match_id', mvpMatchIds)
              .order('map_number', { ascending: true })
          : { data: [] };
        const mapsByMatch = new Map<string, { maps: { name: string } | { name: string }[] | null; modes: { name: string } | { name: string }[] | null }[]>();
        for (const r of (mvpMapRows ?? []) as unknown as { match_id: string; maps: { name: string } | { name: string }[] | null; modes: { name: string } | { name: string }[] | null }[]) {
          const list = mapsByMatch.get(r.match_id) ?? [];
          list.push(r);
          mapsByMatch.set(r.match_id, list);
        }
        for (const e of mvpEntries) {
          const rows = mapsByMatch.get(e.matchId) ?? [];
          // A single-game match has one map and mode; for a series the overall MVP is not tied to one map
          const single = !e.isSeries && rows.length === 1 ? rows[0] : null;
          matchMvps.push({
            id: `match-${e.matchId}`,
            matchId: e.matchId,
            kind: 'match',
            gameName: e.gameName,
            mapName: single ? one(single.maps)?.name ?? null : null,
            modeName: single ? one(single.modes)?.name ?? null : null,
            mapNumber: null,
            opponentName: e.opponentName,
            competitionName: e.competitionName,
            competitionSlug: e.competitionSlug,
            at: e.playedAt,
          });
        }

        const { data: mapMvpRows } = await supabase
          .from('match_maps')
          .select(
            `id, map_number, ended_at, maps(name), modes(name),
             matches(id, scheduled_at, ended_at, best_of,
               home_team:teams!matches_team_home_id_fkey(id, name),
               away_team:teams!matches_team_away_id_fkey(id, name),
               game_titles(name), comp_instances(name, slug))`,
          )
          .eq('mvp_player_id', playerRow.id)
          .order('ended_at', { ascending: false, nullsFirst: false });
        type Named = { id: string; name: string };
        const mapMvps: MvpEntry[] = ((mapMvpRows ?? []) as unknown as {
          id: string;
          map_number: number;
          ended_at: string | null;
          maps: { name: string } | { name: string }[] | null;
          modes: { name: string } | { name: string }[] | null;
          matches:
            | { id: string; scheduled_at: string | null; ended_at: string | null; best_of: number; home_team: Named | Named[] | null; away_team: Named | Named[] | null; game_titles: { name: string } | { name: string }[] | null; comp_instances: { name: string; slug: string } | { name: string; slug: string }[] | null }
            | null
            | unknown[];
        }[]).flatMap((r) => {
          const m = one(r.matches as never) as {
            id: string; scheduled_at: string | null; ended_at: string | null; best_of: number;
            home_team: Named | Named[] | null; away_team: Named | Named[] | null;
            game_titles: { name: string } | { name: string }[] | null;
            comp_instances: { name: string; slug: string } | { name: string; slug: string }[] | null;
          } | null;
          if (!m) return [];
          return [
            {
              id: `map-${r.id}`,
              matchId: m.id,
              kind: 'map' as const,
              gameName: one(m.game_titles)?.name ?? 'Game',
              mapName: one(r.maps)?.name ?? null,
              modeName: one(r.modes)?.name ?? null,
              mapNumber: m.best_of > 1 ? r.map_number : null,
              opponentName: opponentOf(one(m.home_team), one(m.away_team), m.id),
              competitionName: one(m.comp_instances)?.name ?? 'Competition',
              competitionSlug: one(m.comp_instances)?.slug ?? null,
              at: r.ended_at ?? m.ended_at ?? m.scheduled_at,
            },
          ];
        });
        setMvps({ match: matchMvps, map: mapMvps });

        const rec = recordOf(entries);
        const current = mapped[0] ?? null;
        setPlayer({
          id: playerRow.id,
          username: playerRow.gamertag,
          displayName: playerRow.real_name ?? playerRow.gamertag,
          teamName: current?.teamName ?? null,
          teamSlug: current?.teamSlug ?? null,
          avatarUrl: playerRow.avatar_url,
          bio: null,
          stats: [
            { label: 'MATCHES PLAYED', value: String(rec.played) },
            { label: 'WINS', value: String(rec.won) },
            { label: 'DRAWS', value: String(rec.drawn) },
            { label: 'LOSSES', value: String(rec.lost) },
            { label: 'MATCH MVP', value: String(matchMvps.length), mvp: 'match' },
            { label: 'MAP MVP', value: String(mapMvps.length), mvp: 'map' },
          ],
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load player'));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [id]);

  return { player, assignments, form, mvps, isLoading, notFound, error };
}
