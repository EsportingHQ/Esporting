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
      className={`py-16 px-6 text-center glass rounded-3xl border border-white/[0.08] flex flex-col items-center justify-center space-y-4 shadow-xl ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-glow shadow-[0_0_20px_rgba(217,70,239,0.15)]">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="font-display font-bold text-lg text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-text-muted font-body leading-relaxed">{description}</p>
      </div>

      {actionLabel && (
        <div className="pt-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center justify-center px-5 py-2.5 btn-glass text-xs font-display font-semibold tracking-wider text-white rounded-xl hover:border-accent-primary/40 focus-ring"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center justify-center px-5 py-2.5 btn-glass text-xs font-display font-semibold tracking-wider text-white rounded-xl hover:border-accent-primary/40 focus-ring"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
