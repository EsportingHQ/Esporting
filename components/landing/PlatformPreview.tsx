'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { CheckCircle2, Sparkles, Activity, Layers } from 'lucide-react';

export function PlatformPreview() {
  return (
    <section className="glass-strong py-20 sm:py-32 border-y border-white/[0.08] relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-accent-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          
          <div className="w-full lg:w-5/12 space-y-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-glow text-xs font-display font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>LIVE TELEMETRY INTERFACE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white leading-tight">
              Crafted for Real-Time{' '}
              <span className="text-gradient-fuchsia">Command</span>
            </h2>

            <p className="text-text-muted font-body text-base leading-relaxed">
              Every detail is engineered for lightning-quick decision making. High-contrast live scores, head-to-head records, and instant event updates keep you in control of every bracket and broadcast.
            </p>
            
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl glass hover:bg-white/[0.05] transition-colors">
                <div className="p-2 rounded-xl bg-accent-primary/15 text-accent-glow shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white">Live Status Signals</div>
                  <div className="text-xs text-text-muted">Real-time pulse indicators and score flash animations.</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl glass hover:bg-white/[0.05] transition-colors">
                <div className="p-2 rounded-xl bg-pink-500/15 text-pink-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white">Tabular Match Intelligence</div>
                  <div className="text-xs text-text-muted">Dense, high-legibility stats configured for desktop and mobile.</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl glass hover:bg-white/[0.05] transition-colors">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white">Automated Verification</div>
                  <div className="text-xs text-text-muted">Direct organizer confirmations and dispute management.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-7/12 relative perspective-1000">
            <motion.div
              initial={{ opacity: 0, rotateY: 8, rotateX: 6, y: 40 }}
              whileInView={{ opacity: 1, rotateY: -3, rotateX: 3, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: "-80px" }}
              className="relative rounded-3xl overflow-hidden border border-white/[0.15] shadow-[0_25px_80px_rgba(0,0,0,0.6)] group"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Glass sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary/10 via-transparent to-white/[0.05] pointer-events-none z-10" />
              
              <Image 
                src="/platform-mockup.jpg"
                alt="EsportingHQ Command Interface Preview"
                width={1200}
                height={800}
                className="w-full h-auto object-cover relative z-0 transition-transform duration-700 group-hover:scale-[1.02]"
              />
              
              {/* Floating glass badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="absolute top-6 right-6 z-20 glass-strong px-4 py-2 rounded-2xl flex items-center gap-2.5 border border-accent-primary/40 text-white text-xs font-display font-bold shadow-2xl backdrop-blur-xl"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-accent-live animate-ping" />
                <span>LIVE FEED OVERVIEW</span>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
