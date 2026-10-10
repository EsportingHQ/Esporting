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
      className={`glass glass-hover rounded-2xl p-3 sm:p-5 select-none flex flex-col gap-2.5 sm:gap-3.5 focus-ring transition-all duration-300 ${borderStatusClass} ${
        onClick || href ? 'cursor-pointer hover:border-accent-primary/40 hover:shadow-[0_10px_30px_rgba(217,70,239,0.1)] hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Vertically Aligned Teams and Scores */}
      <div className="flex flex-col gap-3">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-display font-black text-[11px] sm:text-xs text-white shrink-0 shadow-inner group-hover:border-accent-primary/30 transition-colors">
              {homeTeam.shortCode}
            </div>
            <div className="flex flex-col min-w-0">
              <span 
                title={homeTeam.name}
                className={`font-body font-semibold text-xs sm:text-sm truncate transition-colors ${
                isHomeWinner ? 'text-state-win font-bold' : 'text-white'
              }`}>
                <span className="sm:hidden">{homeTeam.shortCode || homeTeam.name}</span>
                <span className="hidden sm:inline">{homeTeam.name}</span>
              </span>
            </div>
          </div>
          <div className="font-data text-base sm:text-lg font-bold flex items-center justify-end min-w-[1.5rem] sm:min-w-[2rem]">
            <ScoreFlash value={gameType === 'shooter' && bestOf > 1 ? homeMapsWon : homeScore} isLive={isLive} teamName={homeTeam.name} />
          </div>
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-display font-black text-[11px] sm:text-xs text-white shrink-0 shadow-inner group-hover:border-accent-primary/30 transition-colors">
              {awayTeam.shortCode}
            </div>
            <div className="flex flex-col min-w-0">
              <span 
                title={awayTeam.name}
                className={`font-body font-semibold text-xs sm:text-sm truncate transition-colors ${
                isAwayWinner ? 'text-state-win font-bold' : 'text-white'
              }`}>
                <span className="sm:hidden">{awayTeam.shortCode || awayTeam.name}</span>
                <span className="hidden sm:inline">{awayTeam.name}</span>
              </span>
            </div>
          </div>
          <div className="font-data text-base sm:text-lg font-bold flex items-center justify-end min-w-[1.5rem] sm:min-w-[2rem]">
            <ScoreFlash value={gameType === 'shooter' && bestOf > 1 ? awayMapsWon : awayScore} isLive={isLive} teamName={awayTeam.name} />
          </div>
        </div>
      </div>

      {/* Footer (Game info + status + favorite + time label) */}
      <div className="flex items-center justify-between text-xs tracking-wider text-text-muted gap-2 pt-3 mt-1 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {showFavorites && homeTeam.id && (
            <FavoriteStar
              entityType="team"
              entityId={homeTeam.id}
              entityName={homeTeam.name}
              size="sm"
            />
          )}
          <span className="font-display font-bold uppercase text-[10px] sm:text-[11px] text-text-muted truncate tracking-wider">{gameTitle}</span>
          {gameType === 'shooter' && bestOf > 1 && (
            <span className="text-[9px] text-accent-glow font-display font-semibold tracking-wider px-1.5 py-0.2 rounded bg-accent-primary/10 border border-accent-primary/20 shrink-0">
              BO{bestOf}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {timeLabel && <span className="font-data text-[10px] sm:text-[11px] text-text-muted">{timeLabel}</span>}
          <EventBadge status={status} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block no-underline">{content}</Link>;
  }

  return content;
}
