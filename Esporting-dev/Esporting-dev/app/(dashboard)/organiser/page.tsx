import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type CompInstance = {
	id: string;
	name: string;
	status: string;
	format: string;
	starts_at: string | null;
	comp_series: { name: string }[] | null;
};

function statusBadge(status: string): string {
	if (status === 'ongoing') return 'bg-green-500 text-white';
	if (status === 'registration') return 'bg-blue-500 text-white';
	if (status === 'completed') return 'bg-gray-500 text-white';
	return 'bg-yellow-500 text-white';
}

export default async function OrganiserPage() {
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
		roles.includes('super_admin') || roles.includes('organiser');
	if (!canAccess) redirect('/dashboard-redirect');

	const { data: competitions } = await supabase
		.from('comp_instances')
		.select('id, name, status, format, starts_at, comp_series(name)')
		.eq('organiser_id', user.id)
		.is('deleted_at', null)
		.order('created_at', { ascending: false });

	const comps = (competitions ?? []) as unknown as CompInstance[];

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold">My Competitions</h2>
				<a
					href="/organiser/competitions/new"
					className="bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
				>
					+ New Competition
				</a>
			</div>

			{comps.length > 0 ? (
				<div className="space-y-3">
					{comps.map((comp) => (
						<a
							key={comp.id}
							href={`/organiser/competitions/${comp.id}`}
							className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-green-500 transition-colors"
						>
							<div className="flex items-center justify-between">
								<div>
									<p className="font-semibold">{comp.name}</p>
									<p className="text-gray-500 text-sm mt-1">
										{comp.comp_series?.[0]?.name} ·{' '}
										{comp.format}
									</p>
								</div>
								<span
									className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge(comp.status)}`}
								>
									{comp.status}
								</span>
							</div>
						</a>
					))}
				</div>
			) : (
				<div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center">
					<p className="text-gray-400">No competitions yet.</p>
					<a
						href="/organiser/competitions/new"
						className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block"
					>
						Create your first competition →
					</a>
				</div>
			)}
		</div>
	);
}
