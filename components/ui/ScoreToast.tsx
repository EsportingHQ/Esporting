'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { StatusDot } from '../broadcast/StatusDot';

export interface ToastMessage {
  id: string;
  gameCode: string;
  homeTeam: string;
  awayTeam: string;
  newScore: string;
  eventType: string;
  matchId: string;
  competitionSlug?: string;
}

interface ScoreToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

// A slim, ticker-style strip: one line per alert, tap to open the match.
export function ScoreToast({ toasts, onDismiss }: ScoreToastProps) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-3 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-1.5 px-3 pointer-events-none"
    >
      <AnimatePresence>
        {toasts.slice(-2).map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const href = `/competitions/${toast.competitionSlug || 'match'}/matches/${toast.matchId}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      role="status"
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-accent-primary/40 glass-strong py-1.5 pl-3 pr-1.5 text-xs shadow-lg select-none"
    >
      <Link href={href} onClick={() => onDismiss(toast.id)} className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 font-display text-[10px] font-bold tracking-wider text-accent-live">
          <StatusDot status="live" size="sm" />
          LIVE
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">
          {toast.homeTeam} <span className="font-data text-accent-live">{toast.newScore}</span> {toast.awayTeam}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1.5 text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
