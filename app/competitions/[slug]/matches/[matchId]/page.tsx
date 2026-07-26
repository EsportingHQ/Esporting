'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { TabBar, TabItem } from '@/components/ui/TabBar';
import { ErrorState } from '@/components/ui/ErrorState';
import { MatchHeader } from '@/components/broadcast/match-detail/MatchHeader';
import { TimelineTab } from '@/components/broadcast/match-detail/TimelineTab';
import { LineupsTab } from '@/components/broadcast/match-detail/LineupsTab';
import { StatsTab } from '@/components/broadcast/match-detail/StatsTab';
import { HeadToHeadTab } from '@/components/broadcast/match-detail/HeadToHeadTab';
import { useMatchRealtime } from '@/hooks/useMatchRealtime';
import { Flame, Users, BarChart2, History, AlertCircle } from 'lucide-react';
import { StatusDot } from '@/components/broadcast/StatusDot';

export default function MatchDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string; matchId: string }>;
}) {
  const params = use(paramsPromise);
  const slug = params.slug;
  const matchId = params.matchId;

  const {
    match,
    score,
    events,
    statusLogs,
    headToHead,
    matchStats,
    connectionStatus,
    isLoading,
    error,
  } = useMatchRealtime(matchId);

  const [activeTab, setActiveTab] = useState<'timeline' | 'lineups' | 'stats' | 'h2h'>('timeline');
  const [recapString, setRecapString] = useState('');

  useEffect(() => {
    if (!match || !score) return;

    if (match.status === 'completed') {
      const winnerName =
        score.home_maps_won > score.away_maps_won
          ? match.team_home?.name
          : score.home_maps_won < score.away_maps_won
          ? match.team_away?.name
          : score.home_current_score > score.away_current_score
          ? match.team_home?.name
          : match.team_away?.name;

      const loserName =
        winnerName === match.team_home?.name ? match.team_away?.name : match.team_home?.name;

      const winnerScore =
        winnerName === match.team_home?.name
          ? score.home_maps_won || score.home_current_score
          : score.away_maps_won || score.away_current_score;

      const loserScore =
        winnerName === match.team_home?.name
          ? score.away_maps_won || score.away_current_score
          : score.home_maps_won || score.home_current_score;

      setRecapString(
        `${winnerName} defeated ${loserName} ${winnerScore} – ${loserScore} in official competition.`
      );
    } else {
      setRecapString('Match broadcast live in progress. Syncing realtime telemetry.');
    }
  }, [match, score]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
        <PublicNav />
        <div className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
          <div className="h-44 bg-bg-surface border border-border-line rounded skeleton-shimmer" />
          <div className="h-10 w-80 bg-bg-surface border border-border-line rounded skeleton-shimmer" />
          <div className="h-96 bg-bg-surface border border-border-line rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
        <PublicNav />
        <main className="max-w-4xl mx-auto px-4 py-16 flex-1 w-full flex items-center justify-center">
          <ErrorState
            title="BROADCAST STREAM NOT FOUND"
            description="The requested match telemetry stream is unavailable or invalid."
          />
        </main>
      </div>
    );
  }

  const isBR = match.match_format === 'battle_royale';
  const isShooter = match.game_title?.game_types?.slug === 'shooter';
  const isLive = match.status === 'live';

  const tabItems: TabItem[] = [
    { id: 'timeline', label: 'TIMELINE', icon: <Flame className="w-3.5 h-3.5" />, badge: events.length },
    { id: 'lineups', label: 'LINEUPS', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'stats', label: 'STATISTICS', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'h2h', label: 'HEAD-TO-HEAD', icon: <History className="w-3.5 h-3.5" />, badge: headToHead.length },
  ];

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      {/* Flagship Header */}
      <MatchHeader
        match={match}
        score={score}
        slug={slug}
        connectionStatus={connectionStatus}
        recapString={recapString}
      />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        {/* Navigation TabBar */}
        <TabBar
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as any)}
        />

        {/* Tab Content Panel */}
        <div id={`tabpanel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'timeline' && (
            <TimelineTab
              events={events}
              statusLogs={statusLogs}
              isLive={isLive}
              isShooter={isShooter}
              isBR={isBR}
            />
          )}

          {activeTab === 'lineups' && <LineupsTab match={match} />}

          {activeTab === 'stats' && <StatsTab match={match} stats={matchStats} />}

          {activeTab === 'h2h' && <HeadToHeadTab match={match} headToHead={headToHead} />}
        </div>
      </main>
    </div>
  );
}
