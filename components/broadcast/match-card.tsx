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

  // Border status highlight
  const borderStatusClass = isLive
    ? 'border-l-4 border-l-accent-signal'
    : isCompleted
    ? 'border-l-4 border-l-state-win'
    : 'border-l-4 border-l-border-line';

  // Accessible string representation for screen readers
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
      className={`bg-bg-surface border border-border-line hover:border-accent-readout/40 transition-all rounded p-3 sm:p-4 select-none flex flex-col gap-3 focus-ring ${borderStatusClass} ${
        onClick || href ? 'cursor-pointer hover:shadow-lg' : ''
      }`}
    >
      {/* Header (Game info + status + favorite) */}
      <div className="flex items-center justify-between text-[10px] tracking-wider text-text-muted gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {showFavorites && homeTeam.id && (
            <FavoriteStar
              entityType="team"
              entityId={homeTeam.id}
              entityName={homeTeam.name}
              size="sm"
            />
          )}
          <span className="font-display font-semibold uppercase truncate">{gameTitle}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {timeLabel && <span className="font-data hidden sm:inline-block">{timeLabel}</span>}
          <EventBadge status={status} />
        </div>
      </div>

      {/* Main Scoreboard Area */}
      <div className="flex items-center justify-between py-1 gap-2 sm:gap-4">
        {/* Home Team */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-bg-void border border-border-line flex items-center justify-center font-display font-bold text-xs text-text-muted shrink-0 shadow-inner">
            {homeTeam.shortCode}
          </div>
          <span className="font-body font-medium text-sm text-text-primary truncate hidden sm:block">
            {homeTeam.name}
          </span>
        </div>

        {/* Score Readout with ScoreFlash animation wrapper */}
        <div className="flex flex-col items-center justify-center shrink-0">
          {gameType === 'shooter' && bestOf > 1 ? (
            /* Series map wins */
            <div className="flex items-center gap-1 bg-bg-void border border-border-line px-2.5 py-1 rounded font-data text-sm">
              <ScoreFlash value={homeMapsWon} isLive={isLive} teamName={homeTeam.name} />
              <span className="text-text-muted text-xs">:</span>
              <ScoreFlash value={awayMapsWon} isLive={isLive} teamName={awayTeam.name} />
            </div>
          ) : (
            /* Direct goals or standard score */
            <div className="flex items-center gap-1 bg-bg-void border border-border-line px-2.5 py-1 rounded font-data text-sm">
              <ScoreFlash value={homeScore} isLive={isLive} teamName={homeTeam.name} />
              <span className="text-text-muted text-xs">:</span>
              <ScoreFlash value={awayScore} isLive={isLive} teamName={awayTeam.name} />
            </div>
          )}

          {gameType === 'shooter' && bestOf > 1 && (
            <span className="text-[9px] text-text-muted font-display tracking-widest mt-1">
              BO{bestOf} SERIES
            </span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0 text-right">
          <span className="font-body font-medium text-sm text-text-primary truncate hidden sm:block">
            {awayTeam.name}
          </span>
          <div className="w-8 h-8 rounded-sm bg-bg-void border border-border-line flex items-center justify-center font-display font-bold text-xs text-text-muted shrink-0 shadow-inner">
            {awayTeam.shortCode}
          </div>
        </div>
      </div>
      
      {/* Mobile only Team Names (stacked below when space is tight) */}
      <div className="flex items-center justify-between sm:hidden text-xs font-medium text-text-primary mt-1">
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
