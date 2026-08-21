"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCardProps } from "@/components/broadcast/match-card";

export interface TeamDetail {
  id: string;
  name: string;
  slug: string;
  shortCode: string;
}

export interface TeamPlayer {
  id: string;
  name: string;
  role: string;
  game: string;
}

export interface TeamCompetition {
  name: string;
  slug: string;
  status: string;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

interface RawTeamRef {
  id: string;
  name: string;
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

export function useTeamDetail(slug: string) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [roster, setRoster] = useState<TeamPlayer[]>([]);
  const [activeComps, setActiveComps] = useState<TeamCompetition[]>([]);
  const [lastResults, setLastResults] = useState<MatchCardProps[]>([]);
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
        const { data: teamRow, error: teamErr } = await supabase
          .from("teams")
          .select("id, name, slug, short_code")
          .eq("slug", slug)
          .single();

        if (teamErr || !teamRow) {
          setNotFound(true);
          return;
        }

        setTeam({
          id: teamRow.id,
          name: teamRow.name,
          slug: teamRow.slug,
          shortCode: teamRow.short_code ?? "",
        });

        // Players
        const { data: players } = await supabase
          .from("players")
          .select("id, gamer_tag, primary_role")
          .eq("team_id", teamRow.id);

        setRoster(
          (players ?? []).map((p) => ({
            id: p.id,
            name: p.gamer_tag,
            role: p.primary_role ?? "Player",
            game: "Esports",
          })),
        );

        // Active competitions
        const { data: regs } = await supabase
          .from("comp_registrations")
          .select("comp_instances(name, slug, status)")
          .eq("team_id", teamRow.id)
          .eq("status", "approved");

        setActiveComps(
          (regs ?? [])
            .map(
              (r: {
                comp_instances:
                  | { name: string; slug: string; status: string }
                  | { name: string; slug: string; status: string }[]
                  | null;
              }) => one(r.comp_instances),
            )
            .filter(Boolean)
            .map((c) => ({
              name: c!.name,
              slug: c!.slug,
              status: c!.status,
            })),
        );

        // Recent matches
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
          .or(`team_home_id.eq.${teamRow.id},team_away_id.eq.${teamRow.id}`)
          .eq("status", "completed")
          .order("scheduled_at", { ascending: false })
          .limit(10);

        setLastResults(
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
            status: "completed",
            timeLabel: m.scheduled_at
              ? new Date(m.scheduled_at).toLocaleDateString()
              : "Finished",
          })),
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load team"));
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [slug]);

  return {
    team,
    roster,
    activeComps,
    lastResults,
    isLoading,
    notFound,
    error,
  };
}
