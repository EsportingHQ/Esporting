"use client";

import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { MatchCard } from "@/components/broadcast/match-card";
import { FavoriteStar } from "@/components/broadcast/FavoriteStar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { Star, Trophy, Sparkles, Plus, ArrowRight } from "lucide-react";

export default function FavoritesPage() {
  const { favorites, suggestedFavorites, isFavorite, toggleFavorite } =
    useFavorites();
  const { groups, isLoading } = useLiveFeed();

  // Extract starred team and competition IDs
  const starredTeamIds = favorites
    .filter((f) => f.type === "team")
    .map((f) => f.id);
  const starredCompIds = favorites
    .filter((f) => f.type === "competition")
    .map((f) => f.id);

  // Filter matches involving starred teams or inside starred competitions
  const personalizedMatches = groups
    .flatMap((g) => g.matches)
    .filter((match) => {
      const isTeamMatch =
        (match.homeTeam.id && starredTeamIds.includes(match.homeTeam.id)) ||
        (match.awayTeam.id && starredTeamIds.includes(match.awayTeam.id));

      const isCompMatch = starredCompIds.includes(match.competitionSlug || "");

      return isTeamMatch || isCompMatch;
    });

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        {/* Header */}
        <div className="border-b border-border-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-accent-favorite fill-accent-favorite" />
              <h1 className="font-display font-black text-3xl tracking-wider uppercase">
                YOUR FAVORITES FEED
              </h1>
            </div>
            <p className="text-xs text-text-muted font-data mt-1">
              PERSONALIZED MATCH SCHEDULE AND STANDINGS FOR STARRED SQUADS AND
              LEAGUES
            </p>
          </div>
        </div>

        {/* Starred Entities Bar */}
        {favorites.length > 0 && (
          <div className="bg-bg-surface border border-border-line rounded p-4 space-y-3">
            <h2 className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">
              STARRED ENTITIES ({favorites.length})
            </h2>

            <div className="flex flex-wrap gap-2 text-xs font-body">
              {favorites.map((fav) => (
                <div
                  key={`${fav.type}-${fav.id}`}
                  className="px-3 py-1.5 bg-bg-void border border-border-line rounded flex items-center gap-2 group"
                >
                  <Star className="w-3.5 h-3.5 text-accent-favorite fill-accent-favorite" />
                  <span className="font-semibold text-text-primary">
                    {fav.name}
                  </span>
                  <span className="text-[9px] font-data text-text-muted uppercase bg-bg-surface px-1.5 rounded">
                    {fav.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(fav.type, fav.id, fav.name)}
                    className="text-text-muted hover:text-state-alert text-xs ml-1"
                    aria-label={`Remove ${fav.name} from favorites`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches Feed */}
        <section className="space-y-4">
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-text-primary border-b border-border-line pb-2">
            MATCHES FEATURING YOUR FAVORITES
          </h2>

          {personalizedMatches.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {personalizedMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  {...m}
                  href={`/competitions/${m.competitionSlug || "ui-esports-league"}/matches/${m.id}`}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="NO MATCHES FOR STARRED FAVORITES TODAY"
              description="Star teams or leagues by clicking the star icon on match cards and competition pages to see their personalized live schedule."
              actionLabel="EXPLORE COMPETITIONS REGISTRY"
              actionHref="/competitions"
            />
          )}
        </section>

        {/* Smart Suggestions Section */}
        <section className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border-line pb-2">
            <Sparkles className="w-4 h-4 text-accent-readout" />
            <h2 className="font-display font-bold text-sm uppercase tracking-wider">
              RECOMMENDED FOR YOU (BASED ON YOUR REGION & TIMEZONE)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedFavorites.map((sug) => {
              const active = isFavorite(sug.type, sug.id);

              return (
                <div
                  key={`${sug.type}-${sug.id}`}
                  className="bg-bg-void border border-border-line rounded p-4 flex flex-col justify-between space-y-3 hover:border-accent-readout/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-data text-accent-readout uppercase font-bold">
                      <span>{sug.type}</span>
                      <FavoriteStar
                        entityType={sug.type}
                        entityId={sug.id}
                        entityName={sug.name}
                        size="sm"
                      />
                    </div>
                    <h3 className="font-display font-bold text-sm text-text-primary uppercase leading-tight">
                      {sug.name}
                    </h3>
                    <p className="text-[11px] text-text-muted font-body leading-relaxed">
                      {sug.reason}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFavorite(sug.type, sug.id, sug.name)}
                    className={`w-full py-1.5 rounded text-xs font-display font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all focus-ring ${
                      active
                        ? "bg-accent-favorite/20 text-accent-favorite border border-accent-favorite/40"
                        : "bg-bg-surface hover:bg-bg-surface/80 border border-border-line text-text-muted hover:text-text-primary"
                    }`}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${active ? "fill-accent-favorite" : ""}`}
                    />
                    <span>{active ? "STARRED" : "ADD TO FAVORITES"}</span>
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
