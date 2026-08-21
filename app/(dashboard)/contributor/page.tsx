import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TallyLight } from "@/components/broadcast/tally-light";
import { Clock, Shield, Flame } from "lucide-react";

type GameTitle = { name: string; slug: string }[];
type Team = { name: string; short_code: string }[];
type CompInstance = { name: string }[];

type Match = {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  game_titles: GameTitle | null;
  home_team: Team | null;
  away_team: Team | null;
  comp_instances: CompInstance | null;
};

function getTeamName(
  team: { name: string }[] | { name: string } | null,
): string {
  if (!team) return "TBD";
  return Array.isArray(team) ? (team[0]?.name ?? "TBD") : team.name;
}

function getGameTitleName(
  game:
    { name: string; slug: string }[] | { name: string; slug: string } | null,
): string {
  if (!game) return "";
  return Array.isArray(game) ? (game[0]?.name ?? "") : game.name;
}

function getCompInstanceName(
  comp: { name: string }[] | { name: string } | null,
): string {
  if (!comp) return "";
  return Array.isArray(comp) ? (comp[0]?.name ?? "") : comp.name;
}

export default async function ContributorPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleData } = await supabase
    .from("user_role_assignments")
    .select("roles(name)")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const roles =
    (roleData as { roles: { name: string } }[] | null)?.map(
      (r) => r.roles?.name,
    ) ?? [];

  const canAccess =
    roles.includes("super_admin") || roles.includes("contributor");
  if (!canAccess) redirect("/dashboard-redirect");

  const { data: rawMatches } = await supabase
    .from("matches")
    .select(
      `
        id, status, scheduled_at, match_format,
        game_titles(name, slug),
        home_team:teams!matches_team_home_id_fkey(name, short_code),
        away_team:teams!matches_team_away_id_fkey(name, short_code),
        comp_instances(name)
      `,
    )
    .eq("contrib_id", user.id)
    .not("status", "in", '("completed","cancelled")')
    .order("scheduled_at", { ascending: true });

  const matches = (rawMatches ?? []) as unknown as Match[];

  return (
    <div className="space-y-6 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Assigned Matches
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          CONTRIBUTOR LIVE TRANSMISSION DUTY ROSTER
        </p>
      </div>

      {matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((match) => (
            <Link
              key={match.id}
              href={`/contributor/matches/${match.id}`}
              className="block bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-5 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-data text-text-muted uppercase tracking-wider block">
                    {getCompInstanceName(match.comp_instances)}
                  </span>
                  <h4 className="font-display font-black text-lg text-text-primary group-hover:text-accent-readout uppercase tracking-wide mt-1 transition-colors">
                    {match.match_format === "head_to_head" ? (
                      <>
                        <span>{getTeamName(match.home_team)}</span>
                        <span className="text-text-muted mx-2 font-body font-normal lowercase">
                          vs
                        </span>
                        <span>{getTeamName(match.away_team)}</span>
                      </>
                    ) : (
                      <span>Battle Royale Ingest</span>
                    )}
                  </h4>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${
                    match.status === "live"
                      ? "bg-state-win/10 text-state-win border border-state-win/30"
                      : match.status === "delayed"
                        ? "bg-state-alert/10 text-state-alert border border-state-alert/30"
                        : "bg-bg-void text-text-muted border border-border-line"
                  }`}
                >
                  {match.status === "live" && <TallyLight size="sm" />}
                  <span>{match.status}</span>
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-3 mt-3">
                <span className="flex items-center gap-1.5 uppercase">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{getGameTitleName(match.game_titles)}</span>
                </span>
                {match.scheduled_at && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {new Date(match.scheduled_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-line rounded p-12 text-center max-w-xl mx-auto space-y-4">
          <Flame className="w-10 h-10 mx-auto text-text-muted/40" />
          <div className="space-y-1">
            <p className="font-display font-bold text-base text-text-primary uppercase tracking-wide">
              No active assignments
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
              No matches are currently assigned to you for event logging.
              Contact your administrator or organiser to receive match
              transmission duties.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
