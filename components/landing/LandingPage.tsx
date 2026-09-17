'use client';

import { PublicNav } from '../layout/public-nav';
import { HeroSection } from './HeroSection';
import { StatsCounter } from './StatsCounter';
import { FeaturesGrid } from './FeaturesGrid';
import { PlatformPreview } from './PlatformPreview';
import { CTASection } from './CTASection';
import Link from 'next/link';
import { Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary relative overflow-x-hidden min-h-screen">
      {/* Ambient background mesh */}
      <div className="gradient-mesh" aria-hidden="true">
        <div className="mesh-orb" />
      </div>

      <PublicNav />
      
      <main className="flex-1 relative z-10">
        <HeroSection />
        <StatsCounter />
        <FeaturesGrid />
        <PlatformPreview />
        <CTASection />
      </main>

      {/* Modern SaaS Glass Footer */}
      <footer className="glass-strong border-t border-white/[0.08] py-12 relative z-20 select-none text-xs text-text-muted">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-primary to-pink-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(217,70,239,0.3)]">
              <Zap className="w-4 h-4 text-white fill-white/20" />
            </div>
            <div>
              <div className="font-display font-bold text-white text-sm tracking-wider">
                ESPORTING<span className="text-accent-primary font-black">HQ</span>
              </div>
              <p className="text-[11px] text-text-muted">Nigeria&apos;s premier real-time esports platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-display font-medium text-xs">
            <Link href="/feed" className="hover:text-white transition-colors">Live Feed</Link>
            <Link href="/competitions" className="hover:text-white transition-colors">Competitions</Link>
            <Link href="/favorites" className="hover:text-white transition-colors">Favorites</Link>
            <Link href="/news" className="hover:text-white transition-colors">News</Link>
            <Link href="/settings/notifications" className="hover:text-white transition-colors">Notifications</Link>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-data text-text-muted">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-state-win/10 border border-state-win/25 text-state-win font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-state-win animate-pulse" />
              All Systems Operational
            </span>
            <span>© {new Date().getFullYear()} EsportingHQ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
