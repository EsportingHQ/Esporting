'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

function Counter({ from = 0, to, duration = 2, suffix = '' }: { from?: number, to: number, duration?: number, suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
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

  return <span ref={ref}>{count}{suffix}</span>;
}

export function StatsCounter() {
  const stats = [
    { label: 'LIVE MATCHES', value: 12, suffix: '+' },
    { label: 'COMPETITIONS', value: 50, suffix: '+' },
    { label: 'ACTIVE TEAMS', value: 200, suffix: '+' },
    { label: 'PLAYERS', value: 5000, suffix: '+' },
  ];

  return (
    <div className="w-full bg-bg-surface border-y border-border-line font-data py-6 relative z-20">
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between gap-8 sm:gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex flex-col items-center sm:items-start space-y-1 w-1/2 sm:w-auto">
            <span className="text-2xl md:text-4xl font-bold text-accent-readout tracking-tighter">
              <Counter to={stat.value} suffix={stat.suffix} />
            </span>
            <span className="text-[10px] md:text-xs text-text-muted tracking-widest uppercase">{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
