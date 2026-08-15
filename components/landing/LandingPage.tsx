'use client';

import { PublicNav } from '../layout/public-nav';
import { HeroSection } from './HeroSection';
import { StatsCounter } from './StatsCounter';
import { FeaturesGrid } from './FeaturesGrid';
import { PlatformPreview } from './PlatformPreview';
import { CTASection } from './CTASection';
import { StatusDot } from '../broadcast/StatusDot';

export function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary selection:bg-accent-readout/30">
      <PublicNav />
      
      <main className="flex-1">
        <HeroSection />
        <StatsCounter />
        <FeaturesGrid />
        <PlatformPreview />
        <CTASection />
      </main>

      <footer className="bg-bg-surface border-t border-border-line py-6 select-none text-[10px] text-text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-data">© 2026 ESPORTINGHQ. NIGERIA'S FIRST LIVE ESPORTING HUB.</span>
          <div className="flex items-center gap-4 font-display font-semibold tracking-wider">
            <span className="flex items-center gap-1.5">
              <StatusDot status="completed" size="sm" />
              <span>NETWORK STATUS: NOMINAL</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
