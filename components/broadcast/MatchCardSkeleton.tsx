'use client';

interface MatchCardSkeletonProps {
  count?: number;
  className?: string;
}

export function MatchCardSkeleton({ count = 1, className = '' }: MatchCardSkeletonProps) {
  const items = Array.from({ length: count });

  return (
    <div className={`space-y-4 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="glass rounded-2xl p-3 sm:p-5 border border-white/[0.08] flex flex-col gap-2.5 sm:gap-3.5 select-none"
          aria-hidden="true"
        >
          {/* Top header bar skeleton */}
          <div className="flex items-center justify-between">
            <div className="w-28 sm:w-32 h-3.5 skeleton-shimmer rounded-full" />
            <div className="w-14 sm:w-16 h-5 skeleton-shimmer rounded-full" />
          </div>

          {/* Teams and score readout skeleton */}
          <div className="flex items-center justify-between py-0.5 sm:py-1">
            <div className="flex items-center gap-2 sm:gap-3 w-[35%]">
              <div className="w-8 h-8 sm:w-10 sm:h-10 skeleton-shimmer rounded-xl shrink-0" />
              <div className="w-16 sm:w-24 h-3.5 sm:h-4 skeleton-shimmer rounded-lg" />
            </div>

            <div className="w-16 sm:w-20 h-7 sm:h-9 skeleton-shimmer rounded-xl shrink-0" />

            <div className="flex items-center justify-end gap-2 sm:gap-3 w-[35%]">
              <div className="w-16 sm:w-24 h-3.5 sm:h-4 skeleton-shimmer rounded-lg" />
              <div className="w-8 h-8 sm:w-10 sm:h-10 skeleton-shimmer rounded-xl shrink-0" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
