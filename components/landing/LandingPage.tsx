'use client';

import { PublicNav } from '../layout/public-nav';
import { HeroSection } from './HeroSection';
import { StatsCounter } from './StatsCounter';
import { FeaturesGrid } from './FeaturesGrid';
import { PlatformPreview } from './PlatformPreview';
import { CTASection } from './CTASection';
import Link from 'next/link';
import Image from 'next/image';

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
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Image
              src="/esportinghq-logo-white.png"
              alt="EsportingHQ Logo"
              width={160}
              height={38}
              className="h-8 w-auto object-contain"
            />
            <span className="text-[11px] text-text-muted sm:border-l sm:border-white/[0.1] sm:pl-3">
              Nigeria&apos;s premier live esports platform
            </span>
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
