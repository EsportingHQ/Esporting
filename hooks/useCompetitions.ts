"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface CompetitionGameTitle {
  name: string;
  slug: string;
  gameTypeSlug: string;
}

export interface CompetitionListItem {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  prizePool: string | null;
  startDate: string | null;
  seriesName: string;
  gameTitles: CompetitionGameTitle[];
  teamCount: number;
  liveMatchesCount: number;
}

export interface GameTitleOption {
  id: string;
  name: string;
  slug: string;
  gameTypeSlug: string;
  gameTypeName: string;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

type RawGameTitleRow = {
  id: string;
  name: string;
  slug: string;
  game_types:
    { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type RawCompRow = {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  prize_pool: string | null;
  starts_at: string | null;
  comp_series: { name: string } | { name: string }[] | null;
  comp_game_titles:
    | {
        game_titles:
          | {
              name: string;
              slug: string;
              game_types: { slug: string } | { slug: string }[] | null;
            }
          | {
              name: string;
              slug: string;
              game_types: { slug: string } | { slug: string }[] | null;
            }[]
          | null;
      }[]
    | null;
};

export function useCompetitions() {
  const [competitions, setCompetitions] = useState<CompetitionListItem[]>([]);
  const [gameTitleOptions, setGameTitleOptions] = useState<GameTitleOption[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: gameTitlesRaw, error: gtErr } = await supabase
        .from("game_titles")
        .select("id, name, slug, game_types(name, slug)")
        .eq("is_active", true)
        .order("name");

      if (gtErr) throw gtErr;

      const gameTitles: GameTitleOption[] = (
        (gameTitlesRaw ?? []) as RawGameTitleRow[]
      ).map((g) => {
        const gt = one(g.game_types);
        return {
          id: g.id,
          name: g.name,
          slug: g.slug,
          gameTypeSlug: gt?.slug ?? "",
          gameTypeName: gt?.name ?? "",
        };
      });
      setGameTitleOptions(gameTitles);

      const { data: compsRaw, error: compErr } = await supabase
        .from("comp_instances")
        .select(
          `
          id, name, slug, format, status, prize_pool, starts_at,
          comp_series(name),
          comp_game_titles(game_titles(name, slug, game_types(slug)))
        `,
        )
        .is("deleted_at", null)
        .neq("status", "draft")
        .order("starts_at", { ascending: false, nullsFirst: false });

      if (compErr) throw compErr;

      const compRows = (compsRaw ?? []) as unknown as RawCompRow[];
      const compIds = compRows.map((c) => c.id);

      const [{ data: regCounts }, { data: liveCounts }] = await Promise.all([
        compIds.length
          ? supabase
              .from("comp_registrations")
              .select("comp_instance_id")
              .eq("status", "approved")
              .in("comp_instance_id", compIds)
          : Promise.resolve({ data: [] as { comp_instance_id: string }[] }),
        compIds.length
          ? supabase
              .from("matches")
              .select("comp_instance_id")
              .eq("status", "live")
              .in("comp_instance_id", compIds)
          : Promise.resolve({ data: [] as { comp_instance_id: string }[] }),
      ]);

      const teamCountMap = new Map<string, number>();
      for (const r of regCounts ?? []) {
        teamCountMap.set(
          r.comp_instance_id,
          (teamCountMap.get(r.comp_instance_id) ?? 0) + 1,
        );
      }
      const liveCountMap = new Map<string, number>();
      for (const r of liveCounts ?? []) {
        liveCountMap.set(
          r.comp_instance_id,
          (liveCountMap.get(r.comp_instance_id) ?? 0) + 1,
        );
      }

      const mapped: CompetitionListItem[] = compRows.map((c) => {
        const gameTitlesForComp = (c.comp_game_titles ?? [])
          .map((link) => one(link.game_titles))
          .filter((gt): gt is NonNullable<typeof gt> => Boolean(gt))
          .map((gt) => ({
            name: gt.name,
            slug: gt.slug,
            gameTypeSlug: one(gt.game_types)?.slug ?? "",
          }));

        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          format: c.format,
          status: c.status,
          prizePool: c.prize_pool,
          startDate: c.starts_at,
          seriesName: one(c.comp_series)?.name ?? "",
          gameTitles: gameTitlesForComp,
          teamCount: teamCountMap.get(c.id) ?? 0,
          liveMatchesCount: liveCountMap.get(c.id) ?? 0,
        };
      });

      setCompetitions(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load competitions"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  return { competitions, gameTitleOptions, isLoading, error, refetch: load };
}
