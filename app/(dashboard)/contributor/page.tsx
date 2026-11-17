import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { TallyLight } from '@/components/broadcast/tally-light';
import { Clock, Shield, Flame } from 'lucide-react';
import MatchActions from './MatchActions';

type Named = { name: string }[] | { name: string } | null;

type Match = {
	id: string;
	status: string;
	scheduled_at: string | null;
	match_format: string;
	best_of: number | null;
	contrib_id: string | null;
	backup_contrib_id: string | null;
	assignment_mode: string | null;
	needs_cover: boolean | null;
	contrib_confirmed_at: string | null;
	game_titles: Named;
	home_team: Named;
	away_team: Named;
	comp_instances: Named;
};

// Read the clock outside the component body (the page renders fresh on every request).
function currentTimeMs(): number {
	return Date.now();
}

const first = (v: Named): string =>
	!v ? '' : Array.isArray(v) ? (v[0]?.name ?? '') : v.name;

// The match room opens this long before kickoff for the assigned contributor.
const ROOM_OPENS_MIN_BEFORE = 30;

type Tab = 'mine' | 'open' | 'done' | 'all';

export default async function ContributorPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const { tab: tabParam } = await searchParams;

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

	const isAdmin = roles.includes('super_admin');
	// Organisers get in too, for matches they chose to report themselves.
	if (
		!isAdmin &&
		!roles.includes('contributor') &&
		!roles.includes('organiser')
	) {
		redirect('/dashboard-redirect');
	}

	const { data: raw } = await supabase
		.from('matches')
		.select(
			`
        id, status, scheduled_at, match_format, best_of,
        contrib_id, backup_contrib_id, assignment_mode, needs_cover, contrib_confirmed_at,
        game_titles(name),
        home_team:teams!matches_team_home_id_fkey(name),
        away_team:teams!matches_team_away_id_fkey(name),
        comp_instances(name)
      `,
		)
		.is('deleted_at', null)
		.order('scheduled_at', { ascending: true, nullsFirst: false });

	const all = (raw ?? []) as unknown as Match[];
	const active = (m: Match) => !['completed', 'cancelled'].includes(m.status);

	const mine = all.filter(
		(m) =>
			active(m) &&
			(m.contrib_id === user.id || m.backup_contrib_id === user.id),
	);
	const open = all.filter(
		(m) => active(m) && m.status !== 'live' && !m.contrib_id && m.assignment_mode === 'open',
	);
	const done = all.filter((m) => m.status === 'completed' && m.contrib_id === user.id);
	const everything = all.filter(active);

	const tabs: { id: Tab; label: string; list: Match[] }[] = [
		{ id: 'mine', label: 'Mine', list: mine },
		{ id: 'open', label: 'Open', list: open },
		{ id: 'done', label: 'Done', list: done },
		...(isAdmin ? [{ id: 'all' as Tab, label: 'All', list: everything }] : []),
	];
	const tab: Tab = tabs.some((t) => t.id === tabParam)
		? (tabParam as Tab)
		: isAdmin && mine.length === 0 && open.length === 0
			? 'all'
			: 'mine';
	const list = tabs.find((t) => t.id === tab)!.list;
	const toConfirm = mine.filter(
		(m) => m.contrib_id === user.id && !m.contrib_confirmed_at,
	).length;

	const now = currentTimeMs();
	const empty: Record<Tab, [string, string]> = {
		mine: [
			'Nothing assigned yet',
			'Claim a match from the Open tab, or wait for your organiser to assign you.',
		],
		open: ['No open matches', 'Every match has a contributor. Check back later.'],
		done: ['No finished matches yet', 'Matches you report will appear here once they end.'],
		all: ['No active matches', 'Matches appear here once an organiser schedules them.'],
	};

	return (
		<div className="space-y-6 font-body">
			<div>
				<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
					Matches
				</h2>
				<p className="text-xs text-text-muted font-data mt-1 uppercase">
					Contributor live transmission duty roster
					{toConfirm > 0 && ` · ${toConfirm} to confirm`}
				</p>
			</div>

			<div className="flex gap-1 bg-bg-surface border border-border-line rounded p-1 w-fit">
				{tabs.map((t) => (
					<Link
						key={t.id}
						href={`/contributor?tab=${t.id}`}
						className={`px-4 py-1.5 rounded text-xs font-display font-bold uppercase tracking-wider transition-colors ${
							tab === t.id
								? 'bg-bg-void text-text-primary'
								: 'text-text-muted hover:text-text-primary'
						}`}
					>
						{t.label} ({t.list.length})
					</Link>
				))}
			</div>

			{list.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{list.map((match) => {
						const isPrimary = match.contrib_id === user.id;
						const isBackup = match.backup_contrib_id === user.id && !isPrimary;
						const startsInMin = match.scheduled_at
							? Math.round((new Date(match.scheduled_at).getTime() - now) / 60000)
							: null;
						const live = match.status === 'live';
						const finished = match.status === 'completed';

						// Who can open the match room, and when
						let roomHref: string | null = null;
						let roomLabel = 'Open match room';
						let roomDisabledReason: string | null = null;
						if (finished) {
							roomHref = `/contributor/matches/${match.id}`;
							roomLabel = 'View match';
						} else if (isAdmin || (isPrimary && live)) {
							roomHref = `/contributor/matches/${match.id}`;
							roomLabel = live ? 'Open live room' : 'Open match room';
						} else if (isPrimary) {
							if (startsInMin === null || startsInMin <= ROOM_OPENS_MIN_BEFORE) {
								roomHref = `/contributor/matches/${match.id}`;
							} else {
								roomDisabledReason = `Match room opens ${ROOM_OPENS_MIN_BEFORE} min before`;
							}
						} else if (isBackup) {
							roomDisabledReason = 'On standby. You are called if needed.';
						}

						const canConfirm = isPrimary && !match.contrib_confirmed_at && !live && !finished;
						const canRelease = isPrimary && !live && !finished;
						const isOpen = !match.contrib_id && match.assignment_mode === 'open';
						const canClaim = isOpen && !live && !finished;

						let badge = '';
						let badgeClass = 'bg-bg-void text-text-muted border border-border-line';
						if (live) {
							badge = 'live';
							badgeClass = 'bg-state-win/10 text-state-win border border-state-win/30';
						} else if (finished) {
							badge = 'done';
						} else if (isPrimary && !match.contrib_confirmed_at) {
							badge = 'confirm';
							badgeClass = 'bg-state-alert/10 text-state-alert border border-state-alert/30';
						} else if (isPrimary) {
							badge = 'confirmed';
							badgeClass = 'bg-state-win/10 text-state-win border border-state-win/30';
						} else if (isBackup) {
							badge = 'backup';
						} else if (isOpen && match.needs_cover) {
							badge = 'needs cover';
							badgeClass = 'bg-state-loss/10 text-state-loss border border-state-loss/30';
						} else if (isOpen) {
							badge = 'open';
						} else {
							badge = match.status;
						}

						return (
							<div
								key={match.id}
								className="bg-bg-surface border border-border-line rounded p-5"
							>
								<div className="flex justify-between items-start mb-4">
									<div>
										<span className="text-[10px] font-data text-text-muted uppercase tracking-wider block">
											{first(match.comp_instances)}
										</span>
										<h4 className="font-display font-black text-lg text-text-primary uppercase tracking-wide mt-1">
											{match.match_format === 'head_to_head' ? (
												<>
													<span>{first(match.home_team) || 'TBD'}</span>
													<span className="text-text-muted mx-2 font-body font-normal lowercase">
														vs
													</span>
													<span>{first(match.away_team) || 'TBD'}</span>
												</>
											) : (
												<span>Battle Royale Ingest</span>
											)}
										</h4>
									</div>
									<span
										className={`px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5 ${badgeClass}`}
									>
										{live && <TallyLight size="sm" />}
										<span>{badge}</span>
									</span>
								</div>

								<div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-3">
									<span className="flex items-center gap-1.5 uppercase">
										<Shield className="w-3.5 h-3.5" />
										<span>{first(match.game_titles)}</span>
									</span>
									{match.best_of && match.best_of > 1 && (
										<span className="uppercase">Bo{match.best_of}</span>
									)}
									{match.scheduled_at && (
										<span className="flex items-center gap-1.5">
											<Clock className="w-3.5 h-3.5" />
											<span>
												{new Date(match.scheduled_at).toLocaleString([], {
													weekday: 'short',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</span>
										</span>
									)}
								</div>

								<MatchActions
									matchId={match.id}
									canConfirm={canConfirm}
									canRelease={canRelease}
									canClaim={canClaim}
									claimLabel={match.needs_cover ? 'Take over this match' : 'Claim this match'}
									roomHref={roomHref}
									roomLabel={roomLabel}
									roomDisabledReason={roomDisabledReason}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<div className="bg-bg-surface border border-border-line rounded p-12 text-center max-w-xl mx-auto space-y-4">
					<Flame className="w-10 h-10 mx-auto text-text-muted/40" />
					<div className="space-y-1">
						<p className="font-display font-bold text-base text-text-primary uppercase tracking-wide">
							{empty[tab][0]}
						</p>
						<p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
							{empty[tab][1]}
						</p>
					</div>
				</div>
			)}
		</div>
	);
}
