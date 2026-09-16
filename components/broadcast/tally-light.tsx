'use client';

interface TallyLightProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TallyLight({ className = '', size = 'md' }: TallyLightProps) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span className={`relative inline-flex ${sizeClasses[size]} ${className}`}>
      {/* Outer breathing ring */}
      <span className="tally-pulse absolute inline-flex h-full w-full rounded-full bg-accent-signal opacity-75"></span>
      {/* Inner solid dot */}
      <span className="relative inline-flex rounded-full bg-accent-signal h-full w-full"></span>
    </span>
  );
}
