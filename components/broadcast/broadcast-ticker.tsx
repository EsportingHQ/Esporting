'use client';

import { TallyLight } from './tally-light';
import { RollDigit } from './roll-digit';

export interface TickerMatch {
  id: string;
  gameCode: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: 'live' | 'delayed' | 'scheduled';
  timeLabel?: string;
}

interface BroadcastTickerProps {
  matches: TickerMatch[];
}

export function BroadcastTicker({ matches }: BroadcastTickerProps) {
  return (
    <div className="w-full bg-bg-surface border-b border-border-line text-xs font-body select-none">
      <div className="flex overflow-x-auto scrollbar-none items-center h-10 divide-x divide-border-line">
        {/* Ticker title */}
        <div className="flex items-center gap-2 px-4 font-display font-bold text-accent-signal tracking-wider shrink-0 select-none bg-bg-void/50 h-full">
          <TallyLight size="sm" />
          <span>LIVE TICKER</span>
        </div>

        {/* Matches list */}
        {matches.map((match) => (
          <div
            key={match.id}
            className="flex items-center gap-4 px-4 h-full shrink-0 hover:bg-bg-void/30 transition-colors cursor-pointer"
          >
            <span className="font-display font-bold text-accent-readout tracking-wider text-[10px]">
              {match.gameCode}
            </span>

            {/* Scoreboard layout */}
            <div className="flex items-center gap-2 font-data">
              <span className="text-text-primary uppercase tracking-tight max-w-[80px] truncate">
                {match.homeTeam}
              </span>
              <div className="flex items-center bg-bg-void px-2 py-0.5 rounded border border-border-line font-medium text-text-primary">
                <RollDigit value={match.homeScore} className="text-accent-signal" />
                <span className="mx-1 text-text-muted text-[10px]">:</span>
                <RollDigit value={match.awayScore} className="text-accent-signal" />
              </div>
              <span className="text-text-primary uppercase tracking-tight max-w-[80px] truncate">
                {match.awayTeam}
              </span>
            </div>

            {match.status === 'live' ? (
              <span className="text-[10px] text-accent-signal font-display font-semibold tracking-wider flex items-center gap-1">
                <TallyLight size="sm" className="relative -top-[1px]" />
                <span>LIVE</span>
              </span>
            ) : match.status === 'delayed' ? (
              <span className="text-[10px] text-amber-400 font-display tracking-wider">
                DELAYED
              </span>
            ) : (
              <span className="text-[10px] text-text-muted font-display tracking-wider">
                {match.timeLabel || 'UPCOMING'}
              </span>
            )}
          </div>
        ))}

        {matches.length === 0 && (
          <div className="flex items-center px-4 text-text-muted text-[10px] tracking-wide">
            NO ACTIVE LIVE MATCHES
          </div>
        )}
      </div>
    </div>
  );
}
