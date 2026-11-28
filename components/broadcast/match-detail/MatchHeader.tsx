'use client';

import Link from 'next/link';
import { RedCards } from '../match-card';
import { StatusDot } from '../StatusDot';
import { EventBadge } from '../event-badge';
import { ScoreFlash } from '../ScoreFlash';
import { FavoriteStar } from '../FavoriteStar';
import { Match, MatchScore } from '@/hooks/useMatchRealtime';
import { shortGameName } from '@/lib/games';

interface MatchHeaderProps {
  match: Match;
  score: MatchScore | null;
  slug: string;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  recapString?: string;
  redHome?: number;
  redAway?: number;
  liveLabel?: string;
}

export function MatchHeader({ match, score, slug, connectionStatus, recapString, redHome = 0, redAway = 0, liveLabel }: MatchHeaderProps) {
  const isBR = match.match_format === 'battle_royale';
  const isFootball = match.game_title?.game_types?.slug === 'football';
  const showSeries = !isBR && (!isFootball || match.best_of > 1);
  const isLive = match.status === 'live';

  const connectionColor =
    connectionStatus === 'connected'
      ? 'bg-state-win'
      : connectionStatus === 'connecting'
      ? 'bg-amber-400'
      : 'bg-state-alert';

  return (
    <section className="bg-bg-surface border-b border-border-line select-none">
      {/* Competition bar: icon, name (opens the competition) and region */}
      <div className="py-3 px-4 border-b border-border-line/60 bg-bg-void/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <Link
            href={`/competitions/${match.competition?.slug ?? slug}`}
            className="flex items-center gap-3 min-w-0 group"
          >
            {match.competition?.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.competition.banner_url}
                alt=""
                loading="lazy"
                className="w-9 h-9 rounded object-cover bg-bg-void border border-border-line shrink-0"
              />
            ) : (
              <span className="w-9 h-9 rounded bg-bg-void border border-border-line flex items-center justify-center shrink-0 font-display font-black text-text-muted">
                {(match.competition?.name ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-display font-bold text-sm text-text-primary truncate group-hover:text-accent-readout transition-colors">
                {match.competition?.name ?? 'Competition'}
              </span>
              {match.competition?.region && (
                <span className="block text-[11px] text-text-muted truncate">{match.competition.region}</span>
              )}
            </span>
          </Link>

          <div className="flex items-center gap-3 font-data text-[10px] text-text-muted shrink-0">
            <span className="flex items-center gap-1.5 bg-bg-void px-2 py-1 rounded border border-border-line">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionColor}`} />
              <span className="uppercase">{connectionStatus}</span>
            </span>
            <EventBadge status={match.status} football={isFootball} />
          </div>
        </div>
      </div>

      {/* Flagship Scoreboard Area */}
      <div className="py-5 sm:py-8 px-3 sm:px-4 max-w-4xl mx-auto">
        {!isBR ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-6">
            {/* Home */}
            <TeamBlock team={match.team_home} teamId={match.team_home_id} fallback="Home Team" reds={redHome} />

            {/* Centre: kickoff time or score */}
            <div className="flex flex-col items-center justify-center self-center shrink-0 min-w-[5.5rem]">
              {match.status === 'scheduled' || match.status === 'delayed' ? (
                <>
                  <span className="font-data font-bold text-3xl sm:text-5xl text-text-primary tabular-nums">
                    {new Date(match.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })}
                  </span>
                  <span className="text-xs sm:text-sm text-text-muted mt-1">
                    {new Date(match.scheduled_at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  {match.status === 'delayed' && (
                    <span className="mt-1 text-[10px] font-display font-bold text-state-alert tracking-wider">DELAYED</span>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 sm:gap-3 font-data font-bold text-4xl sm:text-6xl tracking-wider text-text-primary tabular-nums">
                    {showSeries ? (
                      <>
                        <ScoreFlash value={score?.home_maps_won || 0} isLive={isLive} teamName={match.team_home?.name} />
                        <span className="text-text-muted text-2xl sm:text-4xl">:</span>
                        <ScoreFlash value={score?.away_maps_won || 0} isLive={isLive} teamName={match.team_away?.name} />
                      </>
                    ) : (
                      <>
                        <ScoreFlash value={score?.home_current_score || 0} isLive={isLive} teamName={match.team_home?.name} />
                        <span className="text-text-muted text-2xl sm:text-4xl">:</span>
                        <ScoreFlash value={score?.away_current_score || 0} isLive={isLive} teamName={match.team_away?.name} />
                      </>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-[11px] sm:text-xs font-display font-bold tracking-widest flex items-center gap-1.5 ${
                      isLive && liveLabel ? 'text-state-alert' : isLive ? 'text-accent-primary' : 'text-accent-cyan'
                    }`}
                  >
                    {isLive && !liveLabel && <StatusDot status="live" size="sm" />}
                    {isLive ? (liveLabel ?? 'LIVE') : isFootball ? 'FT' : 'ENDED'}
                  </span>
                </>
              )}
              {!isBR && (
                <span className="text-[9px] sm:text-[10px] text-text-muted font-display tracking-widest mt-1 uppercase">
                  {match.game_title?.name ? `${shortGameName(match.game_title.name)} · ` : ''}BO{match.best_of}
                </span>
              )}
            </div>

            {/* Away */}
            <TeamBlock team={match.team_away} teamId={match.team_away_id} fallback="Away Team" reds={redAway} />
          </div>
        ) : (
          <div className="text-center space-y-3">
            <h1 className="font-display font-black text-2xl md:text-3xl tracking-widest text-accent-signal uppercase">
              BATTLE ROYALE LOBBY
            </h1>
            <p className="text-xs font-data text-text-muted uppercase">
              Official Tournament Standings & Placement Telemetry
            </p>
          </div>
        )}

        {/* Official Recap String */}
        {recapString && (
          <div className="mt-6 border border-border-line bg-bg-void p-3 rounded text-center">
            <span className="text-[9px] font-display font-bold text-text-muted uppercase tracking-widest block mb-1">
              OFFICIAL BROADCAST RECAP
            </span>
            <p className="text-xs font-data text-text-primary italic">&ldquo;{recapString}&rdquo;</p>
          </div>
        )}
      </div>
    </section>
  );
}

function TeamLink({
  teamId,
  className,
  children,
}: {
  teamId: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return teamId ? (
    <Link href={`/teams/${teamId}`} className={`${className ?? ''} hover:opacity-80 transition-opacity`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

function TeamBlock({
  team,
  teamId,
  fallback,
  reds = 0,
}: {
  team?: Match['team_home'];
  teamId: string | null;
  fallback: string;
  reds?: number;
}) {
  const name = team?.name ?? fallback;
  return (
    <div className="flex flex-col items-center text-center gap-2 min-w-0">
      <TeamLink teamId={teamId} className="flex flex-col items-center text-center gap-2 min-w-0">
      <div className="w-16 h-16 sm:w-24 sm:h-24 overflow-hidden rounded-2xl bg-bg-void border border-border-line flex items-center justify-center font-display font-black text-lg sm:text-2xl text-text-muted shadow-inner">
        {team?.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          name.substring(0, 3).toUpperCase()
        )}
      </div>
      <span className="font-display font-bold text-sm sm:text-xl text-text-primary leading-tight break-words max-w-full">
        {name}
      </span>
      </TeamLink>
      <RedCards count={reds} />
      {teamId && (
        <FavoriteStar entityType="team" entityId={teamId} entityName={name} size="sm" />
      )}
    </div>
  );
}
