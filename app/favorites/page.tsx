'use client';

import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { MatchCard } from '@/components/broadcast/match-card';
import { FavoriteStar } from '@/components/broadcast/FavoriteStar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useFavorites } from '@/hooks/useFavorites';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import { Star, Sparkles, X } from 'lucide-react';

export default function FavoritesPage() {
  const { favorites, suggestedFavorites, isFavorite, toggleFavorite } = useFavorites();
  const { groups } = useLiveFeed();

  // Extract starred team and competition IDs
  const starredTeamIds = favorites.filter((f) => f.type === 'team').map((f) => f.id);
  const starredCompIds = favorites.filter((f) => f.type === 'competition').map((f) => f.id);

  // Filter matches involving starred teams or inside starred competitions
  const personalizedMatches = groups
    .flatMap((g) => g.matches)
    .filter((match) => {
      const isTeamMatch =
        (match.homeTeam.id && starredTeamIds.includes(match.homeTeam.id)) ||
        (match.awayTeam.id && starredTeamIds.includes(match.awayTeam.id));

      const isCompMatch = starredCompIds.includes(match.competitionSlug || '');

      return isTeamMatch || isCompMatch;
    });

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="gradient-mesh pointer-events-none" aria-hidden="true">
        <div className="mesh-orb" />
      </div>

      <PublicNav />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8 relative z-10">
        {/* Header */}
        <div className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-favorite/10 border border-accent-favorite/25 text-accent-favorite text-xs font-display font-semibold mb-2">
              <Star className="w-3.5 h-3.5 fill-accent-favorite" />
              <span>CUSTOM WATCHLIST</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Starred Favorites
            </h1>
            <p className="text-sm text-text-muted font-body">
              Personalized live fixtures and updates for your tracked teams and leagues.
            </p>
          </div>
        </div>

        {/* Starred Entities Bar */}
        {favorites.length > 0 && (
          <div className="glass-strong border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-xl backdrop-blur-xl">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">
              Starred Entities ({favorites.length})
            </h2>

            <div className="flex flex-wrap gap-2.5 text-xs font-body">
              {favorites.map((fav) => (
                <div
                  key={`${fav.type}-${fav.id}`}
                  className="px-3.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center gap-2.5 group hover:border-accent-favorite/40 transition-colors shadow-sm"
                >
                  <Star className="w-3.5 h-3.5 text-accent-favorite fill-accent-favorite drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                  <span className="font-semibold text-white">{fav.name}</span>
                  <span className="text-[10px] font-data text-text-muted uppercase bg-white/[0.05] px-2 py-0.5 rounded-full">
                    {fav.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(fav.type, fav.id, fav.name)}
                    className="text-text-muted hover:text-state-loss p-0.5 rounded transition-colors ml-1"
                    aria-label={`Remove ${fav.name} from favorites`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches Feed */}
        <section className="space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h2 className="font-display font-bold text-base text-white">
              Matches Featuring Your Favorites
            </h2>
            <span className="text-xs font-data text-text-muted">
              {personalizedMatches.length} {personalizedMatches.length === 1 ? 'match' : 'matches'}
            </span>
          </div>

          {personalizedMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {personalizedMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  {...m}
                  href={`/competitions/${m.competitionSlug || 'ui-esports-league'}/matches/${m.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="No matches for starred favorites today"
              description="Star teams or leagues across match cards and competition pages to build your live personalized schedule."
              actionLabel="Explore Competitions Registry"
              actionHref="/competitions"
            />
          )}
        </section>

        {/* Smart Suggestions Section */}
        <section className="glass rounded-3xl border border-white/[0.08] p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
            <div className="p-1.5 rounded-lg bg-accent-primary/10 text-accent-glow">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-base text-white">
              Recommended for You
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedFavorites.map((sug) => {
              const active = isFavorite(sug.type, sug.id);

              return (
                <div
                  key={`${sug.type}-${sug.id}`}
                  className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-accent-primary/40 hover:bg-white/[0.04] transition-all duration-200"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-data text-accent-glow uppercase font-bold">
                      <span>{sug.type}</span>
                      <FavoriteStar
                        entityType={sug.type}
                        entityId={sug.id}
                        entityName={sug.name}
                        size="sm"
                      />
                    </div>
                    <h3 className="font-display font-bold text-base text-white leading-snug">
                      {sug.name}
                    </h3>
                    <p className="text-xs text-text-muted font-body leading-relaxed">
                      {sug.reason}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(sug.type, sug.id, sug.name)}
                    className={`w-full py-2.5 rounded-xl text-xs font-display font-semibold tracking-wider flex items-center justify-center gap-2 transition-all focus-ring ${
                      active
                        ? 'bg-accent-favorite/20 text-accent-favorite border border-accent-favorite/40 font-bold'
                        : 'btn-glass text-white hover:border-accent-primary/30'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${active ? 'fill-accent-favorite' : ''}`} />
                    <span>{active ? 'STARRED' : 'ADD TO FAVORITES'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
