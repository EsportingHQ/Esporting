'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { SearchInput } from '@/components/ui/SearchInput';
import { GameIcon } from '@/components/ui/GameIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { GAME_PROFILES, shortGameName } from '@/lib/games';
import { Filter, Shield, Users } from 'lucide-react';

export interface TeamCard {
  id: string;
  name: string;
  slug: string;
  shortCode: string | null;
  logoUrl: string | null;
  /** Game titles this team has a roster for */
  games: string[];
}

export default function TeamsClient({ teams }: { teams: TeamCard[] }) {
  const [query, setQuery] = useState('');
  const [game, setGame] = useState('all');

  const profile = GAME_PROFILES.find((g) => g.id === game);
  const shown = teams.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchesSearch =
      !q || t.name.toLowerCase().includes(q) || (t.shortCode ?? '').toLowerCase().includes(q) || t.games.some((g) => g.toLowerCase().includes(q));
    const matchesGame = game === 'all' || (!!profile?.matches && t.games.some((g) => profile.matches!(g.toLowerCase())));
    return matchesSearch && matchesGame;
  });

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />
      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">Teams</h1>
            <p className="text-sm text-text-muted font-body">Find teams by the game they play.</p>
          </div>
          <div className="w-full md:w-80">
            <SearchInput value={query} onChange={setQuery} placeholder="Search teams or games..." />
          </div>
        </div>

        <div className="glass-strong border border-text-primary/[0.08] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-5 text-xs select-none">
          <div className="flex items-center gap-2 text-text-primary font-display font-bold">
            <Filter className="w-4 h-4 text-accent-glow" />
            <span>Filter By:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Game:</span>
            <div className="flex flex-wrap gap-1 bg-text-primary/[0.03] p-1 rounded-xl border border-text-primary/[0.06]">
              {GAME_PROFILES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGame(g.id)}
                  className={`px-3 py-1 font-display font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    game === g.id
                      ? 'bg-accent-primary text-white font-bold'
                      : 'text-text-muted hover:text-text-primary hover:bg-text-primary/[0.04]'
                  }`}
                >
                  <GameIcon game={g} className="w-3.5 h-3.5" />
                  {g.shortName}
                </button>
              ))}
            </div>
          </div>
          <span className="ml-auto font-data text-text-muted">
            {shown.length} of {teams.length} teams
          </span>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={Users} title="No teams found" description="Try another game or search." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((t) => (
              <Link
                key={t.id}
                href={`/teams/${t.slug}`}
                className="bg-bg-surface border border-border-line hover:border-accent-readout/40 rounded-xl p-4 flex items-center gap-4 transition-colors"
              >
                {t.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.logoUrl} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover border border-border-line shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-bg-void border border-border-line flex items-center justify-center shrink-0 text-text-muted">
                    <Shield className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 space-y-1.5">
                  <p className="font-display font-bold truncate">{t.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.games.length === 0 ? (
                      <span className="text-[10px] text-text-muted">No roster yet</span>
                    ) : (
                      [...new Set(t.games.map(shortGameName))].map((g) => (
                        <span
                          key={g}
                          className="px-2 py-0.5 bg-text-primary/[0.04] border border-text-primary/[0.08] text-[10px] font-display font-semibold text-text-muted tracking-wider uppercase rounded-full"
                        >
                          {g}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
