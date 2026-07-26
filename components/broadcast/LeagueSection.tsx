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
    <div className={`bg-bg-surface border border-border-line rounded overflow-hidden ${className}`}>
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
            <span className="hidden sm:inline-block px-2 py-0.5 bg-bg-void border border-border-line text-[9px] font-display font-bold text-text-muted tracking-wider uppercase rounded-sm">
              {gameTitle}
            </span>
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
              {totalCount} {totalCount === 1 ? 'MATCH' : 'MATCHES'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${competitionName}`}
            className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-bg-void transition-all focus-ring"
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
            transition={{ duration: 0.2, ease: 'easeInOut' }}
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
