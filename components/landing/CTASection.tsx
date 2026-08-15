'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="relative py-32 bg-bg-void overflow-hidden flex items-center justify-center">
      
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-20 animate-gradient-shift bg-gradient-to-r from-accent-signal via-bg-void to-accent-readout pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-4xl md:text-6xl font-display font-black uppercase tracking-tighter mb-6 text-white"
        >
          Ready to go <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-signal to-accent-readout">Live?</span>
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          viewport={{ once: true }}
          className="text-text-muted font-body text-lg mb-10 max-w-2xl mx-auto"
        >
          Join the waitlist or log into your control panel to start managing tournaments on Nigeria's first live esporting hub.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-accent-readout text-bg-void font-display font-bold tracking-wider rounded hover:bg-white transition-colors focus-ring"
          >
            JOIN WAITLIST / SIGN UP
          </Link>

          <Link
            href="/feed"
            className="w-full sm:w-auto px-8 py-3.5 bg-transparent text-text-primary font-display font-bold tracking-wider border border-border-line hover:border-text-primary rounded transition-colors focus-ring"
          >
            VIEW LIVE FEED
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
