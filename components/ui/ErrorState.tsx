'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Connection error',
  description = 'Failed to sync live data with server. Please check your connection and try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`py-12 px-6 text-center glass rounded-3xl border border-state-loss/30 flex flex-col items-center justify-center space-y-4 shadow-xl ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-state-loss/10 border border-state-loss/25 flex items-center justify-center text-state-loss shadow-[0_0_20px_rgba(239,68,68,0.15)]">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-display font-bold text-base text-white">
          {title}
        </h3>
        <p className="text-xs text-text-muted font-body leading-relaxed">{description}</p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 btn-glass text-xs font-display font-semibold tracking-wider text-white rounded-xl hover:border-accent-primary/40 focus-ring mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RETRY CONNECTION</span>
        </button>
      )}
    </div>
  );
}
