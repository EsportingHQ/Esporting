'use client';

import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function Counter({ from = 0, to, duration = 2, suffix = '' }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (isInView) {
      let startTimestamp: number;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
        setCount(Math.floor(progress * (to - from) + from));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }
  }, [isInView, to, from, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export function StatsCounter() {
  const stats = [
    { label: 'Live Matches Tracked', value: 12, suffix: '+', note: 'Real-time telemetry' },
    { label: 'Active Competitions', value: 50, suffix: '+', note: 'Leagues & cups' },
    { label: 'Registered Teams', value: 200, suffix: '+', note: 'Clubs nationwide' },
    { label: 'Verified Players', value: 5000, suffix: '+', note: 'Active roster' },
  ];

  return (
    <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-6 -mt-8 sm:-mt-12">
      <div className="glass-strong rounded-3xl border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 sm:p-10 backdrop-blur-2xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col items-center text-center space-y-1.5 ${idx !== 0 ? 'pt-4 sm:pt-0 sm:pl-6' : ''}`}
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-gradient-fuchsia tracking-tight">
                <Counter to={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-xs sm:text-sm font-display font-bold text-white tracking-wide">
                {stat.label}
              </div>
              <div className="text-[11px] font-body text-text-muted">
                {stat.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
