'use client';

import { motion } from 'framer-motion';
import { Shield, Target, Crosshair, Trophy, Activity, Globe } from 'lucide-react';

const features = [
  {
    icon: Activity,
    title: 'Live Score Tracking',
    desc: 'Real-time head-to-head match updates with dynamic digital scoring and automated status notifications.',
    gradient: 'from-accent-primary to-pink-500',
    badge: 'Real-time'
  },
  {
    icon: Trophy,
    title: 'Tournament Organizer',
    desc: 'Create single-elimination, double-elimination, round-robin, and league tables with automated seeding.',
    gradient: 'from-purple-500 to-indigo-500',
    badge: 'Automation'
  },
  {
    icon: Globe,
    title: 'Stream & Broadcast Ticker',
    desc: 'A live scrolling marquee piping real-time match events, designed for OBS overlays and spectator screens.',
    gradient: 'from-fuchsia-500 to-rose-500',
    badge: 'Broadcasting'
  },
  {
    icon: Shield,
    title: 'EA SPORTS FC Integration',
    desc: 'Comprehensive support for virtual football leagues. Track goal scorers, assist logs, and head-to-head stats.',
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'Sports'
  },
  {
    icon: Crosshair,
    title: 'CODM & Tactical Shooters',
    desc: 'Specialized scoring modules for Search & Destroy, Hardpoint, and full competitive mobile shooter circuits.',
    gradient: 'from-amber-500 to-orange-500',
    badge: 'Shooters'
  },
  {
    icon: Target,
    title: 'Battle Royale Multipliers',
    desc: 'Kill point multipliers and dynamic placement curves built for large multiplayer lobbies and squads.',
    gradient: 'from-blue-500 to-cyan-500',
    badge: 'Multiplayer'
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export function FeaturesGrid() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-glow text-xs font-display font-semibold mb-4">
            SYSTEM CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white mb-4">
            Engineered for Competitive Precision
          </h2>
          <p className="text-text-muted font-body text-base sm:text-lg">
            From grassroots community showdowns to stadium esports broadcasts, manage and broadcast every match seamlessly.
          </p>
        </div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div 
                key={idx}
                variants={itemVariants}
                className="glass glass-hover card-3d p-8 rounded-3xl flex flex-col items-start justify-between gap-6 transition-all duration-300 relative group overflow-hidden"
              >
                {/* Subtle top glow on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="w-full flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.gradient} p-0.5 shadow-lg`}>
                    <div className="w-full h-full bg-bg-surface/90 rounded-[14px] flex items-center justify-center text-white">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <span className="text-[11px] font-display font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-text-muted">
                    {feat.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-xl text-white mb-2.5 group-hover:text-accent-glow transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-sm font-body text-text-muted leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  );
}
