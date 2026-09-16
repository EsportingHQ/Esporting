'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export interface Team {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
}

export interface GameTitle {
    name: string;
    slug: string;
    short_code: string;
    game_types?: { slug: string };
}

export interface Match {
    id: string;
    comp_instance_id: string;
    stage_id: string | null;
    group_id: string | null;
    game_title_id: string;
    team_home_id: string | null;
    team_away_id: string | null;
    match_format: 'head_to_head' | 'battle_royale';
    best_of: number;
    scheduled_at: string;
    started_at: string | null;
    ended_at: string | null;
    status: 'scheduled' | 'delayed' | 'live' | 'completed' | 'cancelled' | 'walkover';
    winner_team_id: string | null;
    home_maps_won: number;
    away_maps_won: number;
    contrib_id: string | null;
    notes: string | null;
    team_home?: Team;
    team_away?: Team;
    game_title?: GameTitle;
}

export interface ScoreBreakdown {
    home_goals?: number;
    away_goals?: number;
    home_score?: number;
    away_score?: number;
    [key: string]: number | undefined;
}

export interface MatchScore {
    match_id: string;
    current_map_id: string | null;
    home_maps_won: number;
    away_maps_won: number;
    home_current_score: number;
    away_current_score: number;
    score_breakdown: ScoreBreakdown | null;
    last_event_id: string | null;
    updated_at: string;
}

export interface MatchEventMeta {
    minute?: number;
    map_number?: number;
    reason?: string;
    home_score?: number;
    away_score?: number;
    [key: string]: unknown;
}

export interface MatchEvent {
    id: string;
    match_id: string;
    match_map_id: string | null;
    event_type: string;
    team_id: string | null;
    player_id: string | null;
    value: number | null;
    meta: MatchEventMeta | null;
    triggered_by: string | null;
    is_correction: boolean;
    corrected_event_id: string | null;
    is_void: boolean;
    sequence_no: number;
    created_at: string;
    player?: { display_name: string };
team?: { name: string; slug: string };
}

export interface MatchStatusLog {
    id: string;
    match_id: string;
    old_status: string | null;
    new_status: string;
    triggered_by: string | null;
    reason: string | null;
    created_at: string;
}

export interface MatchMap {
    id: string;
    match_id: string;
    map_number: number;
    map_id: string | null;
    mode_id: string | null;
    home_score: number | null;
    away_score: number | null;
    winner_team_id: string | null;
    status: string;
    maps?: { name: string } | null;
    modes?: { name: string } | null;
}

export interface BRResult {
    id: string;
    match_id: string;
    team_id: string;
    placement: number;
    kills: number;
    placement_points: number;
    kill_points: number;
    total_points: number;
    team?: { name: string; short_code: string | null } | null;
}

export interface HeadToHeadRecord {
    id: string;
    date: string;
    competition: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    winner: string;
}

// NOTE: Your schema does not currently track possession/shots/cards
// as discrete stat columns. This is a real feature gap, not a wiring gap.
// For now this stays null/unset until match_events aggregation or a
// dedicated match_stats table is designed. Do not fill this with fake
// numbers on the real data path — leave it null so the UI can show
// "Not available" honestly instead of a fabricated stat.
export interface MatchStats {
    homePossession: number;
    awayPossession: number;
    homeShots: number;
    awayShots: number;
    homeShotsOnTarget: number;
    awayShotsOnTarget: number;
    homeYellowCards: number;
    awayYellowCards: number;
    homeRedCards: number;
    awayRedCards: number;
}

function computeCardStatsFromEvents(events: MatchEvent[], homeTeamId: string | null, awayTeamId: string | null) {
    let homeYellow = 0, awayYellow = 0, homeRed = 0, awayRed = 0;

    for (const evt of events) {
        if (evt.is_void) continue;
        if (evt.event_type === 'yellow_card') {
        if (evt.team_id === homeTeamId) homeYellow++;
        if (evt.team_id === awayTeamId) awayYellow++;
        }
        if (evt.event_type === 'red_card') {
        if (evt.team_id === homeTeamId) homeRed++;
        if (evt.team_id === awayTeamId) awayRed++;
        }
    }

    return { homeYellow, awayYellow, homeRed, awayRed };
    }

export function useMatchRealtime(matchId: string) {
    const [match, setMatch] = useState<Match | null>(null);
    const [score, setScore] = useState<MatchScore | null>(null);
    const [events, setEvents] = useState<MatchEvent[]>([]);
    const [statusLogs, setStatusLogs] = useState<MatchStatusLog[]>([]);
    const [headToHead, setHeadToHead] = useState<HeadToHeadRecord[]>([]);
    // Cards are derived from real events. Possession/shots are not tracked
    // by the schema yet, so they stay at 0 rather than fabricated numbers.
    const [matchStats, setMatchStats] = useState<MatchStats>({
        homePossession: 0,
        awayPossession: 0,
        homeShots: 0,
        awayShots: 0,
        homeShotsOnTarget: 0,
        awayShotsOnTarget: 0,
        homeYellowCards: 0,
        awayYellowCards: 0,
        homeRedCards: 0,
        awayRedCards: 0,
    });
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [matchMaps, setMatchMaps] = useState<MatchMap[]>([]);
    const [brResults, setBrResults] = useState<BRResult[]>([]);

        useEffect(() => {
        const supabase = createClient();

        const fetchInitial = async () => {
            setIsLoading(true);
            setConnectionStatus('connecting');

        try {
            const { data: matchData, error: matchErr } = await supabase
            .from('matches')
            .select('*, team_home:teams!matches_team_home_id_fkey(*), team_away:teams!matches_team_away_id_fkey(*), game_title:game_titles(*, game_types(*))')
            .eq('id', matchId)
            .single();

            if (matchErr) throw matchErr;
            setMatch(matchData);

            const { data: scoreData } = await supabase
            .from('match_scores')
            .select('*')
            .eq('match_id', matchId)
            .single();
            if (scoreData) setScore(scoreData);

            const { data: eventsData } = await supabase
            .from('match_events')
            .select('*, team:teams(*)')
            .eq('match_id', matchId)
            .eq('is_void', false)
            .order('sequence_no', { ascending: false });

            const resolvedEvents = (eventsData ?? []) as MatchEvent[];
            setEvents(resolvedEvents);

            if (matchData) {
            const cardStats = computeCardStatsFromEvents(
                resolvedEvents,
                matchData.team_home_id,
                matchData.team_away_id,
            );
            setMatchStats((prev) => ({
                ...prev,
                homeYellowCards: cardStats.homeYellow,
                awayYellowCards: cardStats.awayYellow,
                homeRedCards: cardStats.homeRed,
                awayRedCards: cardStats.awayRed,
            }));
            }

            const { data: logsData } = await supabase
            .from('match_status_log')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false });
            if (logsData) setStatusLogs(logsData);

            const { data: mapsData } = await supabase
            .from('match_maps')
            .select(`
                *,
                maps(name),
                modes(name)
            `)
            .eq('match_id', matchId)
            .order('map_number', { ascending: true });

            if (mapsData) setMatchMaps(mapsData as MatchMap[]);

            const { data: brData } = await supabase
            .from('br_match_results')
            .select(`
                *,
                team:teams(name, short_code)
            `)
            .eq('match_id', matchId)
            .order('placement', { ascending: true });

            if (brData) setBrResults(brData as BRResult[]);

            // Head-to-head: past completed matches between the same two teams
            if (matchData?.team_home_id && matchData?.team_away_id) {
            const { data: h2hData } = await supabase
                .from('matches')
                .select(`
                id, ended_at, team_home_id, team_away_id,
                team_home:teams!matches_team_home_id_fkey(name),
                team_away:teams!matches_team_away_id_fkey(name),
                comp_instances(name),
                match_scores(home_current_score, away_current_score)
                `)
                .eq('status', 'completed')
                .neq('id', matchId)
                .or(
                `and(team_home_id.eq.${matchData.team_home_id},team_away_id.eq.${matchData.team_away_id}),and(team_home_id.eq.${matchData.team_away_id},team_away_id.eq.${matchData.team_home_id})`,
                )
                .order('ended_at', { ascending: false })
                .limit(5);

            if (h2hData) {
                const records: HeadToHeadRecord[] = h2hData.map((row: {
                id: string;
                ended_at: string | null;
                team_home: { name: string }[] | { name: string } | null;
                team_away: { name: string }[] | { name: string } | null;
                comp_instances: { name: string }[] | { name: string } | null;
                match_scores: { home_current_score: number; away_current_score: number }[] | { home_current_score: number; away_current_score: number } | null;
                }) => {
                const home = Array.isArray(row.team_home) ? row.team_home[0] : row.team_home;
                const away = Array.isArray(row.team_away) ? row.team_away[0] : row.team_away;
                const comp = Array.isArray(row.comp_instances) ? row.comp_instances[0] : row.comp_instances;
                const scoreRow = Array.isArray(row.match_scores) ? row.match_scores[0] : row.match_scores;

                const homeScore = scoreRow?.home_current_score ?? 0;
                const awayScore = scoreRow?.away_current_score ?? 0;
                const winner =
                    homeScore > awayScore ? (home?.name ?? 'Home')
                    : awayScore > homeScore ? (away?.name ?? 'Away')
                    : 'Draw';

                return {
                    id: row.id,
                    date: row.ended_at ? new Date(row.ended_at).toLocaleDateString() : '',
                    competition: comp?.name ?? '',
                    homeTeam: home?.name ?? 'TBD',
                    awayTeam: away?.name ?? 'TBD',
                    homeScore,
                    awayScore,
                    winner,
                };
                });
                setHeadToHead(records);
            }
            }

            setConnectionStatus('connected');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            setConnectionStatus('error');
        } finally {
            setIsLoading(false);
        }
        };

        fetchInitial();

        const channel = supabase.channel(`match-room-${matchId}`);

        channel
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
            (payload) => {
            setMatch((prev) => (prev ? { ...prev, ...payload.new } : (payload.new as Match)));
            },
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'match_scores', filter: `match_id=eq.${matchId}` },
            (payload) => {
            setScore(payload.new as MatchScore);
            },
        )
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
            (payload) => {
            const newEv = payload.new as MatchEvent;
            if (newEv.is_void) return;
            setEvents((prev) => [newEv, ...prev]);
            },
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
            (payload) => {
            const updated = payload.new as MatchEvent;
            setEvents((prev) =>
                updated.is_void
                ? prev.filter((e) => e.id !== updated.id)
                : prev.map((e) => (e.id === updated.id ? { ...e, ...updated } : e)),
            );
            },
        )
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'match_status_log', filter: `match_id=eq.${matchId}` },
            (payload) => {
            setStatusLogs((prev) => [payload.new as MatchStatusLog, ...prev]);
            },
        )
        .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [matchId]);

    return {
        match,
        score,
        events,
        statusLogs,
        headToHead,
        matchStats,
        connectionStatus,
        isLoading,
        error,
        matchMaps,
        brResults,
    };
}