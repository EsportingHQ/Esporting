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
      <div className="md:hidden w-full glass border-b border-white/[0.08]">
        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] font-display font-bold text-accent-live tracking-wider text-xs select-none focus-ring"
          >
            <TallyLight size="sm" />
            <span>LIVE TICKER ({matches.length})</span>
            <span className="text-text-muted text-[10px] ml-1">TAP TO EXPAND</span>
          </button>
        ) : (
          <div className="flex flex-col font-body select-none divide-y divide-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] font-display font-bold text-accent-live tracking-wider text-xs bg-white/[0.02] focus-ring"
            >
              <div className="flex items-center gap-2">
                <TallyLight size="sm" />
                <span>LIVE TICKER</span>
              </div>
              <span className="text-text-muted text-xs">COLLAPSE ✕</span>
            </button>

            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between gap-2 px-4 py-3 min-h-[44px] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-display font-bold text-accent-glow tracking-wider text-[10px]">
                    {match.gameCode}
                  </span>
                  <div className="flex items-center gap-2 font-data text-xs">
                    <span className="text-white uppercase tracking-tight max-w-[80px] truncate font-medium">
                      {match.homeTeam}
                    </span>
                    <span className="font-bold text-accent-live px-1 bg-white/[0.04] rounded">{match.homeScore}</span>
                    <span className="text-text-muted text-[10px]">-</span>
                    <span className="font-bold text-accent-live px-1 bg-white/[0.04] rounded">{match.awayScore}</span>
                    <span className="text-white uppercase tracking-tight max-w-[80px] truncate font-medium">
                      {match.awayTeam}
                    </span>
                  </div>
                </div>

                {match.status === 'live' ? (
                  <span className="text-[10px] text-accent-live font-display font-bold tracking-wider flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-accent-live/15 border border-accent-live/30">
                    <TallyLight size="sm" className="relative -top-[1px]" />
                    <span>LIVE</span>
                  </span>
                ) : match.status === 'delayed' ? (
                  <span className="text-[10px] text-amber-400 font-display tracking-wider shrink-0 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
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
              <div className="flex items-center justify-center px-4 py-4 text-text-muted text-xs tracking-wide">
                NO ACTIVE LIVE MATCHES
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Horizontal Ticker (hidden on small screens) */}
      <div className="hidden md:block w-full glass-strong border-b border-white/[0.08] text-xs font-body select-none">
        <div className="flex overflow-x-auto scrollbar-none items-center h-11 divide-x divide-white/[0.06]">
          {/* Ticker title */}
          <div className="flex items-center gap-2 px-5 font-display font-bold text-accent-glow tracking-wider shrink-0 select-none bg-accent-primary/10 h-full border-r border-white/[0.08]">
            <TallyLight size="sm" />
            <span className="text-[11px]">LIVE TICKER</span>
          </div>

          {/* Matches list */}
          {matches.map((match) => (
            <div
              key={match.id}
              className="flex items-center gap-4 px-5 h-full shrink-0 hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <span className="font-display font-bold text-accent-glow tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/15 border border-accent-primary/25">
                {match.gameCode}
              </span>

              {/* Scoreboard layout */}
              <div className="flex items-center gap-2 font-data">
                <span className="text-white uppercase tracking-tight max-w-[90px] truncate font-medium text-xs">
                  {match.homeTeam}
                </span>
                <div className="flex items-center bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.08] font-bold text-white shadow-inner">
                  <RollDigit value={match.homeScore} className="text-accent-live" />
                  <span className="mx-1.5 text-text-muted text-xs font-normal">:</span>
                  <RollDigit value={match.awayScore} className="text-accent-live" />
                </div>
                <span className="text-white uppercase tracking-tight max-w-[90px] truncate font-medium text-xs">
                  {match.awayTeam}
                </span>
              </div>

              {match.status === 'live' ? (
                <span className="text-[10px] text-accent-live font-display font-bold tracking-wider flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-live/15 border border-accent-live/30">
                  <TallyLight size="sm" className="relative -top-[1px]" />
                  <span>LIVE</span>
                </span>
              ) : match.status === 'delayed' ? (
                <span className="text-[10px] text-amber-400 font-display tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
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
            <div className="flex items-center px-6 text-text-muted text-xs tracking-wide h-full">
              No active live matches in rotation
            </div>
          )}
        </div>
      </div>
    </>
  );
}
