'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Crosshair, 
  ChevronDown, 
  Shield, 
  Gamepad2, 
  Flame, 
  Target, 
  Swords, 
  Sparkles, 
  Radio
} from 'lucide-react';

export interface GameProfile {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  icon?: any;
  category: 'football' | 'shooter' | 'br' | 'moba' | 'all';
}

export const GAME_PROFILES: GameProfile[] = [
  { id: 'all', name: 'All Games', shortName: 'ALL', slug: 'all', category: 'all' },
  { id: 'cs2', name: 'Counter-Strike 2', shortName: 'CS2', slug: 'cs2', icon: Crosshair, category: 'shooter' },
  { id: 'dota2', name: 'Dota 2', shortName: 'DOTA 2', slug: 'dota-2', icon: Swords, category: 'moba' },
  { id: 'lol', name: 'League of Legends', shortName: 'LOL', slug: 'lol', icon: Shield, category: 'moba' },
  { id: 'val', name: 'Valorant', shortName: 'VAL', slug: 'val', icon: Flame, category: 'shooter' },
  { id: 'mlbb', name: 'Mobile Legends: Bang Bang', shortName: 'MLBB', slug: 'mlbb', icon: Gamepad2, category: 'moba' },
  { id: 'kog', name: 'Honor of Kings', shortName: 'KOG', slug: 'kog', icon: Sparkles, category: 'moba' },
  { id: 'r6', name: 'Rainbow Six Siege', shortName: 'R6', slug: 'r6', icon: Target, category: 'shooter' },
  // Additional games shown in the "MORE" dropdown:
  { id: 'fc26', name: 'EA SPORTS FC 26', shortName: 'FC 26', slug: 'fc-26', category: 'football' },
  { id: 'codm', name: 'Call of Duty: Mobile', shortName: 'CODM', slug: 'codm-mp', category: 'shooter' },
  { id: 'pubg', name: 'PUBG Mobile', shortName: 'PUBG', slug: 'pubg-br', category: 'br' },
  { id: 'ff', name: 'Free Fire', shortName: 'FREE FIRE', slug: 'freefire-br', category: 'br' },
  { id: 'efb', name: 'eFootball Mobile', shortName: 'EFOOTBALL', slug: 'efootball-mobile', category: 'football' },
];

export function GameProfilesBar() {
  const searchParams = useSearchParams();
  const currentGame = searchParams.get('game') || 'all';
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Split into primary games visible in bar and "more" games
  const primaryGames = GAME_PROFILES.slice(0, 8); // ALL, CS2, DOTA 2, LOL, VAL, MLBB, KOG, R6
  const moreGames = GAME_PROFILES.slice(8);

  const isMoreSelected = moreGames.some((g) => g.id === currentGame || g.slug === currentGame);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="w-full bg-bg-surface/95 border-b border-text-primary/[0.06] backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-between overflow-x-auto scrollbar-none gap-2 text-[11px] font-display font-bold tracking-wider uppercase">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {primaryGames.map((game) => {
            const isAll = game.id === 'all';
            const isActive = currentGame === game.id || currentGame === game.slug;
            const Icon = game.icon;

            return (
              <Link
                key={game.id}
                href={isAll ? '/feed' : `/feed?game=${game.slug}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded transition-all duration-150 ${
                  isAll
                    ? isActive
                      ? 'bg-blue-600/30 text-sky-400 border border-blue-500/40 shadow-sm'
                      : 'bg-text-primary/[0.05] text-text-muted hover:text-text-primary hover:bg-text-primary/[0.08]'
                    : isActive
                    ? 'text-sky-400 bg-sky-500/10 border-b-2 border-sky-400'
                    : 'text-text-muted hover:text-text-primary hover:bg-text-primary/[0.04]'
                }`}
              >
                {Icon ? (
                  <Icon className="w-3 h-3 text-text-muted group-hover:text-text-primary shrink-0" />
                ) : (
                  !isAll && <span className="w-1.5 h-1.5 rounded-full bg-text-muted/60" />
                )}
                <span>{game.shortName}</span>
              </Link>
            );
          })}

          {/* MORE dropdown menu */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen(!moreOpen)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-all duration-150 ${
                isMoreSelected
                  ? 'text-sky-400 bg-sky-500/10 border-b-2 border-sky-400 font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-text-primary/[0.04]'
              }`}
            >
              <span>MORE</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {moreOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 w-48 rounded-xl border border-text-primary/[0.1] bg-bg-surface/95 backdrop-blur-xl shadow-2xl py-1.5 z-50">
                {moreGames.map((game) => {
                  const isActive = currentGame === game.id || currentGame === game.slug;
                  return (
                    <Link
                      key={game.id}
                      href={`/feed?game=${game.slug}`}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold tracking-normal transition-colors ${
                        isActive
                          ? 'bg-accent-primary/15 text-accent-glow font-bold'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/70'
                      }`}
                    >
                      <span>{game.name}</span>
                      <span className="text-[10px] text-text-muted/70 font-data">
                        {game.shortName}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right subtle live indicator */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-text-muted font-data shrink-0 lowercase">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-live animate-ping" />
          <span>live game hubs</span>
        </div>
      </div>
    </div>
  );
}
