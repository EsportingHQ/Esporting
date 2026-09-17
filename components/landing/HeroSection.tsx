'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Flame, Trophy, Users, Radio } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16 pb-20">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-accent-primary/20 via-pink-600/10 to-transparent rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        {/* Modern Live Pill */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass border border-white/[0.12] text-xs font-display font-semibold text-white/90 shadow-[0_0_20px_rgba(217,70,239,0.15)] mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-live opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-live" />
          </span>
          <span className="tracking-wide">LIVE TOURNAMENT ENGINE ACTIVE</span>
        </motion.div>

        {/* Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-black text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-tight leading-[1.05] uppercase max-w-5xl mb-6"
        >
          The Next Generation of{' '}
          <span className="relative inline-block">
            <span className="text-gradient-fuchsia drop-shadow-[0_0_35px_rgba(217,70,239,0.4)]">
              Live Esports
            </span>
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="max-w-2xl text-text-muted font-body text-base sm:text-lg md:text-xl mb-10 leading-relaxed font-normal"
        >
          Track live head-to-head scores, automated tournament brackets, and real-time player telemetry across Nigeria&apos;s most competitive gaming leagues.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/feed"
            className="w-full sm:w-auto btn-primary px-8 py-4 text-sm font-display font-bold tracking-wider rounded-xl flex items-center justify-center gap-2.5 group shadow-[0_0_30px_rgba(217,70,239,0.35)]"
          >
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>EXPLORE LIVE MATCHES</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/competitions"
            className="w-full sm:w-auto btn-glass px-8 py-4 text-sm font-display font-semibold tracking-wider rounded-xl flex items-center justify-center gap-2 hover:border-accent-primary/40"
          >
            <Trophy className="w-4 h-4 text-accent-primary" />
            <span>VIEW TOURNAMENTS</span>
          </Link>
        </motion.div>

        {/* Floating Glass Feature Badges */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 w-full max-w-3xl"
        >
          <div className="glass glass-hover p-4 rounded-2xl flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-glow shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-display font-bold text-white">Instant Sync</div>
              <div className="text-xs text-text-muted">Sub-second score updates</div>
            </div>
          </div>

          <div className="glass glass-hover p-4 rounded-2xl flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-display font-bold text-white">Auto Brackets</div>
              <div className="text-xs text-text-muted">Dynamic tournament ladders</div>
            </div>
          </div>

          <div className="glass glass-hover p-4 rounded-2xl flex items-center gap-3.5 text-left">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-display font-bold text-white">5,000+ Players</div>
              <div className="text-xs text-text-muted">Verified Nigerian talent</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
