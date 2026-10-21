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
    : 'border-l-4 border-l-text-primary/[0.1]';

  const accessibleLabel = `${homeTeam.name} ${homeScore}, ${awayTeam.name} ${awayScore}. ${gameTitle}. Status: ${status}. ${timeLabel || ''}`;

  const isHomeWinner = isCompleted && ((gameType === 'shooter' && bestOf > 1) ? homeMapsWon > awayMapsWon : homeScore > awayScore);
  const isAwayWinner = isCompleted && ((gameType === 'shooter' && bestOf > 1) ? awayMapsWon > homeMapsWon : awayScore > homeScore);

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
      className={`glass glass-hover rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 select-none focus-ring transition-all duration-300 ${borderStatusClass} ${
        onClick || href ? 'cursor-pointer hover:border-accent-primary/40 hover:shadow-[0_8px_25px_rgba(255,31,109,0.1)] hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Status / Time / Meta */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-[70px] sm:min-w-[90px]">
          <div className="flex flex-col gap-1 items-start">
            <EventBadge status={status} className="text-[9px] sm:text-[10px] px-2 py-0" />
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-text-muted font-data leading-none">
              {timeLabel && <span>{timeLabel}</span>}
              {gameType === 'shooter' && bestOf > 1 && (
                <span className="text-[9px] text-accent-glow font-display font-semibold px-1 py-0.2 rounded bg-accent-primary/10 border border-accent-primary/20">
                  BO{bestOf}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Teams (stacked compactly) */}
        <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
          {/* Home Team */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-text-primary/[0.04] border border-text-primary/[0.08] flex items-center justify-center font-display font-black text-[9px] sm:text-[10px] text-text-primary shrink-0 shadow-inner">
              {homeTeam.shortCode ? homeTeam.shortCode.slice(0, 3) : homeTeam.name.slice(0, 2).toUpperCase()}
            </div>
            <span
              title={homeTeam.name}
              className={`font-body font-semibold text-xs sm:text-sm leading-tight transition-colors truncate ${
                isHomeWinner ? 'text-state-win font-bold' : 'text-text-primary'
              }`}
            >
              {homeTeam.name}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-text-primary/[0.04] border border-text-primary/[0.08] flex items-center justify-center font-display font-black text-[9px] sm:text-[10px] text-text-primary shrink-0 shadow-inner">
              {awayTeam.shortCode ? awayTeam.shortCode.slice(0, 3) : awayTeam.name.slice(0, 2).toUpperCase()}
            </div>
            <span
              title={awayTeam.name}
              className={`font-body font-semibold text-xs sm:text-sm leading-tight transition-colors truncate ${
                isAwayWinner ? 'text-state-win font-bold' : 'text-text-primary'
              }`}
            >
              {awayTeam.name}
            </span>
          </div>
        </div>

        {/* Right: Scores & Action/Favorite */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="flex flex-col items-end justify-center gap-1 min-w-[1.25rem] sm:min-w-[1.5rem] font-data text-sm sm:text-base font-bold leading-tight">
            <div className={isHomeWinner ? 'text-state-win font-bold' : 'text-text-primary'}>
              <ScoreFlash
                value={gameType === 'shooter' && bestOf > 1 ? homeMapsWon : homeScore}
                isLive={isLive}
                teamName={homeTeam.name}
              />
            </div>
            <div className={isAwayWinner ? 'text-state-win font-bold' : 'text-text-primary'}>
              <ScoreFlash
                value={gameType === 'shooter' && bestOf > 1 ? awayMapsWon : awayScore}
                isLive={isLive}
                teamName={awayTeam.name}
              />
            </div>
          </div>

          {showFavorites && (homeTeam.id || awayTeam.id) && (
            <div className="pl-1 sm:pl-2 border-l border-text-primary/[0.08]">
              <FavoriteStar
                entityType="team"
                entityId={homeTeam.id || awayTeam.id || id}
                entityName={homeTeam.name}
                size="sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block no-underline">{content}</Link>;
  }

  return content;
}
