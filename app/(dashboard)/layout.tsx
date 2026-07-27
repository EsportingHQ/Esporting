import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logout } from '@/lib/actions/auth';

type NavItem = {
	label: string;
	href: string;
};

const adminNav: NavItem[] = [
	{ label: 'Overview', href: '/admin' },
	{ label: 'Invite Organiser', href: '/admin/invites' },
	{ label: 'Manage Users', href: '/admin/users' },
	{ label: 'Game Catalogue', href: '/admin/catalogue' },
];

const organiserNav: NavItem[] = [
	{ label: 'My Competitions', href: '/organiser' },
	{ label: 'New Competition', href: '/organiser/competitions/new' },
];

const contributorNav: NavItem[] = [
	{ label: 'Assigned Matches', href: '/contributor' },
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
		<div className="min-h-screen bg-gray-950 text-white flex flex-col">
			{/* Top header */}
			<header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
				<div className="flex items-center gap-6">
					<span className="text-lg font-bold text-white">
						Esporting
					</span>
					<span className="text-gray-600 text-sm">
						{title} Dashboard
					</span>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-gray-500 text-sm">{user.email}</span>
					<form>
						<button
							formAction={logout}
							type="submit"
							className="text-sm text-gray-400 hover:text-white transition-colors"
						>
							Sign out
						</button>
					</form>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className="w-56 border-r border-gray-800 px-4 py-6 shrink-0">
					<nav className="space-y-1">
						{nav.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className="block px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
							>
								{item.label}
							</a>
						))}
					</nav>
				</aside>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto px-8 py-8">
					{children}
				</main>
			</div>
		</div>
	);
}
