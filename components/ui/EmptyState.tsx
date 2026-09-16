'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`py-12 px-4 text-center bg-bg-surface border border-border-line rounded flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-bg-void border border-border-line flex items-center justify-center text-text-muted/60">
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="font-display font-bold uppercase text-sm tracking-wider text-text-primary">
          {title}
        </h3>
        <p className="text-xs text-text-muted font-body leading-relaxed">{description}</p>
      </div>

      {actionLabel && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center px-4 py-2 bg-bg-void border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-semibold tracking-wider text-text-muted hover:text-text-primary transition-all focus-ring"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 bg-bg-void border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-semibold tracking-wider text-text-muted hover:text-text-primary transition-all focus-ring"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
