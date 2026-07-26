'use client';

import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  layoutId?: string;
  className?: string;
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  layoutId = 'active-tab-indicator',
  className = '',
}: TabBarProps) {
  return (
    <div
      role="tablist"
      className={`flex border-b border-border-line gap-1 font-display font-bold tracking-wider text-xs select-none overflow-x-auto scrollbar-none ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-2.5 flex items-center gap-2 transition-colors shrink-0 focus-ring ${
              isActive ? 'text-accent-readout' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{tab.icon}</span>}
            <span className="uppercase">{tab.label}</span>

            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.5 text-[9px] font-data rounded-full ${
                  isActive
                    ? 'bg-accent-readout/20 text-accent-readout'
                    : 'bg-bg-surface text-text-muted'
                }`}
              >
                {tab.badge}
              </span>
            )}

            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-readout"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
