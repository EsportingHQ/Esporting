import type { LucideIcon } from 'lucide-react';

// One list of launch games, used by every game filter (Live feed, Competitions).
// Add a game here once and it shows up everywhere.

export interface GameProfile {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  category: 'football' | 'shooter' | 'br' | 'moba' | 'all';
  /** Logo in /public/games, recoloured with CSS so it follows the theme and selected state. */
  iconSrc?: string;
  /** Fallback icon for games that do not have a logo file yet. */
  icon?: LucideIcon;
  /** Does a game title name (lower-cased) belong to this game? */
  matches?: (titleLower: string) => boolean;
}

// Matched against game_titles.name as seeded in the database: 'FC 26', 'FC Mobile',
// 'eFootball Mobile', 'CODM Multiplayer', 'CODM Battle Royale', 'PUBG Battle Royale',
// 'Free Fire Battle Royale', 'Mobile Legends: Bang Bang'.
export const GAME_PROFILES: GameProfile[] = [
  { id: 'all', name: 'All Games', shortName: 'ALL', slug: 'all', category: 'all' },
  {
    id: 'codm', name: 'Call of Duty: Mobile', shortName: 'CODM', slug: 'codm-mp', category: 'shooter',
    iconSrc: '/games/codm.svg',
    // Covers both Multiplayer and Battle Royale titles
    matches: (t) => t.includes('codm') || t.includes('call of duty'),
  },
  {
    id: 'fc26', name: 'EA SPORTS FC', shortName: 'EAFC', slug: 'fc-26', category: 'football',
    iconSrc: '/games/eafc.svg',
    // FC 26, FC 27, ... but not "FC Mobile"
    matches: (t) => /\bfc\s?\d{2}\b/.test(t),
  },
  {
    id: 'efb', name: 'eFootball Mobile', shortName: 'EFOOTBALL', slug: 'efootball-mobile', category: 'football',
    iconSrc: '/games/efootball.svg',
    matches: (t) => t.includes('efootball'),
  },
  {
    id: 'fcm', name: 'FC Mobile', shortName: 'FC MOBILE', slug: 'fc-mobile', category: 'football',
    iconSrc: '/games/fcm.svg',
    matches: (t) => t.includes('fc mobile'),
  },
  {
    id: 'ff', name: 'Free Fire', shortName: 'FREE FIRE', slug: 'freefire-br', category: 'br',
    iconSrc: '/games/freefire.svg',
    matches: (t) => t.includes('free fire'),
  },
  {
    id: 'mlbb', name: 'Mobile Legends: Bang Bang', shortName: 'MLBB', slug: 'mlbb', category: 'moba',
    iconSrc: '/games/mlbb.svg',
    matches: (t) => t.includes('mobile legends') || t.includes('mlbb'),
  },
  {
    id: 'pubg', name: 'PUBG Mobile', shortName: 'PUBG', slug: 'pubg-br', category: 'br',
    iconSrc: '/games/pubg.svg',
    matches: (t) => t.includes('pubg'),
  },
];

/**
 * The short name used in game filters, for any game title in the database.
 * 'Mobile Legends: Bang Bang' -> 'MLBB', 'Free Fire Battle Royale' -> 'FREE FIRE', 'FC 26' -> 'EAFC 26'.
 * CODM keeps its mode ('CODM MP' / 'CODM BR') because one competition can run both.
 */
export function shortGameName(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('codm') || t.includes('call of duty')) {
    if (t.includes('battle royale') || /\bbr\b/.test(t)) return 'CODM BR';
    if (t.includes('multiplayer') || /\bmp\b/.test(t)) return 'CODM MP';
    return 'CODM';
  }
  const m = /\bfc\s?(\d{2})\b/.exec(t);
  if (m) return `EAFC ${m[1]}`;
  const profile = GAME_PROFILES.find((g) => g.id !== 'all' && g.matches?.(t));
  return profile ? profile.shortName : title;
}
