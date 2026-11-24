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

export interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
}

export interface TeamPlayer {
  id: string;
  name: string;
  role: string;
  game: string;
}

export interface TeamCompetition {
  name: string;
  slug: string;
  status: string;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}


export function useTeamDetail(slug: string) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [roster, setRoster] = useState<TeamPlayer[]>([]);
  const [activeComps, setActiveComps] = useState<TeamCompetition[]>([]);
  const [form, setForm] = useState<FormEntry[]>([]);
  const [record, setRecord] = useState({ played: 0, won: 0, drawn: 0, lost: 0, winRate: 0 });
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
        const { data: teamRow, error: teamErr } = await supabase
          .from('teams')
          .select('id, name, slug, short_code')
          .eq('slug', slug)
          .single();

        if (teamErr || !teamRow) {
          setNotFound(true);
          return;
        }

        setTeam({
          id: teamRow.id,
          name: teamRow.name,
          slug: teamRow.slug,
          shortCode: teamRow.short_code ?? '',
        });

        // Roster: current players, each with the games they are entered for.
        const [{ data: rosterRows }, { data: assignRows }] = await Promise.all([
          supabase
            .from('team_rosters')
            .select('role, players(id, gamertag)')
            .eq('team_id', teamRow.id)
            .is('left_at', null),
          supabase
            .from('player_game_assignments')
            .select('player_id, game_titles(name)')
            .eq('team_id', teamRow.id),
        ]);

        const gamesByPlayer = new Map<string, Set<string>>();
        for (const a of (assignRows ?? []) as unknown as {
          player_id: string;
          game_titles: { name: string } | { name: string }[] | null;
        }[]) {
          const name = one(a.game_titles)?.name;
          if (!name) continue;
          gamesByPlayer.set(a.player_id, (gamesByPlayer.get(a.player_id) ?? new Set()).add(name));
        }

        const seenPlayers = new Set<string>();
        const rosterList: TeamPlayer[] = [];
        for (const r of (rosterRows ?? []) as unknown as {
          role: string | null;
          players: { id: string; gamertag: string } | { id: string; gamertag: string }[] | null;
        }[]) {
          const p = one(r.players);
          if (!p || seenPlayers.has(p.id)) continue;
          seenPlayers.add(p.id);
          rosterList.push({
            id: p.id,
            name: p.gamertag,
            role: r.role ?? 'Player',
            game: [...(gamesByPlayer.get(p.id) ?? [])].join(' · ') || 'Unassigned',
          });
        }
        setRoster(rosterList);

        // Competitions the team is entered in
        const { data: regs } = await supabase
          .from('comp_registrations')
          .select('comp_instances(name, slug, status)')
          .eq('team_id', teamRow.id)
          .eq('status', 'approved');

        setActiveComps(
          (regs ?? [])
            .map((r: { comp_instances: { name: string; slug: string; status: string } | { name: string; slug: string; status: string }[] | null }) => one(r.comp_instances))
            .filter(Boolean)
            .map((c) => ({
              name: c!.name,
              slug: c!.slug,
              status: c!.status,
            })),
        );

        // Every finished match counts toward the record and form, across all games and competitions.
        const { data: matches } = await supabase
          .from('matches')
          .select(FORM_MATCH_SELECT)
          .or(`team_home_id.eq.${teamRow.id},team_away_id.eq.${teamRow.id}`)
          .eq('status', 'completed');

        const entries = sortNewestFirst(
          ((matches ?? []) as unknown as RawFormMatch[])
            .map((m) => toFormEntry(m, teamRow.id))
            .filter((e): e is FormEntry => e !== null),
        );
        setForm(entries);
        setRecord(recordOf(entries));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load team'));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [slug]);

  return {
    team,
    roster,
    activeComps,
    form,
    record,
    isLoading,
    notFound,
    error,
  };
}
