'use client';

import { useState, useEffect, useRef } from 'react';
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

export function useLiveFeed() {
  const [tickerMatches, setTickerMatches] = useState<TickerMatch[]>([]);
  const [groups, setGroups] = useState<CompetitionGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { prefs } = useNotificationPrefs();

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Mock initial data setup & simulation interval
  useEffect(() => {
    setIsLoading(true);

    const initialTicker: TickerMatch[] = [
      { id: '1', gameCode: 'FC26', homeTeam: 'KUTI', awayTeam: 'BELLO', homeScore: 2, awayScore: 1, status: 'live' },
      { id: '2', gameCode: 'CODM-MP', homeTeam: 'SUPRA', awayTeam: 'VENOM', homeScore: 1, awayScore: 2, status: 'live' },
      { id: '3', gameCode: 'PUBG', homeTeam: 'REBEL', awayTeam: 'APEX', homeScore: 45, awayScore: 38, status: 'live' },
      { id: '4', gameCode: 'FC26', homeTeam: 'NEXUS', awayTeam: 'ECHO', homeScore: 0, awayScore: 0, status: 'scheduled', timeLabel: '18:00' },
    ];

    const initialGroups: CompetitionGroup[] = [
      {
        id: 'c1',
        name: 'UI eSports League Season 1',
        slug: 'ui-esports-league',
        gameTitle: 'FC 26 & CODM MP',
        gameType: 'football',
        liveCount: 2,
        matches: [
          {
            id: '1',
            gameType: 'football',
            gameTitle: 'FC 26 — Group Stage',
            homeTeam: { id: '1', name: 'Team Kuti', shortCode: 'KUTI' },
            awayTeam: { id: '2', name: 'Team Bello', shortCode: 'BELLO' },
            homeScore: 2,
            awayScore: 1,
            status: 'live',
            timeLabel: 'LIVE NOW',
            competitionSlug: 'ui-esports-league',
          },
          {
            id: '2',
            gameType: 'shooter',
            gameTitle: 'CODM Multiplayer — Quarter Finals',
            homeTeam: { id: '3', name: 'Supra Gaming', shortCode: 'SUPRA' },
            awayTeam: { id: '4', name: 'Venom Esports', shortCode: 'VENOM' },
            homeScore: 1,
            awayScore: 2,
            homeMapsWon: 1,
            awayMapsWon: 2,
            bestOf: 5,
            status: 'live',
            timeLabel: 'MAP 4',
            competitionSlug: 'ui-esports-league',
          },
          {
            id: '4',
            gameType: 'football',
            gameTitle: 'FC 26 — Group Stage',
            homeTeam: { id: '5', name: 'Nexus Club', shortCode: 'NEXUS' },
            awayTeam: { id: '6', name: 'Echo Esports', shortCode: 'ECHO' },
            homeScore: 0,
            awayScore: 0,
            status: 'scheduled',
            timeLabel: 'Starts in 10m',
            competitionSlug: 'ui-esports-league',
          },
        ],
      },
      {
        id: 'c2',
        name: 'CODM Battle Royale Arena',
        slug: 'codm-br-arena',
        gameTitle: 'CODM BR',
        gameType: 'br',
        liveCount: 1,
        matches: [
          {
            id: '3',
            gameType: 'br',
            gameTitle: 'CODM Battle Royale — Lobby Match 3',
            homeTeam: { id: '7', name: 'Ares Clan', shortCode: 'ARS' },
            awayTeam: { id: '8', name: 'Odin Elite', shortCode: 'ODN' },
            homeScore: 45,
            awayScore: 38,
            status: 'live',
            timeLabel: 'ROUND 3',
            competitionSlug: 'codm-br-arena',
          },
        ],
      },
      {
        id: 'c4',
        name: 'FC Mobile Cup',
        slug: 'fc-mobile-cup',
        gameTitle: 'FC Mobile',
        gameType: 'football',
        liveCount: 0,
        matches: [
          {
            id: '12',
            gameType: 'football',
            gameTitle: 'FC Mobile — Cup Final',
            homeTeam: { id: '9', name: 'Eagles Soccer', shortCode: 'EAG' },
            awayTeam: { id: '10', name: 'Falcons FC', shortCode: 'FLC' },
            homeScore: 1,
            awayScore: 2,
            status: 'completed',
            timeLabel: 'Finished yesterday',
            competitionSlug: 'fc-mobile-cup',
          },
        ],
      },
    ];

    setTickerMatches(initialTicker);
    setGroups(initialGroups);
    setIsLoading(false);

    // Live simulation interval
    const interval = setInterval(() => {
      // Random score updates
      setGroups((prevGroups) =>
        prevGroups.map((group) => {
          let updatedLiveCount = 0;

          const updatedMatches = group.matches.map((m) => {
            if (m.status === 'live') {
              updatedLiveCount += 1;
              const shouldScore = Math.random() > 0.75;
              if (shouldScore) {
                const isHome = Math.random() > 0.5;
                const newHomeScore = isHome ? m.homeScore + 1 : m.homeScore;
                const newAwayScore = !isHome ? m.awayScore + 1 : m.awayScore;

                // Trigger in-app toast if notification prefs allow goalScored
                if (prefs.goalScored) {
                  addToast({
                    gameCode: m.gameType === 'football' ? 'FC26' : 'CODM',
                    homeTeam: m.homeTeam.shortCode,
                    awayTeam: m.awayTeam.shortCode,
                    newScore: `${newHomeScore} - ${newAwayScore}`,
                    eventType: isHome ? `${m.homeTeam.name} scored!` : `${m.awayTeam.name} scored!`,
                    matchId: m.id,
                    competitionSlug: group.slug,
                  });
                }

                return {
                  ...m,
                  homeScore: newHomeScore,
                  awayScore: newAwayScore,
                };
              }
            }
            return m;
          });

          return {
            ...group,
            liveCount: updatedLiveCount,
            matches: updatedMatches,
          };
        })
      );

      // Ticker matches update
      setTickerMatches((prev) =>
        prev.map((t) => {
          if (t.status === 'live' && Math.random() > 0.75) {
            const isHome = Math.random() > 0.5;
            return {
              ...t,
              homeScore: isHome ? t.homeScore + 1 : t.homeScore,
              awayScore: !isHome ? t.awayScore + 1 : t.awayScore,
            };
          }
          return t;
        })
      );
    }, 6000);

    return () => clearInterval(interval);
  }, [prefs.goalScored]);

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
