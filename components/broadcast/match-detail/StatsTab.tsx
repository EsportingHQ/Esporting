'use client';

import { BarChart2 } from 'lucide-react';
import { Match, MatchStats } from '@/hooks/useMatchRealtime';

interface StatsTabProps {
  match: Match;
  stats: MatchStats;
}

export function StatsTab({ match, stats }: StatsTabProps) {
  const statRows = [
    { label: 'POSSESSION %', home: stats.homePossession, away: stats.awayPossession, total: 100 },
    { label: 'TOTAL SHOTS', home: stats.homeShots, away: stats.awayShots, total: Math.max(1, stats.homeShots + stats.awayShots) },
    { label: 'SHOTS ON TARGET', home: stats.homeShotsOnTarget, away: stats.awayShotsOnTarget, total: Math.max(1, stats.homeShotsOnTarget + stats.awayShotsOnTarget) },
    { label: 'YELLOW CARDS', home: stats.homeYellowCards, away: stats.awayYellowCards, total: Math.max(1, stats.homeYellowCards + stats.awayYellowCards) },
    { label: 'RED CARDS', home: stats.homeRedCards, away: stats.awayRedCards, total: Math.max(1, stats.homeRedCards + stats.awayRedCards) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <BarChart2 className="w-4 h-4 text-accent-readout" />
        <h3 className="font-display font-black text-lg uppercase tracking-wider">
          LIVE MATCH STATISTICS
        </h3>
      </div>

      <div className="bg-bg-surface border border-border-line rounded p-6 max-w-3xl mx-auto space-y-6 select-none font-body">
        {/* Team Headers */}
        <div className="flex items-center justify-between font-display font-bold text-sm border-b border-border-line pb-4">
          <span className="text-accent-readout uppercase">{match.team_home?.name}</span>
          <span className="text-text-muted text-xs">METRIC COMPARISON</span>
          <span className="text-accent-signal uppercase">{match.team_away?.name}</span>
        </div>

        {/* Stat Comparison Bars */}
        <div className="space-y-5">
          {statRows.map((row) => {
            const homePct = Math.round((row.home / row.total) * 100);
            const awayPct = Math.round((row.away / row.total) * 100);

            return (
              <div key={row.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-data">
                  <span className="font-bold text-text-primary text-sm">{row.home}</span>
                  <span className="font-display font-semibold text-text-muted text-[10px] tracking-wider uppercase">
                    {row.label}
                  </span>
                  <span className="font-bold text-text-primary text-sm">{row.away}</span>
                </div>

                {/* Dual bar chart visualization */}
                <div className="flex items-center gap-1.5 h-2 w-full bg-bg-void rounded-full overflow-hidden border border-border-line/60">
                  <div
                    style={{ width: `${homePct}%` }}
                    className="h-full bg-accent-readout transition-all duration-500 rounded-l-full"
                  />
                  <div
                    style={{ width: `${awayPct}%` }}
                    className="h-full bg-accent-signal transition-all duration-500 rounded-r-full ml-auto"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
