'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MatchCardProps } from '@/components/broadcast/match-card';
import { TickerMatch } from '@/components/broadcast/broadcast-ticker';
import { ToastMessage } from '@/components/ui/ScoreToast';
import { useNotificationPrefs } from './useNotificationPrefs';

export interface CompetitionGroup {
  id: string;
  name: string;
  slug: string;
  gameTitle: string;
  gameType: 'football' | 'shooter' | 'br';
  liveCount: number;
  matches: MatchCardProps[];
}

type RawTeam =
	| {
			id: string;
			name: string;
			short_code: string | null;
			logo_url: string | null;
		}
	| {
			id: string;
			name: string;
			short_code: string | null;
			logo_url: string | null;
		}[]
	| null;
type RawGameTitle = { name: string; slug: string; game_types?: { slug: string } | { slug: string }[] | null } | { name: string; slug: string; game_types?: { slug: string } | { slug: string }[] | null }[] | null;
type RawCompInstance = { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;

interface RawMatchRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  home_maps_won: number | null;
  away_maps_won: number | null;
  best_of: number;
  comp_instance_id: string;
  home_team: RawTeam;
  away_team: RawTeam;
  game_titles: RawGameTitle;
  comp_instance: RawCompInstance;
  match_scores: { home_current_score: number; away_current_score: number }[] | { home_current_score: number; away_current_score: number } | null;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapGameType(gameTypeSlug: string | undefined): 'football' | 'shooter' | 'br' {
  if (gameTypeSlug === 'football') return 'football';
  if (gameTypeSlug?.includes('br')) return 'br';
  return 'shooter';
}

function mapStatusLabel(status: string, scheduledAt: string | null): string {
  if (status === 'live') return 'LIVE NOW';
  if (status === 'completed') return 'Finished';
  if (status === 'delayed') return 'Delayed';
  if (status === 'scheduled' && scheduledAt) {
    return new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return status;
}

function mapRowToCardProps(row: RawMatchRow): MatchCardProps {
  const home = one(row.home_team);
  const away = one(row.away_team);
  const gameTitle = one(row.game_titles);
  const gameTypeObj = one(gameTitle?.game_types ?? null);
  const scoreRow = one(row.match_scores);

  return {
    id: row.id,
    gameType: mapGameType(gameTypeObj?.slug),
    gameTitle: gameTitle?.name ?? '',
    homeTeam: {
      id: home?.id ?? '',
      name: home?.name ?? 'TBD',
      shortCode: home?.short_code ?? '',
      logoUrl: home?.logo_url ?? null,
    },
    awayTeam: {
      id: away?.id ?? '',
      name: away?.name ?? 'TBD',
      shortCode: away?.short_code ?? '',
      logoUrl: away?.logo_url ?? null,
    },
    homeScore: scoreRow?.home_current_score ?? 0,
    awayScore: scoreRow?.away_current_score ?? 0,
    homeMapsWon: row.home_maps_won ?? undefined,
    awayMapsWon: row.away_maps_won ?? undefined,
    bestOf: row.best_of > 1 ? row.best_of : undefined,
    status: row.status as MatchCardProps['status'],
    timeLabel: mapStatusLabel(row.status, row.scheduled_at),
    competitionSlug:
      one(row.comp_instance)?.slug ??
        (row.comp_instance_id === 'e88e0b35-1782-4143-b857-af6d3d7ae807'
          ? 'lagos-mobile-championship-season-1-2026'
          : row.comp_instance_id),
  };
}

function groupMatchesByCompetition(rows: RawMatchRow[]): CompetitionGroup[] {
  const byComp = new Map<string, CompetitionGroup>();

  for (const row of rows) {
    // Support both alias names during migration/cache refresh
    const comp =
      one((row as RawMatchRow & { comp_instances?: RawCompInstance }).comp_instances) ??
      one(row.comp_instance);

    const compId = comp?.id ?? row.comp_instance_id;

    const fallbackName = 'Competition';
    const fallbackSlug = row.comp_instance_id;

    const compName = comp?.name ?? fallbackName;
    const compSlug = comp?.slug ?? fallbackSlug;

    const gameTitle = one(row.game_titles);
    const gameTypeObj = one(gameTitle?.game_types ?? null);
    const gameType = mapGameType(gameTypeObj?.slug);

    if (!byComp.has(compId)) {
      byComp.set(compId, {
        id: compId,
        name: compName,
        slug: compSlug,
        gameTitle: gameTitle?.name ?? '',
        gameType,
        liveCount: 0,
        matches: [],
      });
    }

    const group = byComp.get(compId)!;
    const cardProps = mapRowToCardProps(row);
    group.matches.push(cardProps);

    if (row.status === 'live') group.liveCount += 1;
  }

  return Array.from(byComp.values());
}

const MATCH_QUERY = `
  id, status, scheduled_at, match_format, home_maps_won, away_maps_won, best_of, comp_instance_id,

  home_team:teams!matches_team_home_id_fkey(
    id,
    name,
    short_code,
    logo_url
  ),

  away_team:teams!matches_team_away_id_fkey(
    id,
    name,
    short_code,
    logo_url
  ),

  game_titles(name, slug, game_types(slug)),
  comp_instance:comp_instances!matches_comp_instance_id_fkey(id, name, slug),
  match_scores(home_current_score, away_current_score)
`;

export function useLiveFeed(date?: string) {
  const [tickerMatches, setTickerMatches] = useState<TickerMatch[]>([]);
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { prefs } = useNotificationPrefs();

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refetchGroups = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    let query = supabase
      .from('matches')
      .select(MATCH_QUERY)
      .in('status', ['live', 'scheduled', 'delayed', 'completed'])
      .is('deleted_at', null);

    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59`);

      query = query
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString());
    }

    const { data, error: fetchErr } = await query
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(50);

    if (fetchErr) throw fetchErr;

    const rows = (data ?? []) as unknown as RawMatchRow[];

    // Fetch competition metadata separately
    const compIds = [...new Set(rows.map((r) => r.comp_instance_id))];

    const { data: compData, error: compErr } = await supabase
      .from('comp_instances')
      .select('id, name, slug')
      .in('id', compIds);

    if (compErr) throw compErr;

    const compMap = new Map(
      (compData ?? []).map((c) => [c.id, c]),
    );

    // Attach competition metadata manually
    const rowsWithComp = rows.map((row) => ({
      ...row,
      comp_instance: compMap.get(row.comp_instance_id) ?? null,
    }));

    const builtGroups = groupMatchesByCompetition(rowsWithComp);

    setGroups(builtGroups);

    const liveRows = rows.filter((r) => r.status === 'live').slice(0, 6);
    const ticker: TickerMatch[] = liveRows.map((row) => {
      const home = one(row.home_team);
      const away = one(row.away_team);
      const gameTitle = one(row.game_titles);
      const scoreRow = one(row.match_scores);

      console.log('ROW HOME TEAM', row.home_team);
      console.log('ROW AWAY TEAM', row.away_team);

      return {
        id: row.id,
        gameCode: gameTitle?.name ?? '',

        homeTeam: {
          id: home?.id,
          name: home?.name ?? 'TBD',
          shortCode: home?.short_code ?? 'TBD',
          logoUrl: home?.logo_url ?? null,
        },

        awayTeam: {
          id: away?.id,
          name: away?.name ?? 'TBD',
          shortCode: away?.short_code ?? 'TBD',
          logoUrl: away?.logo_url ?? null,
        },

        homeScore: scoreRow?.home_current_score ?? 0,
        awayScore: scoreRow?.away_current_score ?? 0,
        status: 'live',
      };
    });
    setTickerMatches(ticker);
  }, [date]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setIsLoading(true);
      try {
        await refetchGroups(supabase);
        setError(null);
      } catch (err) {
        console.error('Live feed fetch failed', err);
        // keep previous data instead of crashing the UI
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Subscribe to live score and status changes across all matches.
    // On any relevant change, refetch the grouped feed — simplest
    // correct approach given matches span many competitions at once.
    const channel = supabase
      .channel('public-live-feed')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_scores' },
        () => {
          refetchGroups(supabase).catch((err) =>
            setError(err instanceof Error ? err : new Error(String(err))),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const newRow = payload.new as { status?: string; id?: string };
          if (newRow.status === 'live' && prefs.matchStart) {
            addToast({
              gameCode: '',
              homeTeam: '',
              awayTeam: '',
              newScore: '',
              eventType: 'Match is now live',
              matchId: newRow.id ?? '',
              competitionSlug: '',
            });
          }
          refetchGroups(supabase).catch((err) =>
            setError(err instanceof Error ? err : new Error(String(err))),
          );
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [refetchGroups, prefs.matchStart, addToast]);

  const liveCount = groups.reduce((acc, g) => acc + g.liveCount, 0);

  return {
    tickerMatches,
    groups,
    liveCount,
    isLoading,
    error,
    toasts,
    dismissToast,
  };
}