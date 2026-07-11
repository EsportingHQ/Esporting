'use client';

import Link from 'next/link';
import { TallyLight } from '../broadcast/tally-light';

export function PublicNav() {
  return (
    <header className="w-full bg-bg-void border-b border-border-line text-sm select-none font-body">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded bg-accent-signal flex items-center justify-center font-display font-black text-lg text-white tracking-tighter">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base tracking-wider text-text-primary group-hover:text-accent-readout transition-colors">
              ESPORTING
            </span>
            <span className="text-[9px] font-data text-text-muted leading-none">
              LIVE BROADCAST HUB
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-6 font-display font-medium tracking-wide">
          <Link
            href="/"
            className="text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            HOME
          </Link>
          <Link
            href="/competitions"
            className="text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            COMPETITIONS
          </Link>
          <Link
            href="/news"
            className="text-text-muted hover:text-text-primary transition-colors text-xs"
          >
            NEWS
          </Link>
        </nav>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3 py-1.5 border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-semibold text-text-muted hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-text-muted"></span>
            <span>CONTROL PANEL</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
