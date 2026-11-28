'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MatchCardProps } from '@/components/broadcast/match-card';
import { TickerMatch } from '@/components/broadcast/broadcast-ticker';
import { ToastMessage } from '@/components/ui/ScoreToast';
import { useNotificationPrefs } from './useNotificationPrefs';
import { useFavorites } from './useFavorites';

export interface CompetitionGroup {
  id: string;
  name: string;
  slug: string;
  gameTitle: string;
  gameType: 'football' | 'shooter' | 'br';
  logoUrl: string | null;
  liveCount: number;
  matches: MatchCardProps[];
}

type RawTeamObj = { id: string; name: string; short_code: string | null; logo_url?: string | null };
type RawTeam = RawTeamObj | RawTeamObj[] | null;
type RawGameTitle = { name: string; slug: string; game_types?: { slug: string } | { slug: string }[] | null } | { name: string; slug: string; game_types?: { slug: string } | { slug: string }[] | null }[] | null;
type RawCompObj = { id: string; name: string; slug: string; banner_url?: string | null };
type RawCompInstance = RawCompObj | RawCompObj[] | null;

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
  match_maps?: { status: string }[] | null;
  home_team_id?: string | null;
  live_label?: string;
  red_home?: number;
  red_away?: number;
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

function mapStatusLabel(status: string, scheduledAt: string | null, football: boolean): string {
  if (status === 'live') return 'LIVE';
  if (status === 'completed' || status === 'walkover') return football ? 'FT' : 'ENDED';
  if (status === 'cancelled') return 'CANC';
  if (scheduledAt) {
    return new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  }
  return 'TBD';
}

// Extra live state: HT (latest event is half time), BREAK (between games of a series), red-card counts.
type EvRow = { match_id: string; event_type: string; team_id: string | null; created_at: string };
const HT_WINDOW_MS = 25 * 60 * 1000;

function applyLiveState(rows: RawMatchRow[], events: EvRow[]) {
  const byMatch = new Map<string, EvRow[]>();
  for (const e of events) {
    if (!byMatch.has(e.match_id)) byMatch.set(e.match_id, []);
    byMatch.get(e.match_id)!.push(e);
  }
  for (const row of rows) {
    const evs = (byMatch.get(row.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const homeId = one(row.home_team)?.id;
    row.red_home = evs.filter((e) => e.event_type === 'red_card' && e.team_id === homeId).length;
    row.red_away = evs.filter((e) => e.event_type === 'red_card' && e.team_id && e.team_id !== homeId).length;
    if (row.status !== 'live') continue;
    const football = mapGameType(one(one(row.game_titles)?.game_types ?? null)?.slug) === 'football';
    const last = evs.filter((e) => !['correction', 'status_change'].includes(e.event_type)).pop();
    if (football && last?.event_type === 'half_time' && Date.now() - new Date(last.created_at).getTime() < HT_WINDOW_MS) {
      row.live_label = 'HT';
      continue;
    }
    const maps = row.match_maps ?? [];
    if ((row.best_of ?? 1) > 1 && maps.length > 1) {
      const anyLive = maps.some((m) => m.status === 'live');
      const done = maps.filter((m) => m.status === 'completed').length;
      if (!anyLive && done > 0 && done < maps.length) row.live_label = 'BREAK';
    }
  }
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
    homeTeam: { id: home?.id ?? '', name: home?.name ?? 'TBD', shortCode: home?.short_code ?? '', logoUrl: home?.logo_url ?? null },
    awayTeam: { id: away?.id ?? '', name: away?.name ?? 'TBD', shortCode: away?.short_code ?? '', logoUrl: away?.logo_url ?? null },
    scheduledAt: row.scheduled_at,
    homeScore: scoreRow?.home_current_score ?? 0,
    awayScore: scoreRow?.away_current_score ?? 0,
    homeMapsWon: row.home_maps_won ?? undefined,
    awayMapsWon: row.away_maps_won ?? undefined,
    bestOf: row.best_of ?? 1,
    status: row.status as MatchCardProps['status'],
    timeLabel: row.live_label ?? mapStatusLabel(row.status, row.scheduled_at, mapGameType(gameTypeObj?.slug) === 'football'),
    breakLabel: row.live_label,
    redHome: row.red_home ?? 0,
    redAway: row.red_away ?? 0,
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
        logoUrl: comp?.banner_url ?? null,
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
  home_team:teams!matches_team_home_id_fkey(id, name, short_code, logo_url),
  away_team:teams!matches_team_away_id_fkey(id, name, short_code, logo_url),
  game_titles(name, slug, game_types(slug)),
  comp_instance:comp_instances!matches_comp_instance_id_fkey(id, name, slug, banner_url),
  match_scores(home_current_score, away_current_score),
  match_maps(status)
`;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useLiveFeed(day: Date) {
  const dayStr = dayKey(day);
  const [matchDays, setMatchDays] = useState<Record<string, number>>({});
  const [liveTotal, setLiveTotal] = useState(0);
  const [tickerMatches, setTickerMatches] = useState<TickerMatch[]>([]);
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { prefs } = useNotificationPrefs();
  const { favorites } = useFavorites();
  // Latest follows, read inside the realtime handler without re-subscribing
  const favoritesRef = useRef(favorites);
  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);
  // Matches already known to be live, so a pop-up fires only when a match actually goes live
  const liveSeen = useRef<Set<string>>(new Set());

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notifyIfFollowed = useCallback(
    async (supabase: ReturnType<typeof createClient>, matchId: string) => {
      const { data } = await supabase.from('matches').select(MATCH_QUERY).eq('id', matchId).maybeSingle();
      const row = data as unknown as RawMatchRow | null;
      if (!row) return;
      const home = one(row.home_team);
      const away = one(row.away_team);
      const comp = one(row.comp_instance);
      const follows = favoritesRef.current;
      const followed = follows.some(
        (f) =>
          (f.type === 'team' && (f.id === home?.id || f.id === away?.id)) ||
          (f.type === 'competition' && f.id === row.comp_instance_id),
      );
      if (!followed) return;
      const scoreRow = one(row.match_scores);
      addToast({
        gameCode: one(row.game_titles)?.name ?? '',
        homeTeam: home?.name ?? 'TBD',
        awayTeam: away?.name ?? 'TBD',
        newScore: `${row.best_of > 1 ? (row.home_maps_won ?? 0) : (scoreRow?.home_current_score ?? 0)} - ${row.best_of > 1 ? (row.away_maps_won ?? 0) : (scoreRow?.away_current_score ?? 0)}`,
        eventType: 'Match is now live',
        matchId: row.id,
        competitionSlug: comp?.slug ?? '',
      });
    },
    [addToast],
  );

  const refetchGroups = useCallback(async (supabase: ReturnType<typeof createClient>) => {
    const [yy, mm, dd] = dayStr.split('-').map(Number);
    const start = new Date(yy, mm - 1, dd, 0, 0, 0, 0);
    const end = new Date(yy, mm - 1, dd + 1, 0, 0, 0, 0);

    const { data, error: fetchErr } = await supabase
      .from('matches')
      .select(MATCH_QUERY)
      .in('status', ['live', 'scheduled', 'delayed', 'completed', 'walkover'])
      .is('deleted_at', null)
      .or('match_format.eq.battle_royale,and(team_home_id.not.is.null,team_away_id.not.is.null)')
      .gte('scheduled_at', start.toISOString())
      .lt('scheduled_at', end.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(300);

    if (fetchErr) throw fetchErr;

    const rows = (data ?? []) as unknown as RawMatchRow[];

    const evIds = rows.filter((r) => r.status === 'live' || r.status === 'completed').map((r) => r.id);
    if (evIds.length) {
      const { data: evs } = await supabase
        .from('match_events')
        .select('match_id, event_type, team_id, created_at')
        .in('match_id', evIds)
        .eq('is_void', false)
        .in('event_type', ['half_time', 'red_card', 'goal', 'penalty_goal', 'own_goal', 'yellow_card', 'penalty_miss', 'full_time'])
        .limit(3000);
      applyLiveState(rows, (evs ?? []) as EvRow[]);
    }

    // Fetch competition metadata separately
    const compIds = [...new Set(rows.map((r) => r.comp_instance_id))];

    const { data: compData, error: compErr } = await supabase
      .from('comp_instances')
      .select('id, name, slug, banner_url')
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

    const { data: liveData } = await supabase
      .from('matches')
      .select(MATCH_QUERY)
      .eq('status', 'live')
      .is('deleted_at', null)
      .limit(100);
    const allLive = (liveData ?? []) as unknown as RawMatchRow[];
    setLiveTotal(allLive.length);
    liveSeen.current = new Set(allLive.map((r) => r.id));
    const liveRows = allLive.slice(0, 6);
    const { data: dayData } = await supabase
      .from('matches')
      .select('scheduled_at')
      .in('status', ['live', 'scheduled', 'delayed', 'completed', 'walkover'])
      .is('deleted_at', null)
      .or('match_format.eq.battle_royale,and(team_home_id.not.is.null,team_away_id.not.is.null)')
      .gte('scheduled_at', new Date(Date.now() - 45 * 86400000).toISOString())
      .lt('scheduled_at', new Date(Date.now() + 120 * 86400000).toISOString())
      .limit(2000);
    const counts: Record<string, number> = {};
    for (const r of dayData ?? []) {
      if (!r.scheduled_at) continue;
      const k = dayKey(new Date(r.scheduled_at));
      counts[k] = (counts[k] ?? 0) + 1;
    }
    setMatchDays(counts);

    const liveCompIds = [...new Set(liveRows.map((r) => r.comp_instance_id))];
    const { data: liveComps } = liveCompIds.length
      ? await supabase.from('comp_instances').select('id, slug').in('id', liveCompIds)
      : { data: [] as { id: string; slug: string }[] };
    const slugById = new Map((liveComps ?? []).map((c) => [c.id, c.slug]));

    const ticker: TickerMatch[] = liveRows.map((row) => {
      const home = one(row.home_team);
      const away = one(row.away_team);
      const gameTitle = one(row.game_titles);
      const scoreRow = one(row.match_scores);

      return {
        id: row.id,
        gameCode: gameTitle?.name ?? '',
        homeTeam: home?.short_code ?? home?.name ?? 'TBD',
        awayTeam: away?.short_code ?? away?.name ?? 'TBD',
        homeScore: row.best_of > 1 ? (row.home_maps_won ?? 0) : (scoreRow?.home_current_score ?? 0),
        awayScore: row.best_of > 1 ? (row.away_maps_won ?? 0) : (scoreRow?.away_current_score ?? 0),
        status: 'live',
        href: `/competitions/${slugById.get(row.comp_instance_id) ?? 'match'}/matches/${row.id}`,
      };
    });
    setTickerMatches(ticker);
  }, [dayStr]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setIsLoading(true);
      try {
        await refetchGroups(supabase);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
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
        { event: 'INSERT', schema: 'public', table: 'match_events' },
        () => {
          refetchGroups(supabase).catch((err) =>
            setError(err instanceof Error ? err : new Error(String(err))),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'match_maps' },
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
          // Pop up only when a match really goes live, and only for matches the person follows
          if (newRow.status === 'live' && newRow.id && !liveSeen.current.has(newRow.id)) {
            liveSeen.current.add(newRow.id);
            if (prefs.matchStart) void notifyIfFollowed(supabase, newRow.id);
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
  }, [refetchGroups, prefs.matchStart, notifyIfFollowed]);

  const liveCount = liveTotal;

  return {
    tickerMatches,
    groups,
    matchDays,
    liveCount,
    isLoading,
    error,
    toasts,
    dismissToast,
  };
}