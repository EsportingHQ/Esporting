'use client';

import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Eclipse } from 'lucide-react';
import { useTheme, type Theme } from '@/hooks/useTheme';

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'dimmed', label: 'Dimmed', icon: Eclipse },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Pick the icon for the current state
  const ActiveIcon =
    resolvedTheme === 'light' ? Sun : resolvedTheme === 'dimmed' ? Eclipse : Moon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Change theme"
        aria-label="Change theme"
        aria-expanded={open}
        className="p-2.5 rounded-xl border border-border-line bg-bg-surface/30 hover:bg-bg-elevated/60 hover:border-accent-primary/40 text-text-muted hover:text-text-primary transition-all duration-200 focus-ring min-h-[42px] min-w-[42px] flex items-center justify-center shadow-sm"
      >
        <ActiveIcon className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-border-line bg-bg-surface/95 backdrop-blur-xl shadow-xl overflow-hidden z-50"
          role="menu"
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{opt.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
