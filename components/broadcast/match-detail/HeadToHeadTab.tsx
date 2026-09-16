'use client';

import { History, Shield } from 'lucide-react';
import { Match, HeadToHeadRecord } from '@/hooks/useMatchRealtime';

interface HeadToHeadTabProps {
  match: Match;
  headToHead: HeadToHeadRecord[];
}

export function HeadToHeadTab({ match, headToHead }: HeadToHeadTabProps) {
  // Aggregate stats
  const homeWins = headToHead.filter((h) => h.winner === match.team_home?.name).length;
  const awayWins = headToHead.filter((h) => h.winner === match.team_away?.name).length;
  const draws = headToHead.filter((h) => h.winner === 'Draw').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-border-line pb-2">
        <History className="w-4 h-4 text-accent-readout" />
        <h3 className="font-display font-black text-lg uppercase tracking-wider">
          HEAD-TO-HEAD HISTORY
        </h3>
      </div>

      {/* Overview Card */}
      <div className="bg-bg-surface border border-border-line rounded p-6 max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-4 text-center font-display border-b border-border-line pb-4">
          <div>
            <span className="text-2xl font-black text-accent-readout block">{homeWins}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">
              {match.team_home?.name} WINS
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-text-muted block">{draws}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">DRAWS</span>
          </div>
          <div>
            <span className="text-2xl font-black text-accent-signal block">{awayWins}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-wider">
              {match.team_away?.name} WINS
            </span>
          </div>
        </div>

        {/* Previous Meetings List */}
        <div className="space-y-3">
          <h4 className="font-display font-bold text-xs text-text-muted uppercase tracking-wider">
            LAST {headToHead.length} MATCH MEETINGS
          </h4>

          <div className="space-y-2 font-data text-xs">
            {headToHead.map((item) => (
              <div
                key={item.id}
                className="bg-bg-void border border-border-line rounded p-3 flex items-center justify-between hover:border-accent-readout/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <span className="block font-display font-bold text-[10px] text-accent-readout uppercase">
                    {item.competition}
                  </span>
                  <span className="text-text-muted text-[10px]">{item.date}</span>
                </div>

                <div className="flex items-center gap-3 font-semibold text-sm">
                  <span
                    className={
                      item.winner === match.team_home?.name
                        ? 'text-state-win font-bold'
                        : 'text-text-primary'
                    }
                  >
                    {item.homeTeam}
                  </span>
                  <span className="bg-bg-surface border border-border-line px-2 py-0.5 rounded text-text-muted text-xs">
                    {item.homeScore} : {item.awayScore}
                  </span>
                  <span
                    className={
                      item.winner === match.team_away?.name
                        ? 'text-state-win font-bold'
                        : 'text-text-primary'
                    }
                  >
                    {item.awayTeam}
                  </span>
                </div>
              </div>
            ))}

            {headToHead.length === 0 && (
              <div className="py-8 text-center text-text-muted border border-dashed border-border-line rounded text-xs font-data">
                No previous head-to-head meetings recorded for these teams.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
