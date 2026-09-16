import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logout } from '@/lib/actions/auth';
import Link from 'next/link';
import { DashboardShell } from './DashboardShell';
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
		<DashboardShell nav={nav} userEmail={user.email ?? ''} title={title}>
			{children}
		</DashboardShell>
	);
}
