import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminMatchesClient from "./AdminMatchesClient";

export default async function AdminMatchesPage() {
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

  // Fetch all matches, unassigned first, then by scheduled date
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
            id, status, scheduled_at, match_format, contrib_id, comp_instance_id,
            game_titles(name),
            comp_instances(name),
            home_team:teams!matches_team_home_id_fkey(name),
            away_team:teams!matches_team_away_id_fkey(name)
            `,
    )
    .is("deleted_at", null)
    .not("status", "in", '("completed","cancelled")')
    .is("external_source", null)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  // Fetch the contributor role ID
  const { data: contributorRole } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "contributor")
    .single();

  // Fetch all users with contributor role, including their scope
  const { data: contributorAssignments } = await supabase
    .from("user_role_assignments")
    .select(
      "user_id, comp_instance_id, profiles!user_role_assignments_user_id_fkey(username, display_name)",
    )
    .eq("role_id", contributorRole?.id ?? 0)
    .is("revoked_at", null);

  const contributors = (
    (contributorAssignments ?? []) as unknown as {
      user_id: string;
      comp_instance_id: string | null;
      profiles: { username: string; display_name: string | null } | null;
    }[]
  ).map((c) => ({
    id: c.user_id,
    name: c.profiles?.display_name ?? c.profiles?.username ?? "Unknown",
    comp_instance_id: c.comp_instance_id,
  }));

  return (
    <AdminMatchesClient
      matches={(matches ?? []) as unknown as MatchRow[]}
      contributors={contributors}
    />
  );
}

type MatchRow = {
  id: string;
  status: string;
  scheduled_at: string | null;
  match_format: string;
  contrib_id: string | null;
  comp_instance_id: string; // ADD THIS
  game_titles: { name: string } | null;
  comp_instances: { name: string } | null;
  home_team: { name: string } | null;
  away_team: { name: string } | null;
};
