'use client';

import { motion } from 'framer-motion';
import { Shield, Target, Crosshair, Trophy, Activity, Globe } from 'lucide-react';

const features = [
  {
    icon: Activity,
    title: 'LIVE SCORE TRACKING',
    desc: 'Real-time match updates with rolling digital displays and immediate broadcast alerts.',
    color: 'text-accent-signal'
  },
  {
    icon: Trophy,
    title: 'TOURNAMENT ORGANIZER',
    desc: 'Create brackets, round-robins, and leagues. The system handles the seeding and progression automatically.',
    color: 'text-accent-readout'
  },
  {
    icon: Globe,
    title: 'BROADCAST TICKER',
    desc: 'A live scrolling marquee piping breaking match data directly to your screen, styled for OBS overlays.',
    color: 'text-accent-favorite'
  },
  {
    icon: Shield,
    title: 'EA SPORTS FC',
    desc: 'Full support for virtual football leagues. Track goal scorers, match events, and head-to-head records.',
    color: 'text-text-primary'
  },
  {
    icon: Crosshair,
    title: 'CALL OF DUTY MOBILE',
    desc: 'Dedicated scoring modes for Search & Destroy, Hardpoint, and full CODM competitive schedules.',
    color: 'text-text-primary'
  },
  {
    icon: Target,
    title: 'BATTLE ROYALE',
    desc: 'Placement and kill multipliers for heavy-lobby BR games. Dynamic leaderboard shifts in real time.',
    color: 'text-text-primary'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export function FeaturesGrid() {
  return (
    <section className="bg-bg-void py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-wider mb-4 uppercase">System Capabilities</h2>
          <p className="text-text-muted font-data text-xs md:text-sm tracking-widest uppercase">Multi-Engine Support // Telemetry Validated</p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="glass-panel glass-panel-hover p-8 rounded flex flex-col items-start gap-4 transition-all duration-300"
              >
                <div className={`p-3 bg-bg-void/80 border border-border-line rounded ${feat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg tracking-wide uppercase mb-2 text-text-primary">{feat.title}</h3>
                  <p className="text-sm font-body text-text-muted leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  );
}
