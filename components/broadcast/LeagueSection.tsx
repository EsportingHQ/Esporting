"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy } from "lucide-react";
import { StatusDot } from "./StatusDot";
import { FavoriteStar } from "./FavoriteStar";
import Image from "next/image";

interface LeagueSectionProps {
  competitionId: string;
  competitionName: string;
  competitionSlug: string;
  gameTitle?: string;
  liveCount?: number;
  totalCount?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

function GameLogo({ gameTitle }: { gameTitle: string }) {
  const title = gameTitle.toLowerCase();

  let src = "/games/default-game.svg";

  if (title.includes("counter-strike") || title.includes("cs2")) {
    src = "/games/cs2.svg";
  } else if (title.includes("valorant")) {
    src = "/games/valorant.svg";
  } else if (title.includes("fc")) {
    src = "/games/fc26.svg";
  } else if (title.includes("efootball")) {
    src = "/games/efootball.svg";
  } else if (title.includes("cod")) {
    src = "/games/codm.svg";
  } else if (title.includes("pubg")) {
    src = "/games/pubg.svg";
  } else if (title.includes("free fire")) {
    src = "/games/freefire.svg";
  }

  return (
    <Image
      src={src}
      alt={gameTitle}
      width={18}
      height={18}
      className="rounded-sm object-contain"
      style={{ width: "auto", height: "auto" }}
    />
  );
}

export function LeagueSection({
  competitionId,
  competitionName,
  competitionSlug,
  gameTitle,
  liveCount = 0,
  totalCount = 0,
  defaultExpanded = true,
  children,
  className = "",
}: LeagueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || liveCount > 0,
  );

  return (
    <div
      className={`bg-bg-surface border border-border-line rounded overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-bg-void/40 border-b border-border-line flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <FavoriteStar
            entityType="competition"
            entityId={competitionId}
            entityName={competitionName}
            size="sm"
          />

          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent-readout shrink-0" />
            <Link
              href={`/competitions/${competitionSlug}`}
              className="font-display font-bold text-sm uppercase tracking-wider text-text-primary hover:text-accent-readout transition-colors"
            >
              {competitionName}
            </Link>
          </div>

          {gameTitle && (
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-bg-void border border-border-line rounded-sm">
              <GameLogo
                gameTitle={gameTitle === "Counter-Strike 2" ? "CS2" : gameTitle}
              />
              <span className="text-[10px] font-display font-bold text-text-muted tracking-wider uppercase">
                {gameTitle === "Counter-Strike 2" ? "CS2" : gameTitle}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {liveCount > 0 && (
            <span className="text-[10px] font-data text-accent-signal flex items-center gap-1.5 bg-accent-signal/10 px-2 py-0.5 rounded border border-accent-signal/30 font-semibold">
              <StatusDot status="live" size="sm" />
              <span>{liveCount} LIVE</span>
            </span>
          )}

          {totalCount > 0 && (
            <span className="text-[10px] font-data text-text-muted">
              {totalCount} {totalCount === 1 ? "MATCH" : "MATCHES"}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${competitionName}`}
            className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-bg-void transition-all focus-ring"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="p-3 space-y-3 divide-y divide-border-line/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
