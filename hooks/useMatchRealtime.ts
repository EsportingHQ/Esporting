'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';

export interface Team {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
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
  game_title?: {
    name: string;
    slug: string;
    short_code: string;
    game_types?: { slug: string };
  };
}

export interface MatchScore {
  match_id: string;
  current_map_id: string | null;
  home_maps_won: number;
  away_maps_won: number;
  home_current_score: number;
  away_current_score: number;
  score_breakdown: any;
  last_event_id: string | null;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  match_map_id: string | null;
  event_type: string;
  team_id: string | null;
  player_id: string | null;
  value: number | null;
  meta: any;
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

export function useMatchRealtime(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [score, setScore] = useState<MatchScore | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [statusLogs, setStatusLogs] = useState<MatchStatusLog[]>([]);
  const [headToHead, setHeadToHead] = useState<HeadToHeadRecord[]>([]);
  const [matchStats, setMatchStats] = useState<MatchStats>({
    homePossession: 52,
    awayPossession: 48,
    homeShots: 8,
    awayShots: 6,
    homeShotsOnTarget: 4,
    awayShotsOnTarget: 3,
    homeYellowCards: 1,
    awayYellowCards: 2,
    homeRedCards: 0,
    awayRedCards: 0,
  });
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setConnectionStatus('connecting');

    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (hasSupabase) {
      const supabase = createClient();

      const fetchInitial = async () => {
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
            .order('sequence_no', { ascending: false });
          if (eventsData) setEvents(eventsData);

          const { data: logsData } = await supabase
            .from('match_status_log')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false });
          if (logsData) setStatusLogs(logsData);

          setConnectionStatus('connected');
        } catch (err: any) {
          setError(err);
          setConnectionStatus('error');
        } fontally: {
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
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'match_scores', filter: `match_id=eq.${matchId}` },
          (payload) => {
            setScore(payload.new as MatchScore);
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
          (payload) => {
            const newEv = payload.new as MatchEvent;
            setEvents((prev) => [newEv, ...prev]);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } else {
      // Mock flow with rich simulated statistics and H2H records
      const mockHomeTeam: Team = {
        id: 'team-a',
        name: 'Team Kuti',
        slug: 'team-kuti',
        logo_url: null,
      };

      const mockAwayTeam: Team = {
        id: 'team-b',
        name: 'Team Bello',
        slug: 'team-bello',
        logo_url: null,
      };

      const initialMatch: Match = {
        id: matchId,
        comp_instance_id: 'comp-1',
        stage_id: 'stage-1',
        group_id: 'group-a',
        game_title_id: 'game-1',
        team_home_id: 'team-a',
        team_away_id: 'team-b',
        match_format: 'head_to_head',
        best_of: 3,
        scheduled_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        started_at: new Date(Date.now() - 3000 * 1000).toISOString(),
        ended_at: null,
        status: 'live',
        winner_team_id: null,
        home_maps_won: 0,
        away_maps_won: 1,
        contrib_id: 'contrib-1',
        notes: 'Live match broadcast',
        team_home: mockHomeTeam,
        team_away: mockAwayTeam,
        game_title: {
          name: 'FC 26',
          slug: 'fc-26',
          short_code: 'FC26',
          game_types: { slug: 'football' },
        },
      };

      const initialScore: MatchScore = {
        match_id: matchId,
        current_map_id: 'map-1',
        home_maps_won: 0,
        away_maps_won: 1,
        home_current_score: 2,
        away_current_score: 1,
        score_breakdown: { home_goals: 2, away_goals: 1 },
        last_event_id: null,
        updated_at: new Date().toISOString(),
      };

      const initialEvents: MatchEvent[] = [
        {
          id: 'ev-2',
          match_id: matchId,
          match_map_id: 'map-1',
          event_type: 'goal',
          team_id: 'team-a',
          player_id: null,
          value: 1,
          meta: { minute: 54 },
          triggered_by: 'contrib-1',
          is_correction: false,
          corrected_event_id: null,
          is_void: false,
          sequence_no: 2,
          created_at: new Date(Date.now() - 600 * 1000).toISOString(),
          team: mockHomeTeam,
        },
        {
          id: 'ev-1',
          match_id: matchId,
          match_map_id: 'map-1',
          event_type: 'goal',
          team_id: 'team-b',
          player_id: null,
          value: 1,
          meta: { minute: 22 },
          triggered_by: 'contrib-1',
          is_correction: false,
          corrected_event_id: null,
          is_void: false,
          sequence_no: 1,
          created_at: new Date(Date.now() - 2000 * 1000).toISOString(),
          team: mockAwayTeam,
        },
      ];

      const mockH2H: HeadToHeadRecord[] = [
        {
          id: 'h2h-1',
          date: 'June 15, 2026',
          competition: 'UI eSports Qualifiers',
          homeTeam: 'Team Kuti',
          awayTeam: 'Team Bello',
          homeScore: 3,
          awayScore: 2,
          winner: 'Team Kuti',
        },
        {
          id: 'h2h-2',
          date: 'May 02, 2026',
          competition: 'Spring Showdown',
          homeTeam: 'Team Bello',
          awayTeam: 'Team Kuti',
          homeScore: 1,
          awayScore: 1,
          winner: 'Draw',
        },
        {
          id: 'h2h-3',
          date: 'April 11, 2026',
          competition: 'Campus Cup S2',
          homeTeam: 'Team Kuti',
          awayTeam: 'Team Bello',
          homeScore: 0,
          awayScore: 2,
          winner: 'Team Bello',
        },
      ];

      setMatch(initialMatch);
      setScore(initialScore);
      setEvents(initialEvents);
      setHeadToHead(mockH2H);
      setConnectionStatus('connected');
      setIsLoading(false);

      // Simulation loop
      mockIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.7) {
          const isHome = Math.random() > 0.5;
          setScore((prev) =>
            prev
              ? {
                  ...prev,
                  home_current_score: isHome ? prev.home_current_score + 1 : prev.home_current_score,
                  away_current_score: !isHome ? prev.away_current_score + 1 : prev.away_current_score,
                  updated_at: new Date().toISOString(),
                }
              : null
          );

          setMatchStats((prev) => ({
            ...prev,
            homeShots: isHome ? prev.homeShots + 1 : prev.homeShots,
            awayShots: !isHome ? prev.awayShots + 1 : prev.awayShots,
          }));
        }
      }, 10000);

      return () => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
      };
    }
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
  };
}
