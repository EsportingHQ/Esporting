"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCardProps } from "@/components/broadcast/match-card";

export interface PlayerDetail {
  id: string;
  username: string;
  displayName: string;
  teamName: string | null;
  teamSlug: string | null;
  avatarUrl: string | null;
  bio: string | null;
  stats: { label: string; value: string }[];
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface RawTeamRef {
  id: string;
  name: string;
  slug: string;
  short_code: string | null;
}

interface RawRecentMatch {
  id: string;
  status: string;
  scheduled_at: string | null;
  home_maps_won: number | null;
  away_maps_won: number | null;
  best_of: number;
  home_team: RawTeamRef | RawTeamRef[] | null;
  away_team: RawTeamRef | RawTeamRef[] | null;
  game_titles: { name: string } | { name: string }[] | null;
  match_scores:
    | { home_current_score: number; away_current_score: number }
    | { home_current_score: number; away_current_score: number }[]
    | null;
}

export function usePlayerDetail(id: string) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const { data: playerRow, error: playerErr } = await supabase
          .from("players")
          .select(
            `
                id,
                gamertag,
                real_name,
                avatar_url
            `,
          )
          .eq("id", id)
          .single();

        if (playerErr || !playerRow) {
          setNotFound(true);
          return;
        }

        // Basic derived stats from match participation
        const { data: participationRows } = await supabase
          .from("lineups")
          .select("match_id")
          .eq("player_id", playerRow.id);

        const matchIds = Array.from(
          new Set((participationRows ?? []).map((r) => r.match_id)),
        );

        setPlayer({
          id: playerRow.id,
          username: playerRow.gamertag,
          displayName: playerRow.real_name ?? playerRow.gamertag,
          teamName: null,
          teamSlug: null,
          avatarUrl: playerRow.avatar_url,
          bio: null,
          stats: [
            {
              label: "MATCHES PLAYED",
              value: String(matchIds.length),
            },
          ],
        });

        if (matchIds.length === 0) {
          setRecentMatches([]);
          return;
        }

        const { data: matches } = await supabase
          .from("matches")
          .select(
            `
            id, status, scheduled_at, home_maps_won, away_maps_won, best_of,
            home_team:teams!matches_team_home_id_fkey(id, name, short_code),
            away_team:teams!matches_team_away_id_fkey(id, name, short_code),
            game_titles(name),
            match_scores(home_current_score, away_current_score)
          `,
          )
          .in("id", matchIds)
          .order("scheduled_at", { ascending: false })
          .limit(10);

        setRecentMatches(
          ((matches ?? []) as RawRecentMatch[]).map((m) => ({
            id: m.id,
            gameType: "shooter",
            gameTitle: one(m.game_titles)?.name ?? "Match",
            homeTeam: {
              id: one(m.home_team)?.id ?? "",
              name: one(m.home_team)?.name ?? "TBD",
              shortCode: one(m.home_team)?.short_code ?? "",
            },
            awayTeam: {
              id: one(m.away_team)?.id ?? "",
              name: one(m.away_team)?.name ?? "TBD",
              shortCode: one(m.away_team)?.short_code ?? "",
            },
            homeScore: one(m.match_scores)?.home_current_score ?? 0,
            awayScore: one(m.match_scores)?.away_current_score ?? 0,
            homeMapsWon: m.home_maps_won ?? undefined,
            awayMapsWon: m.away_maps_won ?? undefined,
            bestOf: m.best_of > 1 ? m.best_of : undefined,
            status: m.status as MatchCardProps["status"],
            timeLabel: m.scheduled_at
              ? new Date(m.scheduled_at).toLocaleDateString()
              : "Match",
          })),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load player"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [id]);

  return {
    player,
    recentMatches,
    isLoading,
    notFound,
    error,
  };
}
