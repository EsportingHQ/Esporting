import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type GameTitleRow = {
  id: string;
  name: string;
  slug: string;
  short_code: string;
  is_active: boolean | null;
  game_types:
    { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type MapRow = {
  id: string;
  game_title_id: string;
  name: string;
  is_active: boolean | null;
  is_approved: boolean | null;
};

type ModeRow = {
  id: string;
  game_title_id: string;
  name: string;
  metric_type: string;
  unit_label: string;
  is_active: boolean | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AdminCataloguePage() {
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

  const [{ data: titlesRaw }, { data: mapsRaw }, { data: modesRaw }] =
    await Promise.all([
      supabase
        .from("game_titles")
        .select("id, name, slug, short_code, is_active, game_types(name, slug)")
        .order("name", { ascending: true }),
      supabase
        .from("maps")
        .select("id, game_title_id, name, is_active, is_approved")
        .order("name", { ascending: true }),
      supabase
        .from("modes")
        .select("id, game_title_id, name, metric_type, unit_label, is_active")
        .order("name", { ascending: true }),
    ]);

  const titles = (titlesRaw ?? []) as unknown as GameTitleRow[];
  const maps = (mapsRaw ?? []) as MapRow[];
  const modes = (modesRaw ?? []) as ModeRow[];

  return (
    <div className="space-y-8 font-body">
      <div>
        <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
          Game Catalogue
        </h2>
        <p className="text-xs text-text-muted font-data mt-1 uppercase">
          GAME TITLES, MAPS, AND SUPPORTED MODES
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {titles.map((title) => {
          const titleMaps = maps.filter(
            (map) => map.game_title_id === title.id,
          );
          const titleModes = modes.filter(
            (mode) => mode.game_title_id === title.id,
          );
          const gameType = first(title.game_types);

          return (
            <section
              key={title.id}
              className="bg-bg-surface border border-border-line rounded p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display font-black text-lg text-text-primary uppercase tracking-wide">
                    {title.name}
                  </h3>
                  <p className="text-xs text-text-muted font-data mt-1">
                    {title.short_code} / {gameType?.name ?? "Unknown type"}
                  </p>
                </div>
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-accent-readout bg-accent-readout/10 border border-accent-readout/30 rounded px-2 py-1">
                  {title.is_active ? "active" : "inactive"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-void border border-border-line rounded p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">
                    Maps
                  </p>
                  <p className="text-2xl font-data font-black text-text-primary">
                    {titleMaps.length}
                  </p>
                </div>
                <div className="bg-bg-void border border-border-line rounded p-3">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">
                    Modes
                  </p>
                  <p className="text-2xl font-data font-black text-text-primary">
                    {titleModes.length}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-display font-bold text-[10px] uppercase tracking-widest text-text-muted">
                  Modes
                </p>
                <div className="flex flex-wrap gap-2">
                  {titleModes.map((mode) => (
                    <span
                      key={mode.id}
                      className="text-[10px] font-data text-text-muted bg-bg-void border border-border-line rounded px-2 py-1"
                    >
                      {mode.name} ({mode.unit_label})
                    </span>
                  ))}
                  {titleModes.length === 0 && (
                    <span className="text-xs text-text-muted">No modes.</span>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
