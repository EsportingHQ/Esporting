"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { StatusDot } from "../broadcast/StatusDot";

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

export function ScoreToast({ toasts, onDismiss }: ScoreToastProps) {
  return (
    <div
      aria-live="assertive"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const href = toast.competitionSlug
    ? `/competitions/${toast.competitionSlug}/matches/${toast.matchId}`
    : "#";

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      role="alert"
      className="pointer-events-auto bg-bg-elevated border border-accent-readout/40 rounded p-3 shadow-xl select-none flex items-start justify-between gap-3 text-xs"
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0">
        <div className="w-7 h-7 rounded bg-accent-signal/20 border border-accent-signal/40 flex items-center justify-center text-accent-signal shrink-0 mt-0.5">
          <Bell className="w-3.5 h-3.5" />
        </div>

        <Link
          href={href}
          onClick={() => onDismiss(toast.id)}
          className="flex-1 min-w-0 group"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-bold text-accent-readout text-[10px] uppercase">
              {toast.gameCode} • {toast.eventType}
            </span>
            <span className="flex items-center gap-1 text-[9px] text-accent-signal font-data">
              <StatusDot status="live" size="sm" />
              <span>LIVE SCORE</span>
            </span>
          </div>

          <div className="font-display font-bold text-sm text-text-primary group-hover:text-accent-readout transition-colors truncate mt-0.5">
            {toast.homeTeam} vs {toast.awayTeam}
          </div>

          <div className="font-data font-semibold text-xs text-accent-signal mt-0.5">
            NEW SCORE: {toast.newScore}
          </div>
        </Link>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-bg-void transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}
