import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const stats = (
	totalComps: number,
	liveMatches: number,
	totalTeams: number,
	totalUsers: number,
) => [
	{ label: 'Competitions', value: totalComps },
	{ label: 'Live Matches', value: liveMatches },
	{ label: 'Teams', value: totalTeams },
	{ label: 'Users', value: totalUsers },
];

const actions = [
	{
		label: 'Invite Organiser',
		href: '/admin/invites',
		description: 'Send an invite to a new organiser',
	},
	{
		label: 'Manage Users',
		href: '/admin/users',
		description: 'View and manage user roles',
	},
	{
		label: 'Game Catalogue',
		href: '/admin/catalogue',
		description: 'Manage games, maps and modes',
	},
];

export default async function AdminPage() {
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
		.is('revoked_at', null)
		.is('comp_instance_id', null);

	const roles =
		(roleData as { roles: { name: string } }[] | null)?.map(
			(r) => r.roles?.name,
		) ?? [];

	if (!roles.includes('super_admin')) redirect('/dashboard-redirect');

	const [
		{ count: totalComps },
		{ count: liveMatches },
		{ count: totalTeams },
		{ count: totalUsers },
	] = await Promise.all([
		supabase
			.from('comp_instances')
			.select('*', { count: 'exact', head: true }),
		supabase
			.from('matches')
			.select('*', { count: 'exact', head: true })
			.eq('status', 'live'),
		supabase.from('teams').select('*', { count: 'exact', head: true }),
		supabase.from('profiles').select('*', { count: 'exact', head: true }),
	]);

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Platform Overview</h2>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
				{stats(
					totalComps ?? 0,
					liveMatches ?? 0,
					totalTeams ?? 0,
					totalUsers ?? 0,
				).map((stat) => (
					<div
						key={stat.label}
						className="bg-gray-900 border border-gray-800 rounded-xl p-5"
					>
						<p className="text-3xl font-bold text-green-400">
							{stat.value}
						</p>
						<p className="text-gray-400 text-sm mt-1">
							{stat.label}
						</p>
					</div>
				))}
			</div>

			<h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{actions.map((action) => (
					<a
						key={action.label}
						href={action.href}
						className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-500 transition-colors"
					>
						<p className="font-semibold">{action.label}</p>
						<p className="text-gray-500 text-sm mt-1">
							{action.description}
						</p>
					</a>
				))}
			</div>
		</div>
	);
}
