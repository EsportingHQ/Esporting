'use client';

import Link from 'next/link';
import { EventBadge } from './event-badge';
import { ScoreFlash } from './ScoreFlash';
import { FavoriteStar } from './FavoriteStar';

export interface MatchCardProps {
  id: string;
  gameType: 'football' | 'shooter' | 'br';
  gameTitle: string;
  homeTeam: { id?: string; name: string; shortCode: string; logoUrl?: string | null };
  awayTeam: { id?: string; name: string; shortCode: string; logoUrl?: string | null };
  homeScore: number;
  awayScore: number;
  homeMapsWon?: number;
  awayMapsWon?: number;
  bestOf?: number;
  status: 'scheduled' | 'delayed' | 'live' | 'completed' | 'cancelled' | 'walkover';
  timeLabel?: string;
  competitionSlug?: string;
  href?: string;
  onClick?: () => void;
  showFavorites?: boolean;
}

export function MatchCard({
  id,
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
  href,
  onClick,
  showFavorites = true,
}: MatchCardProps) {
  const isLive = status === 'live';
  const isCompleted = status === 'completed';

  const borderStatusClass = isLive
    ? 'border-l-4 border-l-accent-live shadow-[inset_4px_0_15px_rgba(239,68,68,0.12)]'
    : isCompleted
    ? 'border-l-4 border-l-state-win'
    : 'border-l-4 border-l-white/[0.1]';

  const accessibleLabel = `${homeTeam.name} ${homeScore}, ${awayTeam.name} ${awayScore}. ${gameTitle}. Status: ${status}. ${timeLabel || ''}`;

  const content = (
    <div
      tabIndex={0}
      role="article"
      aria-label={accessibleLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`glass glass-hover rounded-2xl p-4 sm:p-5 select-none flex flex-col gap-3.5 focus-ring transition-all duration-300 ${borderStatusClass} ${
        onClick || href ? 'cursor-pointer hover:border-accent-primary/40 hover:shadow-[0_10px_30px_rgba(217,70,239,0.1)] hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Header (Game info + status + favorite) */}
      <div className="flex items-center justify-between text-xs tracking-wider text-text-muted gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showFavorites && homeTeam.id && (
            <FavoriteStar
              entityType="team"
              entityId={homeTeam.id}
              entityName={homeTeam.name}
              size="sm"
            />
          )}
          <span className="font-display font-bold uppercase text-[11px] text-text-muted truncate tracking-wider">{gameTitle}</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {timeLabel && <span className="font-data text-[11px] text-text-muted hidden sm:inline-block">{timeLabel}</span>}
          <EventBadge status={status} />
        </div>
      </div>

      {/* Main Scoreboard Area */}
      <div className="flex items-center justify-between py-1 gap-2 sm:gap-4">
        {/* Home Team */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-display font-black text-xs text-white shrink-0 shadow-inner group-hover:border-accent-primary/30 transition-colors">
            {homeTeam.shortCode}
          </div>
          <span className="font-body font-semibold text-sm text-white truncate hidden sm:block">
            {homeTeam.name}
          </span>
        </div>

        {/* Score Readout */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {gameType === 'shooter' && bestOf > 1 ? (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] px-3.5 py-1.5 rounded-xl font-data text-sm font-bold shadow-inner">
              <ScoreFlash value={homeMapsWon} isLive={isLive} teamName={homeTeam.name} />
              <span className="text-text-muted text-xs font-normal">:</span>
              <ScoreFlash value={awayMapsWon} isLive={isLive} teamName={awayTeam.name} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] px-3.5 py-1.5 rounded-xl font-data text-base font-bold shadow-inner">
              <ScoreFlash value={homeScore} isLive={isLive} teamName={homeTeam.name} />
              <span className="text-text-muted text-xs font-normal">:</span>
              <ScoreFlash value={awayScore} isLive={isLive} teamName={awayTeam.name} />
            </div>
          )}

          {gameType === 'shooter' && bestOf > 1 && (
            <span className="text-[10px] text-text-muted font-display tracking-widest mt-1">
              BO{bestOf} SERIES
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
          <span className="font-body font-semibold text-sm text-white truncate hidden sm:block">
            {awayTeam.name}
          </span>
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-display font-black text-xs text-white shrink-0 shadow-inner group-hover:border-accent-primary/30 transition-colors">
            {awayTeam.shortCode}
          </div>
        </div>
      </div>
      
      {/* Mobile only Team Names */}
      <div className="flex items-center justify-between sm:hidden text-xs font-medium text-white/90 mt-1">
        <span className="truncate flex-1">{homeTeam.name}</span>
        <span className="truncate flex-1 text-right">{awayTeam.name}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block no-underline">{content}</Link>;
  }

  return content;
}
