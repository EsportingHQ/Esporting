'use client';
import { useState } from 'react';

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
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Mobile Collapsed State (hidden on md and up) */}
      <div className="md:hidden w-full bg-bg-surface border-b border-border-line">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] font-display font-bold text-accent-signal tracking-wider text-[11px] select-none focus-ring"
          >
            <TallyLight size="sm" />
            <span>LIVE TICKER ({matches.length})</span>
            <span className="text-text-muted text-[9px] ml-1">TAP TO EXPAND</span>
          </button>
        ) : (
          <div className="flex flex-col font-body select-none divide-y divide-border-line">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] font-display font-bold text-accent-signal tracking-wider text-[11px] bg-bg-void/50 focus-ring"
            >
              <div className="flex items-center gap-2">
                <TallyLight size="sm" />
                <span>LIVE TICKER</span>
              </div>
              <span className="text-text-muted">COLLAPSE ✕</span>
            </button>

            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] hover:bg-bg-void/30 transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-display font-bold text-accent-readout tracking-wider text-[10px]">
                    {match.gameCode}
                  </span>
                  <div className="flex items-center gap-1.5 font-data text-xs">
                    <span className="text-text-primary uppercase tracking-tight max-w-[70px] truncate">
                      {match.homeTeam}
                    </span>
                    <span className="font-bold text-accent-signal px-1">{match.homeScore}</span>
                    <span className="text-text-muted text-[10px]">-</span>
                    <span className="font-bold text-accent-signal px-1">{match.awayScore}</span>
                    <span className="text-text-primary uppercase tracking-tight max-w-[70px] truncate">
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {match.status === 'live' ? (
                  <span className="text-[10px] text-accent-signal font-display font-semibold tracking-wider flex items-center gap-1 shrink-0">
                    <TallyLight size="sm" className="relative -top-[1px]" />
                    <span>LIVE</span>
                  </span>
                ) : match.status === 'delayed' ? (
                  <span className="text-[10px] text-amber-400 font-display tracking-wider shrink-0">
                    DELAYED
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted font-display tracking-wider shrink-0">
                    {match.timeLabel || 'UPCOMING'}
                  </span>
                )}
              </div>
            ))}

            {matches.length === 0 && (
              <div className="flex items-center justify-center px-4 py-4 text-text-muted text-[10px] tracking-wide">
                NO ACTIVE LIVE MATCHES
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Horizontal Ticker (hidden on small screens) */}
      <div className="hidden md:block w-full bg-bg-surface border-b border-border-line text-xs font-body select-none">
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
            <div className="flex items-center px-4 text-text-muted text-[10px] tracking-wide h-full">
              NO ACTIVE LIVE MATCHES
            </div>
          )}
        </div>
      </div>
    </>
  );
}
