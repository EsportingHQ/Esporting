"use client";

import Link from "next/link";
import { StatusDot } from "../StatusDot";
import { EventBadge } from "../event-badge";
import { ScoreFlash } from "../ScoreFlash";
import { FavoriteStar } from "../FavoriteStar";
import { Match, MatchScore } from "@/hooks/useMatchRealtime";
import Image from "next/image";
import { Shield } from "lucide-react";
interface MatchHeaderProps {
  match: Match;
  score: MatchScore | null;
  slug: string;
  connectionStatus: "connecting" | "connected" | "disconnected" | "error";
  recapString?: string;
}

export function MatchHeader({
  match,
  score,
  slug,
  connectionStatus,
  recapString,
}: MatchHeaderProps) {
  const isBR = match.match_format === "battle_royale";
  const isShooter = match.game_title?.game_types?.slug === "shooter";
  const isLive = match.status === "live";

  const connectionColor =
    connectionStatus === "connected"
      ? "bg-state-win"
      : connectionStatus === "connecting"
        ? "bg-amber-400"
        : "bg-state-alert";

  return (
    <section className="bg-bg-surface border-b border-border-line select-none">
      {/* Top Breadcrumb Bar */}
      <div className="py-3 px-4 border-b border-border-line/60 bg-bg-void/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href={`/competitions/${slug}`}
              className="font-display font-bold text-accent-readout tracking-wider hover:underline flex items-center gap-1"
            >
              <span>←</span>
              <span>BACK TO DIVISION HUB</span>
            </Link>
            <span className="text-text-muted">/</span>
            <span className="font-display font-semibold text-text-primary uppercase truncate">
              {match.game_title?.name} — STAGE PLAYOFFS
            </span>
          </div>

          <div className="flex items-center gap-3 font-data text-[10px] text-text-muted">
            <span className="flex items-center gap-1.5 bg-bg-void px-2 py-1 rounded border border-border-line">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionColor}`} />
              <span className="uppercase">{connectionStatus}</span>
            </span>
            <span>MATCH ID: {match.id.substring(0, 8)}</span>
            <EventBadge status={match.status} />
          </div>
        </div>
      </div>

      {/* Flagship Scoreboard Area */}
      <div className="py-8 px-4 max-w-4xl mx-auto">
        {!isBR ? (
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex items-center gap-4 w-[40%]">
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-bg-void border border-border-line rounded overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {match.team_home?.logo_url ? (
                    <Image
                      src={match.team_home.logo_url}
                      alt={match.team_home.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-contain p-1"
                      unoptimized
                    />
                  ) : (
                    <Shield className="w-6 h-6 text-text-muted" />
                  )}
                </div>
                {match.team_home_id && (
                  <div className="absolute -top-2 -left-2 bg-bg-surface rounded-full border border-border-line p-0.5">
                    <FavoriteStar
                      entityType="team"
                      entityId={match.team_home_id}
                      entityName={match.team_home?.name || "Home Team"}
                      size="sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black text-lg md:text-2xl text-text-primary leading-tight uppercase truncate">
                  {match.team_home?.name}
                </span>
                <span className="text-[10px] font-data text-text-muted">
                  HOME SQUAD
                </span>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex flex-col items-center justify-center shrink-0 min-w-25">
              <div className="flex items-center gap-2 bg-bg-void border border-border-line px-5 py-2 rounded text-2xl md:text-4xl font-data font-bold tracking-wider text-text-primary shadow-inner">
                {isShooter ? (
                  <>
                    <ScoreFlash
                      value={score?.home_maps_won || 0}
                      isLive={isLive}
                      teamName={match.team_home?.name}
                    />
                    <span className="text-text-muted text-xl">:</span>
                    <ScoreFlash
                      value={score?.away_maps_won || 0}
                      isLive={isLive}
                      teamName={match.team_away?.name}
                    />
                  </>
                ) : (
                  <>
                    <ScoreFlash
                      value={score?.home_current_score || 0}
                      isLive={isLive}
                      teamName={match.team_home?.name}
                    />
                    <span className="text-text-muted text-xl">:</span>
                    <ScoreFlash
                      value={score?.away_current_score || 0}
                      isLive={isLive}
                      teamName={match.team_away?.name}
                    />
                  </>
                )}
              </div>

              {isLive && (
                <span className="mt-2 text-[10px] font-data text-accent-signal flex items-center gap-1.5 font-semibold">
                  <StatusDot status="live" size="sm" />
                  <span>LIVE IN PROGRESS</span>
                </span>
              )}

              {isShooter && (
                <span className="text-[9px] text-text-muted font-display tracking-widest mt-1 uppercase">
                  BO{match.best_of} MAP SERIES
                </span>
              )}
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-end gap-4 w-[40%] text-right">
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black text-lg md:text-2xl text-text-primary leading-tight uppercase truncate">
                  {match.team_away?.name}
                </span>
                <span className="text-[10px] font-data text-text-muted">
                  AWAY SQUAD
                </span>
              </div>
              <div className="relative">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-bg-void border border-border-line rounded overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {match.team_away?.logo_url ? (
                    <Image
                      src={match.team_away.logo_url}
                      alt={match.team_away.name}
                      width={56}
                      height={56}
                      className="w-full h-full object-contain p-1"
                      unoptimized
                    />
                  ) : (
                    <Shield className="w-6 h-6 text-text-muted" />
                  )}
                </div>
                {match.team_away_id && (
                  <div className="absolute -top-2 -right-2 bg-bg-surface rounded-full border border-border-line p-0.5">
                    <FavoriteStar
                      entityType="team"
                      entityId={match.team_away_id}
                      entityName={match.team_away?.name || "Away Team"}
                      size="sm"
                    />
                  </div>
                )}
              </div>
            </div>
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
            <p className="text-xs font-data text-text-primary italic">
              &quot;{recapString}&quot;
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
