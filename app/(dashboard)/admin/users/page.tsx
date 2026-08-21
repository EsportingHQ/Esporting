import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type RoleAssignment = {
  user_id: string;
  comp_instance_id: string | null;
  granted_at: string;
  roles: { name: string } | { name: string }[] | null;
  comp_instances: { name: string } | { name: string }[] | null;
  profiles: {
    username: string;
    display_name: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function roleName(row: RoleAssignment): string {
  return first(row.roles)?.name ?? "unknown";
}

function scopeName(row: RoleAssignment): string {
  return first(row.comp_instances)?.name ?? "Global";
}

export default async function AdminUsersPage() {
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
      (row) => row.roles?.name,
    ) ?? [];

  if (!roles.includes("super_admin")) redirect("/dashboard-redirect");

  const [{ data: profilesRaw }, { data: assignmentsRaw }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("user_role_assignments")
      .select(
        "user_id, comp_instance_id, granted_at, roles(name), comp_instances(name), profiles!user_role_assignments_user_id_fkey(username, display_name)",
      )
      .is("revoked_at", null)
      .order("granted_at", { ascending: false }),
  ]);

  const profiles = (profilesRaw ?? []) as ProfileRow[];
  const assignments = (assignmentsRaw ?? []) as unknown as RoleAssignment[];

  return (
    <div className="space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Manage Users
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          REVIEW USER PROFILES AND ACTIVE ROLE MAPPINGS
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
        <section className="bg-bg-surface border border-border-line rounded p-5 space-y-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
            Profiles
          </h3>
          <div className="space-y-2">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-bg-void border border-border-line rounded p-4"
              >
                <p className="text-sm font-bold text-text-primary">
                  {profile.display_name ?? profile.username}
                </p>
                <p className="text-xs text-text-muted font-data mt-1">
                  {profile.username}
                </p>
              </div>
            ))}
            {profiles.length === 0 && (
              <p className="text-xs text-text-muted">No users found.</p>
            )}
          </div>
        </section>

        <section className="bg-bg-surface border border-border-line rounded p-5 space-y-4">
          <h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
            Role Mappings
          </h3>
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div
                key={`${assignment.user_id}-${roleName(assignment)}-${assignment.comp_instance_id ?? "global"}`}
                className="bg-bg-void border border-border-line rounded p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {assignment.profiles?.display_name ??
                      assignment.profiles?.username ??
                      "Unknown User"}
                  </p>
                  <p className="text-xs text-text-muted font-data mt-1">
                    {scopeName(assignment)}
                  </p>
                </div>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-accent-readout bg-accent-readout/10 border border-accent-readout/30 rounded px-2 py-1">
                  {roleName(assignment)}
                </span>
              </div>
            ))}
            {assignments.length === 0 && (
              <p className="text-xs text-text-muted">
                No active role mappings found.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
