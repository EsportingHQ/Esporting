import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logout } from '@/lib/actions/auth';
import Link from 'next/link';
import {
	Shield,
	Activity,
	Users,
	Settings,
	LogOut,
	Layout,
	UserPlus,
	Newspaper,
} from 'lucide-react';

type NavItem = {
	label: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
};

const adminNav: NavItem[] = [
	{ label: 'Overview', href: '/admin', icon: Layout },
	{ label: 'News Desk', href: '/admin/news', icon: Newspaper },
	{ label: 'Invite Organiser', href: '/admin/invites', icon: Users },
	{ label: 'Invite Contributor', href: '/contributor/new', icon: UserPlus },
	{ label: 'Match Assignments', href: '/admin/matches', icon: Activity },
	{ label: 'Manage Users', href: '/admin/users', icon: Settings },
	{ label: 'Game Catalogue', href: '/admin/catalogue', icon: Shield },
];

const organiserNav: NavItem[] = [
	{ label: 'My Competitions', href: '/organiser', icon: Layout },
	{
		label: 'New Competition',
		href: '/organiser/competitions/new',
		icon: PlusIcon,
	},
	{
		label: 'News',
		href: '/organiser/news',
		icon: Activity,
	},
	{ label: 'Invite Contributor', href: '/contributor/new', icon: UserPlus },
];

const contributorNav: NavItem[] = [
	{ label: 'Assigned Matches', href: '/contributor', icon: Activity },
];

function PlusIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M12 4v16m8-8H4"
			/>
		</svg>
	);
}

function getNav(roles: string[]): {
	nav: NavItem[];
	role: string;
	title: string;
} {
	if (roles.includes('super_admin')) {
		return { nav: adminNav, role: 'super_admin', title: 'Admin' };
	}
	if (roles.includes('organiser')) {
		return { nav: organiserNav, role: 'organiser', title: 'Organiser' };
	}
	if (roles.includes('contributor')) {
		return {
			nav: contributorNav,
			role: 'contributor',
			title: 'Contributor',
		};
	}
	return { nav: [], role: 'viewer', title: 'Dashboard' };
}

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
	if (!user) redirect('/login');

	const { data: roleData } = await supabase
		.from('user_role_assignments')
		.select('roles(name)')
		.eq('user_id', user.id)
		.is('revoked_at', null);

	const roles =
		(roleData as { roles: { name: string } }[] | null)?.map(
			(r) => r.roles?.name,
		) ?? [];

	const { nav, title } = getNav(roles);

	return (
		<div className="min-h-screen bg-bg-void text-text-primary flex flex-col font-body antialiased">
			{/* Top header */}
			<header className="bg-bg-void border-b border-border-line px-6 py-4 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-6">
					<Link
						href="/"
						className="font-display font-black text-xl tracking-widest text-text-primary uppercase hover:text-accent-readout transition-colors"
					>
						ESPORTING
					</Link>
					<span className="bg-accent-readout/10 border border-accent-readout/30 px-2.5 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider text-accent-readout">
						{title} DECK
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
				{/* Sidebar */}
				<aside className="w-60 bg-bg-surface border-r border-border-line px-4 py-6 shrink-0">
					<nav className="space-y-1">
						{nav.map((item) => {
							const Icon = item.icon;
							return (
								<Link
									key={item.href}
									href={item.href}
									className="flex items-center gap-3 px-3 py-2.5 rounded text-xs font-display font-bold uppercase tracking-wider text-text-muted hover:text-text-primary hover:bg-bg-void border border-transparent hover:border-border-line transition-all"
								>
									<Icon className="w-4 h-4 text-accent-readout" />
									<span>{item.label}</span>
								</Link>
							);
						})}
					</nav>
				</aside>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto px-8 py-8 bg-bg-void">
					{children}
				</main>
			</div>
		</div>
	);
}
