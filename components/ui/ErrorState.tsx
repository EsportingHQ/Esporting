"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "BROADCAST CONNECTION ERROR",
  description = "Failed to sync live telemetry data from server. Please check connection.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`py-8 px-4 text-center bg-bg-surface border border-state-alert/30 rounded flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-state-alert/10 border border-state-alert/30 flex items-center justify-center text-state-alert">
        <AlertCircle className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="font-display font-bold uppercase text-xs tracking-wider text-state-alert">
          {title}
        </h3>
        <p className="text-xs text-text-muted font-body leading-relaxed">
          {description}
        </p>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bg-void border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-semibold tracking-wider text-text-muted hover:text-text-primary transition-all focus-ring mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RETRY CONNECTION</span>
        </button>
      )}
    </div>
  );
}
