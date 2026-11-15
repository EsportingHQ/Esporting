import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DashboardShell, type NavItem } from './DashboardShell';

const adminNav: NavItem[] = [
	{ label: 'Overview', href: '/admin', icon: 'layout' },
	{ label: 'News Desk', href: '/admin/news', icon: 'newspaper' },
	{ label: 'Invite Organiser', href: '/admin/invites', icon: 'users' },
	{ label: 'Invite Contributor', href: '/contributor/new', icon: 'userPlus' },
	{ label: 'Match Assignments', href: '/admin/matches', icon: 'activity' },
	{ label: 'Contributor View', href: '/contributor', icon: 'radio' },
	{ label: 'Manage Users', href: '/admin/users', icon: 'settings' },
	{ label: 'Game Catalogue', href: '/admin/catalogue', icon: 'shield' },
];

const organiserNav: NavItem[] = [
	{ label: 'My Competitions', href: '/organiser', icon: 'layout' },
	{
		label: 'New Competition',
		href: '/organiser/competitions/new',
		icon: 'plus',
	},
	{
		label: 'News',
		href: '/organiser/news',
		icon: 'activity',
	},
	{ label: 'Invite Contributor', href: '/contributor/new', icon: 'userPlus' },
];

const contributorNav: NavItem[] = [
	{ label: 'Assigned Matches', href: '/contributor', icon: 'activity' },
];

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
