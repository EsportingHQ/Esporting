'use client';

interface MatchCardSkeletonProps {
  count?: number;
  className?: string;
}

export function MatchCardSkeleton({ count = 1, className = '' }: MatchCardSkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <div className={`space-y-2.5 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="glass rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 border border-text-primary/[0.08] flex items-center justify-between gap-3 sm:gap-4 select-none"
          aria-hidden="true"
        >
          {/* Left badge & time */}
          <div className="flex flex-col gap-1 shrink-0 w-16 sm:w-20">
            <div className="w-14 sm:w-16 h-4 skeleton-shimmer rounded-full" />
            <div className="w-10 sm:w-12 h-2.5 skeleton-shimmer rounded-md" />
          </div>

          {/* Teams */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 skeleton-shimmer rounded-md shrink-0" />
              <div className="w-24 sm:w-36 h-3 skeleton-shimmer rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 skeleton-shimmer rounded-md shrink-0" />
              <div className="w-20 sm:w-32 h-3 skeleton-shimmer rounded" />
            </div>
          </div>

          {/* Scores & star */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end gap-1.5 w-6 sm:w-8">
              <div className="w-4 h-3.5 skeleton-shimmer rounded" />
              <div className="w-4 h-3.5 skeleton-shimmer rounded" />
            </div>
            <div className="w-5 h-5 skeleton-shimmer rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
