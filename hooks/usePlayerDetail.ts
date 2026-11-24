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

export interface PlayerDetail {
  id: string;
  username: string;
  displayName: string;
  teamName: string | null;
  teamSlug: string | null;
  avatarUrl: string | null;
  bio: string | null;
  stats: { label: string; value: string }[];
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
            { label: 'MVP', value: String(entries.filter((e) => e.isMvp).length) },
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

  return { player, assignments, form, isLoading, notFound, error };
}
