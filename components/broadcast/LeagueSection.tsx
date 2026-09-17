'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy } from 'lucide-react';
import { StatusDot } from './StatusDot';
import { FavoriteStar } from './FavoriteStar';

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

export function LeagueSection({
  competitionId,
  competitionName,
  competitionSlug,
  gameTitle,
  liveCount = 0,
  totalCount = 0,
  defaultExpanded = true,
  children,
  className = '',
}: LeagueSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || liveCount > 0);

  return (
    <div className={`glass rounded-3xl border border-white/[0.08] overflow-hidden shadow-lg transition-all ${className}`}>
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between select-none">
        <div className="flex items-center gap-3 min-w-0">
          <FavoriteStar
            entityType="competition"
            entityId={competitionId}
            entityName={competitionName}
            size="sm"
          />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent-primary/15 border border-accent-primary/25 flex items-center justify-center text-accent-glow shrink-0">
              <Trophy className="w-3.5 h-3.5" />
            </div>
            <Link
              href={`/competitions/${competitionSlug}`}
              className="font-display font-bold text-sm tracking-wide text-white hover:text-accent-glow transition-colors truncate"
            >
              {competitionName}
            </Link>
          </div>

          {gameTitle && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[10px] font-display font-semibold text-text-muted tracking-wider uppercase rounded-full">
              {gameTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {liveCount > 0 && (
            <span className="text-[10px] font-display font-bold text-accent-live flex items-center gap-1.5 bg-accent-live/15 px-2.5 py-0.5 rounded-full border border-accent-live/30">
              <StatusDot status="live" size="sm" />
              <span>{liveCount} LIVE</span>
            </span>
          )}

          {totalCount > 0 && (
            <span className="text-xs font-data text-text-muted hidden sm:inline-block">
              {totalCount} {totalCount === 1 ? 'match' : 'matches'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${competitionName}`}
            className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/[0.05] transition-all focus-ring"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="p-4 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
