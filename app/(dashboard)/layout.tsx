import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import Link from "next/link";
import {
  DashboardSidebar,
  NavItem,
  NavSection,
} from "@/components/layout/DashboardSidebar";
import { LogOut } from "lucide-react";

const adminNav: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "Layout" },
  { label: "News Desk", href: "/admin/news", icon: "Newspaper" },
  { label: "Invite Organiser", href: "/admin/invites", icon: "Users" },
  { label: "Invite Contributor", href: "/contributor/new", icon: "UserPlus" },
  { label: "Match Assignments", href: "/admin/matches", icon: "Activity" },
  { label: "Manage Users", href: "/admin/users", icon: "Settings" },
  { label: "Game Catalogue", href: "/admin/catalogue", icon: "Shield" },
];

const organiserNav: NavItem[] = [
  { label: "My Competitions", href: "/organiser", icon: "Layout" },
  {
    label: "New Competition",
    href: "/organiser/competitions/new",
    icon: "Plus",
  },
  { label: "News", href: "/organiser/news", icon: "Activity" },
  { label: "Invite Contributor", href: "/contributor/new", icon: "UserPlus" },
];

const contributorNav: NavItem[] = [
  { label: "Assigned Matches", href: "/contributor", icon: "Activity" },
];

// const organiserNav: NavItem[] = [
// 	{ label: 'My Competitions', href: '/organiser', icon: Layout },
// 	{
// 		label: 'New Competition',
// 		href: '/organiser/competitions/new',
// 		icon: Plus,
// 	},
// 	{ label: 'News', href: '/organiser/news', icon: Activity },
// 	{ label: 'Invite Contributor', href: '/contributor/new', icon: UserPlus },
// ];

// const contributorNav: NavItem[] = [
// 	{ label: 'Assigned Matches', href: '/contributor', icon: Activity },
// ];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  const sections: NavSection[] = [];
  if (roles.includes("super_admin")) {
    sections.push({ role: "super_admin", title: "Admin", items: adminNav });
  }
  if (roles.includes("organiser")) {
    sections.push({
      role: "organiser",
      title: "Organiser",
      items: organiserNav,
    });
  }
  if (roles.includes("contributor")) {
    sections.push({
      role: "contributor",
      title: "Contributor",
      items: contributorNav,
    });
  }

  const primaryTitle = roles.includes("super_admin")
    ? "Admin"
    : roles.includes("organiser")
      ? "Organiser"
      : roles.includes("contributor")
        ? "Contributor"
        : "Dashboard";

  return (
    <div className="min-h-screen bg-bg-void text-text-primary flex flex-col font-body antialiased">
      <header className="bg-bg-void border-b border-border-line px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-display font-black text-xl tracking-widest text-text-primary uppercase hover:text-accent-readout transition-colors"
          >
            ESPORTING
          </Link>
          <span className="bg-accent-readout/10 border border-accent-readout/30 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider text-accent-readout">
            {primaryTitle} DECK
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-data text-text-muted">
          <span>{user.email}</span>

          <form>
            <button
              formAction={logout}
              type="submit"
              className="text-text-muted hover:text-state-loss flex items-center gap-1.5 transition-colors cursor-pointer font-display font-bold uppercase tracking-wider text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar sections={sections} />
        <main className="flex-1 overflow-y-auto px-8 py-8 bg-bg-void">
          {children}
        </main>
      </div>
    </div>
  );
}
