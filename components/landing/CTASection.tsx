'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';

export function CTASection() {
  return (
    <section className="relative py-28 sm:py-36 overflow-hidden flex items-center justify-center">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-accent-primary/20 via-pink-600/15 to-purple-600/20 rounded-full blur-[140px] animate-gradient-shift" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 w-full">
        <div className="glass-strong rounded-3xl sm:rounded-[36px] border border-white/[0.12] p-8 sm:p-16 text-center shadow-[0_30px_100px_rgba(0,0,0,0.6)] relative overflow-hidden backdrop-blur-2xl">
          {/* Subtle top light strip */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-accent-primary/60 to-transparent" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-primary to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(217,70,239,0.4)] text-white"
          >
            <Zap className="w-7 h-7 fill-white/20" />
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl md:text-6xl font-display font-black tracking-tight text-white mb-6 uppercase"
          >
            Ready to Elevate Your{' '}
            <span className="text-gradient-fuchsia">Esporting Experience?</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            viewport={{ once: true }}
            className="text-text-muted font-body text-base sm:text-lg mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Join players, tournament organizers, and broadcast creators already powering live competitive gaming with EsportingHQ.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="w-full sm:w-auto btn-primary px-9 py-4 text-sm font-display font-bold tracking-wider rounded-xl flex items-center justify-center gap-2 group shadow-[0_0_35px_rgba(217,70,239,0.4)]"
            >
              <span>GET STARTED FREE</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/feed"
              className="w-full sm:w-auto btn-glass px-9 py-4 text-sm font-display font-semibold tracking-wider rounded-xl flex items-center justify-center gap-2 hover:border-accent-primary/40"
            >
              EXPLORE LIVE MATCHES
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
