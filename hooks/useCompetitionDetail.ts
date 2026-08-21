"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCardProps } from "@/components/broadcast/match-card";

export interface CompetitionDetail {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  prize_pool: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  seriesName: string;
}

export interface StandingRow {
  rank: number;
  teamId: string;
  name: string;
  shortCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  pts: number;
}

export interface BRStandingRow {
  rank: number;
  teamId: string | null;
  name: string;
  shortCode: string;
  kills: number;
  placementPts: number;
  killPts: number;
  totalPts: number;
}

export interface ParticipantTeam {
  id: string;
  name: string;
  shortCode: string;
}

export interface StageGroup {
  stageId: string;
  name: string;
  stageType: string;
  stageOrder: number;
  matches: MatchCardProps[];
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

interface RawStageRef {
  name: string;
  stage_type: string;
  stage_order: number;
}

interface RawMatchRow {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  home_maps_won: number | null;
  away_maps_won: number | null;
  best_of: number;
  stage_id: string | null;
  home_team: RawTeamRef | RawTeamRef[] | null;
  away_team: RawTeamRef | RawTeamRef[] | null;
  game_titles:
    | {
        name: string;
        slug: string;
        game_types?: { slug: string } | { slug: string }[] | null;
      }
    | {
        name: string;
        slug: string;
        game_types?: { slug: string } | { slug: string }[] | null;
      }[]
    | null;
  match_scores:
    | { home_current_score: number; away_current_score: number }
    | { home_current_score: number; away_current_score: number }[]
    | null;
  comp_stages: RawStageRef | RawStageRef[] | null;
}

function mapGameType(
  gameTypeSlug: string | undefined,
): "football" | "shooter" | "br" {
  if (gameTypeSlug === "football") return "football";
  if (gameTypeSlug?.includes("br")) return "br";
  return "shooter";
}

function mapTimeLabel(status: string, scheduledAt: string | null): string {
  if (status === "live") return "LIVE NOW";
  if (status === "completed") return "Finished";
  if (status === "delayed") return "Delayed";
  if (status === "scheduled" && scheduledAt) {
    return new Date(scheduledAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return status;
}

function mapRowToCard(
  row: RawMatchRow,
  competitionSlug: string,
): MatchCardProps {
  const home = one(row.home_team);
  const away = one(row.away_team);
  const gameTitle = one(row.game_titles);
  const gameTypeObj = one(gameTitle?.game_types ?? null);
  const scoreRow = one(row.match_scores);

  return {
    id: row.id,
    gameType: mapGameType(gameTypeObj?.slug),
    gameTitle: gameTitle?.name ?? "",
    homeTeam: {
      id: home?.id ?? "",
      name: home?.name ?? "TBD",
      shortCode: home?.short_code ?? "",
    },
    awayTeam: {
      id: away?.id ?? "",
      name: away?.name ?? "TBD",
      shortCode: away?.short_code ?? "",
    },
    homeScore: scoreRow?.home_current_score ?? 0,
    awayScore: scoreRow?.away_current_score ?? 0,
    homeMapsWon: row.home_maps_won ?? undefined,
    awayMapsWon: row.away_maps_won ?? undefined,
    bestOf: row.best_of > 1 ? row.best_of : undefined,
    status: row.status as MatchCardProps["status"],
    timeLabel: mapTimeLabel(row.status, row.scheduled_at),
    competitionSlug,
  };
}

const MATCH_QUERY = `
    id, status, scheduled_at, match_format, home_maps_won, away_maps_won, best_of, stage_id,
    home_team:teams!matches_team_home_id_fkey(id, name, short_code),
    away_team:teams!matches_team_away_id_fkey(id, name, short_code),
    game_titles(name, slug, game_types(slug)),
    match_scores(home_current_score, away_current_score),
    comp_stages(name, stage_type, stage_order)
`;

export function useCompetitionDetail(slug: string) {
  const [competition, setCompetition] = useState<CompetitionDetail | null>(
    null,
  );
  const [participants, setParticipants] = useState<ParticipantTeam[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<MatchCardProps[]>([]);
  const [resultsMatches, setResultsMatches] = useState<MatchCardProps[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [brStandings, setBrStandings] = useState<BRStandingRow[]>([]);
  const [stageGroups, setStageGroups] = useState<StageGroup[]>([]);
  const [isBRFormat, setIsBRFormat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    const supabase = createClient();

    try {
      const { data: instanceRaw, error: instanceErr } = await supabase
        .from("comp_instances")
        .select(
          `
                id, name, slug, format, status, prize_pool, description, starts_at, ends_at,
                comp_series(name)
            `,
        )
        .eq("slug", slug)
        .is("deleted_at", null)
        .single();

      if (instanceErr || !instanceRaw) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      const seriesName =
        one(
          instanceRaw.comp_series as
            { name: string } | { name: string }[] | null,
        )?.name ?? "";

      const instance: CompetitionDetail = {
        id: instanceRaw.id,
        name: instanceRaw.name,
        slug: instanceRaw.slug,
        format: instanceRaw.format,
        status: instanceRaw.status,
        prize_pool: instanceRaw.prize_pool,
        description: instanceRaw.description,
        starts_at: instanceRaw.starts_at,
        ends_at: instanceRaw.ends_at,
        seriesName,
      };
      setCompetition(instance);

      const isBR = instance.format === "ranking";
      setIsBRFormat(isBR);

      const { data: regs } = await supabase
        .from("comp_registrations")
        .select("teams(id, name, short_code)")
        .eq("comp_instance_id", instance.id)
        .eq("status", "approved");

      const teams: ParticipantTeam[] = (regs ?? [])
        .map(
          (r: {
            teams:
              | { id: string; name: string; short_code: string | null }
              | { id: string; name: string; short_code: string | null }[]
              | null;
          }) => one(r.teams),
        )
        .filter(Boolean)
        .map((t) => ({
          id: t!.id,
          name: t!.name,
          shortCode: t!.short_code ?? "",
        }));
      setParticipants(teams);

      const { data: matchesRaw } = await supabase
        .from("matches")
        .select(MATCH_QUERY)
        .eq("comp_instance_id", instance.id)
        .is("deleted_at", null)
        .order("scheduled_at", { ascending: true, nullsFirst: false });

      const rows = (matchesRaw ?? []) as unknown as RawMatchRow[];

      const upcoming = rows.filter((r) =>
        ["scheduled", "delayed", "live"].includes(r.status),
      );
      const completed = rows.filter((r) => r.status === "completed");

      setScheduleMatches(upcoming.map((r) => mapRowToCard(r, slug)));
      setResultsMatches(completed.map((r) => mapRowToCard(r, slug)));

      // Group matches by stage (Final, Semi-Final, Group A, etc.) — used
      // as the standings-tab fallback when no computed league standings
      // exist, which is always true for PandaScore-synced knockouts since
      // the `standings` table is only populated for organiser leagues.
      const stageMap = new Map<string, StageGroup>();
      for (const row of rows) {
        if (!row.stage_id) continue;
        const stage = one(row.comp_stages);
        if (!stage) continue;

        if (!stageMap.has(row.stage_id)) {
          stageMap.set(row.stage_id, {
            stageId: row.stage_id,
            name: stage.name,
            stageType: stage.stage_type,
            stageOrder: stage.stage_order,
            matches: [],
          });
        }
        stageMap.get(row.stage_id)!.matches.push(mapRowToCard(row, slug));
      }
      setStageGroups(
        Array.from(stageMap.values()).sort(
          (a, b) => a.stageOrder - b.stageOrder,
        ),
      );

      if (isBR) {
        const { data: brRows } = await supabase
          .from("br_match_results")
          .select(
            `
                    kills, placement_pts, kill_pts, total_pts,
                    match_participants!inner(team_id, match_id, teams(id, name, short_code)),
                    matches!br_match_results_match_id_fkey(comp_instance_id)
                `,
          )
          .eq("matches.comp_instance_id", instance.id);

        const totalsByTeam = new Map<string, BRStandingRow>();

        for (const row of (brRows ?? []) as unknown as {
          kills: number;
          placement_pts: number;
          kill_pts: number;
          total_pts: number;
          match_participants:
            | {
                team_id: string | null;
                teams:
                  | { id: string; name: string; short_code: string | null }
                  | { id: string; name: string; short_code: string | null }[]
                  | null;
              }
            | {
                team_id: string | null;
                teams:
                  | { id: string; name: string; short_code: string | null }
                  | { id: string; name: string; short_code: string | null }[]
                  | null;
              }[]
            | null;
        }[]) {
          const participant = one(row.match_participants);
          const team = one(participant?.teams ?? null);
          const key = team?.id ?? participant?.team_id ?? "unknown";

          const existing = totalsByTeam.get(key);
          if (existing) {
            existing.kills += row.kills;
            existing.placementPts += row.placement_pts;
            existing.killPts += row.kill_pts;
            existing.totalPts += row.total_pts;
          } else {
            totalsByTeam.set(key, {
              rank: 0,
              teamId: team?.id ?? null,
              name: team?.name ?? "Unknown",
              shortCode: team?.short_code ?? "",
              kills: row.kills,
              placementPts: row.placement_pts,
              killPts: row.kill_pts,
              totalPts: row.total_pts,
            });
          }
        }

        const sorted = Array.from(totalsByTeam.values())
          .sort((a, b) => b.totalPts - a.totalPts)
          .map((row, i) => ({ ...row, rank: i + 1 }));

        setBrStandings(sorted);
      } else {
        const { data: stageRows } = await supabase
          .from("comp_stages")
          .select("id")
          .eq("comp_instance_id", instance.id);

        const stageIds = (stageRows ?? []).map((s: { id: string }) => s.id);

        const { data: realStandings } = stageIds.length
          ? await supabase
              .from("standings")
              .select(
                "rank, played, wins, draws, losses, score_diff, points, teams(id, name, short_code)",
              )
              .in("stage_id", stageIds)
              .order("rank", { ascending: true })
          : { data: [] };

        const mapped: StandingRow[] = (
          (realStandings ?? []) as unknown as {
            rank: number | null;
            played: number;
            wins: number;
            draws: number;
            losses: number;
            score_diff: number;
            points: number;
            teams:
              | { id: string; name: string; short_code: string | null }
              | { id: string; name: string; short_code: string | null }[]
              | null;
          }[]
        ).map((row, i) => {
          const team = one(row.teams);
          return {
            rank: row.rank ?? i + 1,
            teamId: team?.id ?? "",
            name: team?.name ?? "Unknown",
            shortCode: team?.short_code ?? "",
            played: row.played,
            won: row.wins,
            drawn: row.draws,
            lost: row.losses,
            gd: row.score_diff,
            pts: row.points,
          };
        });

        setStandings(mapped);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    Promise.resolve().then(() => load());
  }, [load]);

  return {
    competition,
    participants,
    scheduleMatches,
    resultsMatches,
    standings,
    brStandings,
    stageGroups,
    isBRFormat,
    isLoading,
    error,
    notFound,
  };
}
