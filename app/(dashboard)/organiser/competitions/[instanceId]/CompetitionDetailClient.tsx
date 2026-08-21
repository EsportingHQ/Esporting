"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  // Plus,
  // Users,
  Award,
  // Calendar,
  Layers,
  // Shield,
} from "lucide-react";
import ScheduleMatchTab from "./ScheduleMatchTab";
import TeamRosterPanel from "./TeamRosterPanel";

type GameTitleWrap = {
  game_titles: {
    id: string;
    name: string;
    slug: string;
    game_types: { slug: string } | null;
  } | null;
};
type Stage = {
  id: string;
  name: string;
  stage_type: string;
  stage_order: number;
  best_of: number;
  game_title_id: string | null;
};
export type Registration = {
  id: string;
  status: string;
  registered_at: string;
  teams: {
    id: string;
    name: string;
    short_code: string | null;
    country: string | null;
  } | null;
};
type TeamOption = { id: string; name: string };
type Match = {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  game_titles: { name: string }[] | null;
  home_team: { name: string }[] | null;
  away_team: { name: string }[] | null;
};
type Instance = {
  id: string;
  name: string;
  slug: string;
  edition_label: string | null;
  format: string;
  status: string;
  prize_pool: string | null;
  description: string | null;
  comp_series: { name: string }[] | null;
};

type Props = {
  instance: Instance;
  gameTitles: GameTitleWrap[];
  stages: Stage[];
  registrations: Registration[];
  allTeams: TeamOption[];
  matches: Match[];
  rosters: {
    team_id: string;
    players:
      | { id: string; gamertag: string }
      | { id: string; gamertag: string }[]
      | null;
  }[];
  assignments: {
    team_id: string;
    player_id: string;
    game_title_id: string;
  }[];
};

export default function CompetitionDetailClient({
  instance,
  gameTitles,
  stages,
  registrations,
  allTeams,
  matches,
  rosters,
  assignments,
}: Props) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<
    "teams" | "matches" | "stages" | "schedule"
  >("teams");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamMode, setTeamMode] = useState<"new" | "existing">("new");
  const [teamId, setTeamId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamShortCode, setTeamShortCode] = useState("");
  const [teamCountry, setTeamCountry] = useState("NG");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localRegistrations, setLocalRegistrations] = useState(registrations);

  async function handleRegisterTeam() {
    setError(null);
    if (teamMode === "new" && !teamName) {
      setError("Team name is required");
      return;
    }
    if (teamMode === "existing" && !teamId) {
      setError("Select a team");
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Session expired");

      const body: Record<string, unknown> = {
        comp_instance_id: instance.id,
      };
      if (teamMode === "new") {
        body.team_name = teamName;
        body.team_short_code = teamShortCode || null;
        body.team_country = teamCountry || null;
      } else {
        body.team_id = teamId;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-team`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to register team");

      const { data: fresh } = await supabase
        .from("comp_registrations")
        .select(
          "id, status, registered_at, teams(id, name, short_code, country)",
        )
        .eq("comp_instance_id", instance.id)
        .order("registered_at", { ascending: false });

      setLocalRegistrations((fresh as unknown as Registration[]) ?? []);
      setShowAddTeam(false);
      setTeamName("");
      setTeamShortCode("");
      setTeamId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function getTeamName(
    team: { name: string }[] | { name: string } | null,
  ): string {
    if (!team) return "TBD";
    return Array.isArray(team) ? (team[0]?.name ?? "TBD") : team.name;
  }

  function getGameTitleName(
    game: { name: string }[] | { name: string } | null,
  ): string {
    if (!game) return "";
    return Array.isArray(game) ? (game[0]?.name ?? "") : game.name;
  }

  const seriesName = instance.comp_series?.[0]?.name;

  return (
    <div className="max-w-4xl space-y-6 font-body">
      {/* Header Panel */}
      <div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
        <div>
          <span className="text-[10px] font-data text-text-muted uppercase tracking-wider block">
            {seriesName}
          </span>
          <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase mt-1">
            {instance.name}
          </h2>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-data text-text-muted">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            <span className="uppercase">{instance.format}</span>
          </span>
          <span>·</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
              instance.status === "ongoing"
                ? "bg-state-win/10 text-state-win border border-state-win/30"
                : "bg-bg-void text-text-muted border border-border-line"
            }`}
          >
            {instance.status}
          </span>
          {instance.prize_pool && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 text-accent-readout font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>{instance.prize_pool}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {gameTitles.map((g, i) => (
            <span
              key={i}
              className="text-[10px] font-display font-bold bg-bg-void border border-border-line text-text-primary px-2 py-0.5 rounded uppercase"
            >
              {g.game_titles?.name}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-state-loss/10 border border-state-loss/30 text-state-loss px-4 py-3 rounded text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border-line gap-2">
        {(["teams", "schedule", "matches", "stages"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`bg-transparent border-none border-b-2 px-4 py-2 text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === tab
                ? "border-accent-readout text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            {tab}
            {tab === "teams" && ` (${localRegistrations.length})`}
            {tab === "matches" && ` (${matches.length})`}
            {tab === "stages" && ` (${stages.length})`}
          </button>
        ))}
      </div>

      {/* Teams tab */}
      <div className={activeTab === "teams" ? "space-y-4" : "hidden"}>
        <div className="flex justify-between items-center">
          <h3 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
            Registered Teams
          </h3>
          <button
            onClick={() => setShowAddTeam((s) => !s)}
            className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer"
          >
            {showAddTeam ? "Cancel" : "+ Register Team"}
          </button>
        </div>

        {showAddTeam && (
          <div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTeamMode("new")}
                className={`px-3 py-1 rounded text-xs font-display font-bold uppercase border transition-colors ${
                  teamMode === "new"
                    ? "bg-accent-readout border-accent-readout text-bg-void"
                    : "bg-bg-void border-border-line text-text-muted hover:text-text-primary"
                }`}
              >
                New Team
              </button>
              <button
                type="button"
                onClick={() => setTeamMode("existing")}
                className={`px-3 py-1 rounded text-xs font-display font-bold uppercase border transition-colors ${
                  teamMode === "existing"
                    ? "bg-accent-readout border-accent-readout text-bg-void"
                    : "bg-bg-void border-border-line text-text-muted hover:text-text-primary"
                }`}
              >
                Existing Team
              </button>
            </div>

            {teamMode === "new" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  placeholder="Team name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors md:col-span-2"
                />
                <input
                  placeholder="Short code"
                  value={teamShortCode}
                  onChange={(e) => setTeamShortCode(e.target.value)}
                  className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
                />
                <input
                  placeholder="Country"
                  value={teamCountry}
                  onChange={(e) => setTeamCountry(e.target.value)}
                  className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
                />
              </div>
            ) : (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors"
              >
                <option value="">Select a team</option>
                {allTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              disabled={loading}
              onClick={handleRegisterTeam}
              className="bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-50 text-bg-void font-display font-black text-xs uppercase tracking-widest px-4 py-2 rounded transition-all cursor-pointer"
            >
              {loading ? "REGISTERING..." : "REGISTER TEAM"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {localRegistrations.length === 0 && (
            <p className="text-xs text-text-muted italic">
              No teams registered yet.
            </p>
          )}
          {localRegistrations.map((reg) => (
            <div
              key={reg.id}
              className="bg-bg-surface border border-border-line rounded p-4 space-y-3 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-sm text-text-primary uppercase">
                  {reg.teams?.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${
                    reg.status === "approved"
                      ? "bg-state-win/10 text-state-win"
                      : "bg-bg-void text-text-muted"
                  }`}
                >
                  {reg.status}
                </span>
              </div>

              {reg.teams && (
                <TeamRosterPanel
                  teamId={reg.teams.id}
                  compInstanceId={instance.id}
                  gameTitles={gameTitles
                    .map((g) => g.game_titles!)
                    .filter(Boolean)}
                  initialRoster={
                    rosters
                      .filter((r) => r.team_id === reg.teams!.id)
                      .map((r) =>
                        Array.isArray(r.players) ? r.players[0] : r.players,
                      )
                      .filter(Boolean) as {
                      id: string;
                      gamertag: string;
                    }[]
                  }
                  initialAssignments={assignments.filter(
                    (a) => a.team_id === reg.teams!.id,
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Schedule tab — reinstated from our branch, dev didn't have this */}
      {activeTab === "schedule" && (
        <ScheduleMatchTab
          instanceId={instance.id}
          stages={stages}
          registeredTeams={
            localRegistrations.map((r) => r.teams).filter(Boolean) as {
              id: string;
              name: string;
            }[]
          }
          gameTitles={
            gameTitles
              .map((g) =>
                g.game_titles
                  ? {
                      id: g.game_titles.id,
                      name: g.game_titles.name,
                      slug: g.game_titles.slug,
                      game_type_slug: g.game_titles.game_types?.slug ?? "",
                    }
                  : null,
              )
              .filter(Boolean) as {
              id: string;
              name: string;
              slug: string;
              game_type_slug: string;
            }[]
          }
          matches={matches}
        />
      )}

      {/* Matches tab */}
      {activeTab === "matches" && (
        <div className="space-y-2">
          {matches.length === 0 && (
            <p className="text-xs text-text-muted italic">
              No matches scheduled yet.
            </p>
          )}
          {matches.map((m) => (
            <div
              key={m.id}
              className="bg-bg-surface border border-border-line rounded p-4 space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
                  {m.match_format === "head_to_head"
                    ? `${getTeamName(m.home_team)} vs ${getTeamName(m.away_team)}`
                    : "Battle Royale Match"}
                </span>
                <span className="font-data text-text-muted">
                  {getGameTitleName(m.game_titles)}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider inline-block ${
                  m.status === "live"
                    ? "bg-state-win/10 text-state-win"
                    : "bg-bg-void text-text-muted border border-border-line"
                }`}
              >
                {m.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stages tab */}
      {activeTab === "stages" && (
        <div className="space-y-2">
          {stages.map((s) => (
            <div
              key={s.id}
              className="bg-bg-surface border border-border-line rounded p-4 flex justify-between items-center text-xs"
            >
              <span className="font-display font-bold text-sm text-text-primary uppercase">
                {s.stage_order}. {s.name}
              </span>
              <span className="font-data text-text-muted uppercase">
                {s.stage_type} · BO{s.best_of}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
