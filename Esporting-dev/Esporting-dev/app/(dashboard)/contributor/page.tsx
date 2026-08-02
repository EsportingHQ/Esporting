import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type GameTitle = { name: string; slug: string }[];
type Team = { name: string; short_code: string }[];
type CompInstance = { name: string }[];

type Match = {
	id: string;
	status: string;
	scheduled_at: string | null;
	match_format: string;
	game_titles: GameTitle | null;
	home_team: Team | null;
	away_team: Team | null;
	comp_instances: CompInstance | null;
};

function getStatusClass(status: string): string {
	if (status === 'live') return 'bg-green-500/10 text-green-400';
	if (status === 'delayed') return 'bg-yellow-500/10 text-yellow-400';
	return 'bg-gray-500/10 text-gray-400';
}

function getStatusLabel(status: string): string {
	if (status === 'live') return '● LIVE';
	return status;
}

export default async function ContributorPage() {
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

	const canAccess =
		roles.includes('super_admin') || roles.includes('contributor');
	if (!canAccess) redirect('/dashboard-redirect');

	const { data: rawMatches } = await supabase
		.from('matches')
		.select(
			`
				id, status, scheduled_at, match_format,
				game_titles(name, slug),
				home_team:teams!matches_team_home_id_fkey(name, short_code),
				away_team:teams!matches_team_away_id_fkey(name, short_code),
				comp_instances(name)
			`,
		)
		.eq('contrib_id', user.id)
		.not('status', 'in', '("completed","cancelled")')
		.order('scheduled_at', { ascending: true });

	const matches = (rawMatches ?? []) as unknown as Match[];

	return (
		<div>
			<h2 className="text-2xl font-bold mb-6">Assigned Matches</h2>

			{matches.length > 0 ? (
				<div className="space-y-3">
					{matches.map((match) => (
						<a
							key={match.id}
							href={`/contributor/matches/${match.id}`}
							className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-500 transition-colors"
						>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs text-gray-500">
									{match.comp_instances?.[0]?.name}
								</span>
								<span
									className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusClass(match.status)}`}
								>
									{getStatusLabel(match.status)}
								</span>
							</div>
							<div className="flex items-center justify-between">
								{match.match_format === 'head_to_head' ? (
									<p className="font-semibold">
										{match.home_team?.[0]?.name ?? 'TBD'}
										<span className="text-gray-500 mx-2">
											vs
										</span>
										{match.away_team?.[0]?.name ?? 'TBD'}
									</p>
								) : (
									<p className="font-semibold">
										Battle Royale Match
									</p>
								)}
								<p className="text-xs text-gray-500">
									{match.game_titles?.[0]?.name}
								</p>
							</div>
						</a>
					))}
				</div>
			) : (
				<div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
					<p className="text-gray-400">
						No matches assigned to you yet.
					</p>
					<p className="text-gray-600 text-sm mt-1">
						Contact your admin to get assigned to a match.
					</p>
				</div>
			)}
		</div>
	);
}
