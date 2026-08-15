'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export function PlatformPreview() {
  return (
    <section className="bg-bg-surface py-24 border-y border-border-line overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="flex flex-col md:flex-row items-center gap-12">
          
          <div className="w-full md:w-1/3 space-y-6">
            <h2 className="text-3xl md:text-5xl font-display font-bold uppercase tracking-wider">
              Designed for the <span className="text-accent-readout">Broadcast</span>
            </h2>
            <p className="text-text-muted font-body leading-relaxed">
              Every pixel is tuned for maximum readability on stream and on the desk. High contrast, tabular data, and neon tally lights tell you exactly what's live right now.
            </p>
            
            <ul className="space-y-4 font-display font-bold text-sm tracking-wide text-text-primary uppercase mt-8">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-signal tally-pulse" />
                Live Status Indicators
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-readout" />
                High-Contrast Telemetry
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-favorite" />
                Data-Dense Layouts
              </li>
            </ul>
          </div>

          <div className="w-full md:w-2/3 relative perspective-1000">
            <motion.div
              initial={{ opacity: 0, rotateY: 10, rotateX: 10, y: 50 }}
              whileInView={{ opacity: 1, rotateY: -5, rotateX: 5, y: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              viewport={{ once: true, margin: "-100px" }}
              className="relative rounded-lg overflow-hidden border border-border-line shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div className="absolute inset-0 bg-accent-readout/10 animate-glow-breathe pointer-events-none z-10 mix-blend-overlay" />
              
              <Image 
                src="/platform-mockup.jpg"
                alt="Platform Interface Preview"
                width={1200}
                height={800}
                className="w-full h-auto object-cover relative z-0"
              />
              
              {/* Floating annotation */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute top-8 right-8 z-20 glass-panel px-3 py-1.5 rounded flex items-center gap-2 border-accent-readout/50 text-accent-readout text-[10px] font-data font-bold tracking-widest shadow-lg"
              >
                <div className="w-2 h-2 rounded-full bg-accent-readout animate-pulse" />
                DASHBOARD UI
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
