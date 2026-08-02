import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Layers, Calendar, Award } from 'lucide-react';

type CompInstance = {
	id: string;
	name: string;
	status: string;
	format: string;
	starts_at: string | null;
	comp_series: { name: string }[] | { name: string } | null;
};

function statusBadge(status: string): string {
	if (status === 'ongoing') return 'bg-green-500 text-white';
	if (status === 'registration') return 'bg-blue-500 text-white';
	if (status === 'completed') return 'bg-gray-500 text-white';
	return 'bg-yellow-500 text-white';
}

function getSeriesName(
	series: { name: string }[] | { name: string } | null,
): string {
	if (!series) return '';
	return Array.isArray(series) ? (series[0]?.name ?? '') : series.name;
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
		.is('revoked_at', null);

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
		<div className="space-y-6 font-body">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
						My Competitions
					</h2>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						ORGANISER COMMAND CONTROL HUB
					</p>
				</div>
				<Link
					href="/organiser/competitions/new"
					className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all cursor-pointer"
				>
					+ NEW COMPETITION
				</Link>
			</div>

			{comps.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{comps.map((comp) => (
						<Link
							key={comp.id}
							href={`/organiser/competitions/${comp.id}`}
							className="block bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-5 transition-all group"
						>
							<div className="flex justify-between items-start mb-4">
								<div>
									<span className="text-[10px] font-data text-text-muted uppercase tracking-wider block">
										{getSeriesName(comp.comp_series)}
									</span>
									<h4 className="font-display font-black text-lg text-text-primary group-hover:text-accent-readout uppercase tracking-wide mt-1 transition-colors">
										{comp.name}
									</h4>
								</div>
								<span
									className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider shrink-0 ${
										comp.status === 'ongoing'
											? 'bg-state-win/10 text-state-win border border-state-win/30'
											: comp.status === 'registration'
												? 'bg-accent-readout/10 text-accent-readout border border-accent-readout/30'
												: 'bg-bg-void text-text-muted border border-border-line'
									}`}
								>
									{comp.status}
								</span>
							</div>

							<div className="flex items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-3 mt-3">
								<span className="flex items-center gap-1.5 uppercase">
									<Layers className="w-3.5 h-3.5" />
									<span>{comp.format}</span>
								</span>
								{comp.starts_at && (
									<span className="flex items-center gap-1.5">
										<Calendar className="w-3.5 h-3.5" />
										<span>
											{new Date(
												comp.starts_at,
											).toLocaleDateString()}
										</span>
									</span>
								)}
							</div>
						</Link>
					))}
				</div>
			) : (
				<div className="bg-bg-surface border border-border-line rounded p-12 text-center max-w-xl mx-auto space-y-4">
					<Award className="w-10 h-10 mx-auto text-text-muted/40" />
					<div className="space-y-1">
						<p className="font-display font-bold text-base text-text-primary uppercase tracking-wide">
							No competitions found
						</p>
						<p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
							You are registered as a Tournament Organiser, but
							you have not created any tournament hubs yet.
						</p>
					</div>
					<Link
						href="/organiser/competitions/new"
						className="inline-block bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all cursor-pointer"
					>
						CREATE YOUR FIRST TOURNAMENT
					</Link>
				</div>
			)}
		</div>
	);
}
