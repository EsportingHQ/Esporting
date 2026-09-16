'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { StatusDot } from '../broadcast/StatusDot';
import { TallyLight } from '../broadcast/tally-light';

export function HeroSection() {
  const headline = "NIGERIA'S FIRST LIVE ESPORTING HUB".split(' ');

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg-void pt-14">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] animate-grid-pulse" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-void via-transparent to-bg-void" />
        <div className="absolute inset-0 animate-scanline bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[size:100%_4px] opacity-20" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-20 flex flex-col items-center text-center">
        {/* Live Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 mb-8 bg-bg-surface/50 backdrop-blur px-3 py-1.5 border border-border-line rounded"
        >
          <TallyLight size="sm" />
          <span className="text-xs font-display font-bold tracking-wider text-accent-signal">SYSTEM ONLINE</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-wrap justify-center font-display font-black text-4xl sm:text-5xl md:text-7xl text-text-primary tracking-tight leading-[0.9] uppercase gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2 mb-6"
        >
          <span className="block w-full text-center text-text-muted mb-2 text-xl sm:text-2xl tracking-widest font-bold">
            THE NEXT GEN
          </span>
          <span>NIGERIA'S</span>
          <span>LIVE</span>
          <span className="text-accent-readout relative">
            <span className="absolute -inset-1 blur-lg bg-accent-readout/30 rounded-full" />
            <span className="relative">BROADCAST</span>
          </span>
          <span>HUB</span>
          <span className="w-full text-center mt-2 text-text-muted text-xl sm:text-2xl tracking-widest font-bold">
            FOR ESPORTS
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="max-w-2xl text-text-muted font-body text-lg md:text-xl mb-12 leading-relaxed"
        >
          Your mission control for competitive gaming. Track live scores, manage tournaments, and get breaking broadcast alerts straight to your screen.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/feed"
            className="group relative px-8 py-3.5 bg-accent-readout/10 text-accent-readout font-display font-bold tracking-wider border border-accent-readout/50 rounded overflow-hidden hover:bg-accent-readout/20 transition-all focus-ring animate-glow-breathe"
          >
            <span className="relative z-10 flex items-center gap-2">
              <StatusDot status="live" size="sm" /> ENTER LIVE FEED
            </span>
          </Link>

          <Link
            href="/login"
            className="px-8 py-3.5 bg-bg-surface text-text-primary font-display font-bold tracking-wider border border-border-line hover:border-text-muted rounded transition-all focus-ring"
          >
            CONTROL PANEL
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
