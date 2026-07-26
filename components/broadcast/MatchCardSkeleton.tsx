'use client';

interface MatchCardSkeletonProps {
  count?: number;
  className?: string;
}

export function MatchCardSkeleton({ count = 1, className = '' }: MatchCardSkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="bg-bg-surface border border-border-line rounded p-3 flex flex-col gap-3 select-none"
          aria-hidden="true"
        >
          {/* Top header bar skeleton */}
          <div className="flex items-center justify-between">
            <div className="w-32 h-3 skeleton-shimmer rounded" />
            <div className="w-16 h-4 skeleton-shimmer rounded" />
          </div>

          {/* Teams and score readout skeleton */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3 w-[40%]">
              <div className="w-8 h-8 skeleton-shimmer rounded shrink-0" />
              <div className="w-24 h-4 skeleton-shimmer rounded" />
            </div>

            <div className="w-16 h-8 skeleton-shimmer rounded shrink-0" />

            <div className="flex items-center justify-end gap-3 w-[40%]">
              <div className="w-24 h-4 skeleton-shimmer rounded" />
              <div className="w-8 h-8 skeleton-shimmer rounded shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
