'use client';

interface TallyLightProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TallyLight({ className = '', size = 'md' }: TallyLightProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span className={`relative inline-flex ${sizeClasses[size]} ${className}`}>
      {/* Outer breathing ring */}
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-live opacity-75" />
      {/* Inner solid dot */}
      <span className="relative inline-flex rounded-full bg-accent-live h-full w-full shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
    </span>
  );
}
