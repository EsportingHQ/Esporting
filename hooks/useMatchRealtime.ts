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
  // Joins
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
  // UI helper
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

export function useMatchRealtime(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null);
  const [score, setScore] = useState<MatchScore | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [statusLogs, setStatusLogs] = useState<MatchStatusLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const mockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsLoading(true);

    const hasSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (hasSupabase) {
      const supabase = createClient();

      // Fetch initial data
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
        } catch (err: any) {
          setError(err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchInitial();

      // Set up the consolidated realtime channel
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
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'match_status_log', filter: `match_id=eq.${matchId}` },
          (payload) => {
            const newLog = payload.new as MatchStatusLog;
            setStatusLogs((prev) => [newLog, ...prev]);
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } else {
      // Mock flow
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
        home_current_score: 0,
        away_current_score: 0,
        score_breakdown: { home_goals: 0, away_goals: 0 },
        last_event_id: null,
        updated_at: new Date().toISOString(),
      };

      const initialEvents: MatchEvent[] = [
        {
          id: 'ev-1',
          match_id: matchId,
          match_map_id: 'map-1',
          event_type: 'status_change',
          team_id: null,
          player_id: null,
          value: null,
          meta: { status: 'live' },
          triggered_by: 'contrib-1',
          is_correction: false,
          corrected_event_id: null,
          is_void: false,
          sequence_no: 1,
          created_at: new Date(Date.now() - 3000 * 1000).toISOString(),
        },
      ];

      setMatch(initialMatch);
      setScore(initialScore);
      setEvents(initialEvents);
      setIsLoading(false);

      // Simulate Realtime events
      let homeGoals = 0;
      let awayGoals = 0;
      let sequence = 2;

      mockIntervalRef.current = setInterval(() => {
        const rand = Math.random();

        if (rand < 0.3) {
          // Home goal
          homeGoals += 1;
          const evId = `ev-${sequence++}`;
          const newEvent: MatchEvent = {
            id: evId,
            match_id: matchId,
            match_map_id: 'map-1',
            event_type: 'goal',
            team_id: 'team-a',
            player_id: null,
            value: 1,
            meta: { minute: Math.floor(Math.random() * 90) + 1 },
            triggered_by: 'contrib-1',
            is_correction: false,
            corrected_event_id: null,
            is_void: false,
            sequence_no: sequence,
            created_at: new Date().toISOString(),
            team: mockHomeTeam,
          };

          setEvents((prev) => [newEvent, ...prev]);
          setScore((prev) =>
            prev
              ? {
                  ...prev,
                  home_current_score: homeGoals,
                  score_breakdown: { home_goals: homeGoals, away_goals: awayGoals },
                  last_event_id: evId,
                  updated_at: new Date().toISOString(),
                }
              : null
          );
        } else if (rand < 0.6) {
          // Away goal
          awayGoals += 1;
          const evId = `ev-${sequence++}`;
          const newEvent: MatchEvent = {
            id: evId,
            match_id: matchId,
            match_map_id: 'map-1',
            event_type: 'goal',
            team_id: 'team-b',
            player_id: null,
            value: 1,
            meta: { minute: Math.floor(Math.random() * 90) + 1 },
            triggered_by: 'contrib-1',
            is_correction: false,
            corrected_event_id: null,
            is_void: false,
            sequence_no: sequence,
            created_at: new Date().toISOString(),
            team: mockAwayTeam,
          };

          setEvents((prev) => [newEvent, ...prev]);
          setScore((prev) =>
            prev
              ? {
                  ...prev,
                  away_current_score: awayGoals,
                  score_breakdown: { home_goals: homeGoals, away_goals: awayGoals },
                  last_event_id: evId,
                  updated_at: new Date().toISOString(),
                }
              : null
          );
        } else if (rand < 0.75) {
          // Yellow card
          const isHome = Math.random() > 0.5;
          const newEvent: MatchEvent = {
            id: `ev-${sequence++}`,
            match_id: matchId,
            match_map_id: 'map-1',
            event_type: 'yellow_card',
            team_id: isHome ? 'team-a' : 'team-b',
            player_id: null,
            value: null,
            meta: { minute: Math.floor(Math.random() * 90) + 1 },
            triggered_by: 'contrib-1',
            is_correction: false,
            corrected_event_id: null,
            is_void: false,
            sequence_no: sequence,
            created_at: new Date().toISOString(),
            team: isHome ? mockHomeTeam : mockAwayTeam,
          };
          setEvents((prev) => [newEvent, ...prev]);
        } else if (rand < 0.85) {
          // Status Announcement
          const newLog: MatchStatusLog = {
            id: `log-${sequence++}`,
            match_id: matchId,
            old_status: 'live',
            new_status: 'live',
            triggered_by: 'contrib-1',
            reason: Math.random() > 0.5 ? 'Half time break' : 'Technical check',
            created_at: new Date().toISOString(),
          };
          setStatusLogs((prev) => [newLog, ...prev]);
        }
      }, 10000); // Trigger a simulated update every 10 seconds

      return () => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
      };
    }
  }, [matchId]);

  return { match, score, events, statusLogs, isLoading, error };
}
