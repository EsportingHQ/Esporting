import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Activity,
  Users,
  Shield,
  PlusCircle,
  UserCheck,
  Settings,
  Newspaper,
  AlertTriangle,
  Zap,
} from "lucide-react";

const stats = (
  totalComps: number,
  liveMatches: number,
  totalTeams: number,
  totalUsers: number,
  rateLimitHits: number,
  quotaErrors: number,
) => [
  {
    label: "Competitions",
    value: totalComps,
    icon: Trophy,
    color: "text-accent-readout",
  },
  {
    label: "Live Matches",
    value: liveMatches,
    icon: Activity,
    color: "text-accent-signal",
  },
  {
    label: "Teams",
    value: totalTeams,
    icon: Shield,
    color: "text-state-win",
  },
  {
    label: "Registered Users",
    value: totalUsers,
    icon: Users,
    color: "text-text-muted",
  },
  {
    label: "Rate Limits (24h)",
    value: rateLimitHits,
    icon: Zap,
    color: rateLimitHits > 0 ? "text-accent-alert" : "text-text-muted",
  },
  {
    label: "Quota Errors (24h)",
    value: quotaErrors,
    icon: AlertTriangle,
    color: quotaErrors > 0 ? "text-accent-alert" : "text-text-muted",
  },
];

const actions = [
  {
    label: "API Monitoring",
    href: "/admin/monitoring",
    description:
      "Track PandaScore rate limits, quota usage, and sync metrics in real-time",
    icon: Activity,
  },
  {
    label: "News Desk",
    href: "/admin/news",
    description:
      "Review organiser submissions, publish articles, and manage newsroom content",
    icon: Newspaper,
  },
  {
    label: "Invite Organiser",
    href: "/admin/invites",
    description: "Send invitation credentials to a new tournament organiser",
    icon: PlusCircle,
  },
  {
    label: "Invite Contributor",
    href: "/contributor/new",
    description:
      "Create contributor access scoped to all matches or one competition",
    icon: Users,
  },
  {
    label: "Match Assignments",
    href: "/admin/matches",
    description: "Assign contributors to upcoming and live match rooms",
    icon: Activity,
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    description: "Review operational logs and edit user role mappings",
    icon: UserCheck,
  },
  {
    label: "Game Catalogue",
    href: "/admin/catalogue",
    description: "Add and manage game titles, maps, and supported modes",
    icon: Settings,
  },
];

export default async function AdminPage() {
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
    .is("revoked_at", null)
    .is("comp_instance_id", null);

  const roles =
    (roleData as { roles: { name: string } }[] | null)?.map(
      (r) => r.roles?.name,
    ) ?? [];

  if (!roles.includes("super_admin")) redirect("/dashboard-redirect");

  const [
    { count: totalComps },
    { count: liveMatches },
    { count: totalTeams },
    { count: totalUsers },
    { data: rateLimitData },
    { data: quotaErrorData },
  ] = await Promise.all([
    supabase.from("comp_instances").select("*", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "live"),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("api_quota_logs")
      .select("count")
      .eq("metric_type", "rate_limit")
      .gte("recorded_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("api_quota_logs")
      .select("count")
      .eq("metric_type", "quota_error")
      .gte("recorded_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const rateLimitHits = rateLimitData?.reduce((sum, row) => sum + (row.count || 0), 0) ?? 0;
  const quotaErrors = quotaErrorData?.reduce((sum, row) => sum + (row.count || 0), 0) ?? 0;

  return (
    <div className="space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Platform Overview
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          GLOBAL METRICS MONITOR & ADMINISTRATOR COMMAND DECK
        </p>
      </div>

      {/* Stats Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats(
          totalComps ?? 0,
          liveMatches ?? 0,
          totalTeams ?? 0,
          totalUsers ?? 0,
          rateLimitHits,
          quotaErrors,
        ).map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-bg-surface border border-border-line rounded p-5 space-y-2 relative overflow-hidden"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
                  {stat.label}
                </span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <p className="text-3xl font-data font-black text-text-primary">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-5 transition-all group block"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-accent-readout group-hover:scale-110 transition-transform" />
                  <h4 className="font-display font-black text-base text-text-primary group-hover:text-accent-readout uppercase tracking-wide transition-colors">
                    {action.label}
                  </h4>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
