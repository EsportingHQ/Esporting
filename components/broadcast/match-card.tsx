'use client';

import { EventBadge } from './event-badge';
import { RollDigit } from './roll-digit';

export interface MatchCardProps {
  id: string;
  gameType: 'football' | 'shooter' | 'br';
  gameTitle: string;
  homeTeam: { name: string; shortCode: string; logoUrl?: string | null };
  awayTeam: { name: string; shortCode: string; logoUrl?: string | null };
  homeScore: number;
  awayScore: number;
  homeMapsWon?: number;
  awayMapsWon?: number;
  bestOf?: number;
  status: 'scheduled' | 'delayed' | 'live' | 'completed' | 'cancelled' | 'walkover';
  timeLabel?: string;
  onClick?: () => void;
}

export function MatchCard({
  gameType,
  gameTitle,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeMapsWon = 0,
  awayMapsWon = 0,
  bestOf = 1,
  status,
  timeLabel,
  onClick,
}: MatchCardProps) {
  const isLive = status === 'live';

  return (
    <div
      onClick={onClick}
      className={`bg-bg-surface border border-border-line hover:border-accent-readout/30 transition-all rounded p-3 select-none flex flex-col gap-3 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header (Game info + status) */}
      <div className="flex items-center justify-between text-[10px] tracking-wider text-text-muted">
        <span className="font-display font-semibold uppercase">{gameTitle}</span>
        <div className="flex items-center gap-2">
          {timeLabel && <span className="font-data">{timeLabel}</span>}
          <EventBadge status={status} />
        </div>
      </div>

      {/* Main Scoreboard Area */}
      <div className="flex items-center justify-between py-1">
        {/* Home Team */}
        <div className="flex items-center gap-3 w-[40%]">
          <div className="w-8 h-8 rounded-sm bg-bg-void border border-border-line flex items-center justify-center font-display font-bold text-xs text-text-muted shrink-0">
            {homeTeam.shortCode}
          </div>
          <span className="font-body font-medium text-sm text-text-primary truncate">
            {homeTeam.name}
          </span>
        </div>

        {/* Score Readout */}
        <div className="flex flex-col items-center justify-center min-w-[70px]">
          {gameType === 'shooter' && bestOf > 1 ? (
            /* Series map wins */
            <div className="flex items-center gap-1.5 bg-bg-void border border-border-line px-3 py-1 rounded font-data text-sm">
              <RollDigit value={homeMapsWon} className={isLive ? 'text-accent-signal' : 'text-text-primary'} />
              <span className="text-text-muted text-xs">:</span>
              <RollDigit value={awayMapsWon} className={isLive ? 'text-accent-signal' : 'text-text-primary'} />
            </div>
          ) : (
            /* Direct goals or standard score */
            <div className="flex items-center gap-1.5 bg-bg-void border border-border-line px-3 py-1 rounded font-data text-sm">
              <RollDigit value={homeScore} className={isLive ? 'text-accent-signal' : 'text-text-primary'} />
              <span className="text-text-muted text-xs">:</span>
              <RollDigit value={awayScore} className={isLive ? 'text-accent-signal' : 'text-text-primary'} />
            </div>
          )}

          {gameType === 'shooter' && bestOf > 1 && (
            <span className="text-[9px] text-text-muted font-display tracking-widest mt-1">
              BO{bestOf} SERIES
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-3 w-[40%] text-right">
          <span className="font-body font-medium text-sm text-text-primary truncate">
            {awayTeam.name}
          </span>
          <div className="w-8 h-8 rounded-sm bg-bg-void border border-border-line flex items-center justify-center font-display font-bold text-xs text-text-muted shrink-0">
            {awayTeam.shortCode}
          </div>
        </div>
      </div>
    </div>
  );
}
