'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
	AlertCircle,
	// Plus,
	// Users,
	Award,
	// Calendar,
	Layers,
	// Shield,
} from 'lucide-react';
import ScheduleMatchTab from './ScheduleMatchTab';
import TeamRosterPanel from './TeamRosterPanel';
import StageFixtures from './StageFixtures';
import AddStage from './AddStage';
import MatchReporterRow from './MatchReporterRow';
import MatchTimeEditor from './MatchTimeEditor';
import RescheduleQueue from '../../RescheduleQueue';
import type { RescheduleItem } from '../../rescheduleQueue';
import BulkImportPanel from './BulkImportPanel';
import LogoUpload from '@/components/ui/LogoUpload';

type GameTitleWrap = {
	game_titles: {
		id: string;
		name: string;
		slug: string;
		game_types: { slug: string } | null;
	} | null;
};
type Stage = {
	id: string;
	name: string;
	stage_type: string;
	stage_order: number;
	best_of: number;
	game_title_id: string | null;
	qualify_mode?: string | null;
	qualifiers_per_group?: number | null;
	bracket_teams?: number | null;
};
export type Registration = {
	manual_group?: number | null;
	id: string;
	status: string;
	registered_at: string;
	teams: {
		id: string;
		name: string;
		short_code: string | null;
		country: string | null;
		logo_url: string | null;
	} | null;
};
type TeamOption = { id: string; name: string };
type Match = {
	id: string;
	status: string;
	scheduled_at: string | null;
	match_format: string;
	game_titles: { name: string }[] | null;
	home_team: { name: string }[] | null;
	away_team: { name: string }[] | null;
	contrib_id?: string | null;
	backup_contrib_id?: string | null;
	assignment_mode?: string | null;
	needs_cover?: boolean | null;
	contrib_confirmed_at?: string | null;
	stage_id?: string | null;
	notes?: string | null;
};
type Instance = {
	id: string;
	name: string;
	slug: string;
	edition_label: string | null;
	format: string;
	status: string;
	prize_pool: string | null;
	description: string | null;
	banner_url: string | null;
	starts_at: string | null;
	ends_at: string | null;
	comp_series: { name: string }[] | null;
};

type Props = {
	instance: Instance;
	gameTitles: GameTitleWrap[];
	stages: Stage[];
	registrations: Registration[];
	allTeams: TeamOption[];
	matches: Match[];
	contributors: { id: string; name: string }[];
	rescheduleItems: RescheduleItem[];
};

const TAB_LABELS = {
	teams: 'Teams',
	stages: 'Groups & Fixtures',
	matches: 'Matches',
	schedule: 'Add a match',
} as const;

export default function CompetitionDetailClient({
	instance,
	gameTitles,
	stages,
	registrations,
	allTeams,
	matches,
	contributors,
	rescheduleItems,
}: Props) {
	const supabase = createClient();

	const [activeTab, setActiveTab] = useState<
		'teams' | 'matches' | 'stages' | 'schedule'
	>('teams');
	const [showAddTeam, setShowAddTeam] = useState(false);
	const [showBulk, setShowBulk] = useState(false);
	const [teamMode, setTeamMode] = useState<'new' | 'existing'>('new');
	const [teamId, setTeamId] = useState('');
	const [teamName, setTeamName] = useState('');
	const [teamShortCode, setTeamShortCode] = useState('');
	const [teamCountry, setTeamCountry] = useState('NG');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localRegistrations, setLocalRegistrations] = useState(registrations);
	const [status, setStatus] = useState(instance.status);
	const [statusBusy, setStatusBusy] = useState(false);
	const [ack, setAck] = useState(false);
	const [bannerUrl, setBannerUrl] = useState(instance.banner_url);
	const [teamLogo, setTeamLogo] = useState('');
	const [openTeam, setOpenTeam] = useState<string | null>(null);
	const [startsAt, setStartsAt] = useState(instance.starts_at);
	const [endsAt, setEndsAt] = useState(instance.ends_at);
	const [removing, setRemoving] = useState<string | null>(null);

	const STATUS_STEPS: Record<string, { next: string; label: string; help: string } | undefined> = {
		draft: {
			next: 'registration',
			label: 'Open registration',
			help: 'Draft competitions are hidden from the public. Opening registration shows it on the Competitions page.',
		},
		registration: {
			next: 'ongoing',
			label: 'Go live',
			help: 'Marks the competition as running. Contributors can start reporting matches.',
		},
		ongoing: {
			next: 'completed',
			label: 'Mark completed',
			help: 'Closes the competition. It stays visible with its results.',
		},
	};
	const step = STATUS_STEPS[status];
	const approvedTeams = localRegistrations.filter((r) => r.teams).length;

	async function handleAdvanceStatus() {
		if (!step) return;
		setError(null);
		if (step.next === 'ongoing') {
			if (approvedTeams < 2) {
				setError('Register at least 2 teams before going live.');
				return;
			}
			if (!ack) {
				setError('Tick the player notice before going live.');
				return;
			}
		}
		setStatusBusy(true);
		const { error: updateError } = await supabase
			.from('comp_instances')
			.update({ status: step.next })
			.eq('id', instance.id);
		setStatusBusy(false);
		if (updateError) {
			setError(updateError.message);
			return;
		}
		setStatus(step.next);
		setAck(false);
	}

	async function refreshRegistrations() {
		const { data: fresh } = await supabase
			.from('comp_registrations')
			.select(
				'id, status, registered_at, teams(id, name, short_code, country, logo_url)',
			)
			.eq('comp_instance_id', instance.id)
			.order('registered_at', { ascending: false });
		setLocalRegistrations((fresh as unknown as Registration[]) ?? []);
	}

	function toLagosDate(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
	}

	async function saveDates(start: string, end: string) {
		setError(null);
		if (start && end && end < start) {
			setError('The end date cannot be before the start date');
			return;
		}
		const patch = {
			starts_at: start ? `${start}T00:00:00+01:00` : null,
			ends_at: end ? `${end}T23:59:59+01:00` : null,
		};
		const { error: e } = await supabase.from('comp_instances').update(patch).eq('id', instance.id);
		if (e) return setError(e.message);
		setStartsAt(patch.starts_at);
		setEndsAt(patch.ends_at);
	}

	async function removeTeam(teamId: string, name: string) {
		if (!window.confirm(`Remove ${name} from this competition? Its roster for this competition is removed too.`)) return;
		setError(null);
		setRemoving(teamId);
		const { error: e } = await supabase.rpc('remove_team_from_comp', { p_comp: instance.id, p_team: teamId });
		setRemoving(null);
		if (e) return setError(e.message);
		setLocalRegistrations((rs) => rs.filter((r) => r.teams?.id !== teamId));
	}

	async function handleRegisterTeam() {
		setError(null);
		if (teamMode === 'new' && !teamName) {
			setError('Team name is required');
			return;
		}
		if (teamMode === 'existing' && !teamId) {
			setError('Select a team');
			return;
		}

		setLoading(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token) throw new Error('Session expired');

			const body: Record<string, unknown> = {
				comp_instance_id: instance.id,
			};
			if (teamMode === 'new') {
				body.team_name = teamName;
				body.team_short_code = teamShortCode || null;
				body.team_country = teamCountry || null;
				body.team_logo_url = teamLogo || null;
			} else {
				body.team_id = teamId;
			}

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-team`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						apikey: process.env
							.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(body),
				},
			);
			const data = await res.json();
			if (!res.ok)
				throw new Error(data.error ?? 'Failed to register team');

			const { data: fresh } = await supabase
				.from('comp_registrations')
				.select(
					'id, status, registered_at, teams(id, name, short_code, country, logo_url)',
				)
				.eq('comp_instance_id', instance.id)
				.order('registered_at', { ascending: false });

			setLocalRegistrations((fresh as unknown as Registration[]) ?? []);
			setShowAddTeam(false);
			setTeamName('');
			setTeamShortCode('');
			setTeamId('');
			setTeamLogo('');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Something went wrong',
			);
		} finally {
			setLoading(false);
		}
	}

	function getTeamName(
		team: { name: string }[] | { name: string } | null,
	): string {
		if (!team) return 'TBD';
		return Array.isArray(team) ? (team[0]?.name ?? 'TBD') : team.name;
	}

	function getGameTitleName(
		game: { name: string }[] | { name: string } | null,
	): string {
		if (!game) return '';
		return Array.isArray(game) ? (game[0]?.name ?? '') : game.name;
	}

	const seriesName = instance.comp_series?.[0]?.name;

	return (
		<div className="max-w-4xl space-y-6 font-body">
			<RescheduleQueue items={rescheduleItems} showCompetition={false} />
			{/* Header Panel */}
			<div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
				<LogoUpload
					value={bannerUrl}
					label="Competition logo"
					onUploaded={async (url) => {
						const { error: e } = await supabase
							.from('comp_instances')
							.update({ banner_url: url })
							.eq('id', instance.id);
						if (e) throw new Error(e.message);
						setBannerUrl(url);
					}}
				/>
				<div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
					<label className="flex items-center gap-2">
						Starts
						<input
							type="date"
							value={toLagosDate(startsAt)}
							onChange={(e) => saveDates(e.target.value, toLagosDate(endsAt))}
							className="bg-bg-void border border-border-line rounded px-2 py-1 text-text-primary"
						/>
					</label>
					<label className="flex items-center gap-2">
						Ends
						<input
							type="date"
							value={toLagosDate(endsAt)}
							onChange={(e) => saveDates(toLagosDate(startsAt), e.target.value)}
							className="bg-bg-void border border-border-line rounded px-2 py-1 text-text-primary"
						/>
					</label>
				</div>
				<div>
					<span className="text-[10px] font-data text-text-muted uppercase tracking-wider block">
						{seriesName}
					</span>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase mt-1">
						{instance.name}
					</h2>
				</div>

				<div className="flex flex-wrap gap-4 text-xs font-data text-text-muted">
					<span className="flex items-center gap-1">
						<Layers className="w-3.5 h-3.5" />
						<span className="uppercase">{instance.format}</span>
					</span>
					<span>·</span>
					<span
						className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${
							status === 'ongoing'
								? 'bg-state-win/10 text-state-win border border-state-win/30'
								: 'bg-bg-void text-text-muted border border-border-line'
						}`}
					>
						{status}
					</span>
					{instance.prize_pool && (
						<>
							<span>·</span>
							<span className="flex items-center gap-1 text-accent-readout font-bold">
								<Award className="w-3.5 h-3.5" />
								<span>{instance.prize_pool}</span>
							</span>
						</>
					)}
				</div>

				{step && (
					<div className="mt-3 rounded border border-border-line bg-bg-void p-4 space-y-3">
						<p className="text-xs text-text-muted leading-relaxed">{step.help}</p>
						{step.next === 'ongoing' && (
							<label className="flex items-start gap-2 text-xs text-text-muted cursor-pointer">
								<input
									type="checkbox"
									checked={ack}
									onChange={(e) => setAck(e.target.checked)}
									className="mt-0.5"
								/>
								<span>
									I have told the teams and players that results and match
									details will be shown publicly on Esporting.
								</span>
							</label>
						)}
						<button
							type="button"
							disabled={statusBusy}
							onClick={handleAdvanceStatus}
							className="bg-accent-primary text-white text-xs font-display font-bold uppercase tracking-wider px-4 py-2 rounded disabled:opacity-50"
						>
							{statusBusy ? 'Saving...' : step.label}
						</button>
					</div>
				)}

				<div className="flex flex-wrap gap-1.5 pt-1">
					{gameTitles.map((g, i) => (
						<span
							key={i}
							className="text-[10px] font-display font-bold bg-bg-void border border-border-line text-text-primary px-2 py-0.5 rounded uppercase"
						>
							{g.game_titles?.name}
						</span>
					))}
				</div>
			</div>

			{error && (
				<div className="bg-state-loss/10 border border-state-loss/30 text-state-loss px-4 py-3 rounded text-xs flex items-center gap-2">
					<AlertCircle className="w-4 h-4 shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{/* Tabs */}
			<div className="flex border-b border-border-line gap-2">
				{(['teams', 'stages', 'matches', 'schedule'] as const).map(
					(tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`bg-transparent border-none border-b-2 px-4 py-2 text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer ${
								activeTab === tab
									? 'border-accent-readout text-text-primary'
									: 'border-transparent text-text-muted hover:text-text-primary'
							}`}
						>
							{TAB_LABELS[tab]}
							{tab === 'teams' &&
								` (${localRegistrations.length})`}
							{tab === 'matches' && ` (${matches.length})`}
							{tab === 'stages' && ` (${stages.length})`}
						</button>
					),
				)}
			</div>

			{/* Teams tab */}
			{activeTab === 'teams' && (
				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<h3 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
							Registered Teams
						</h3>
						<div className="flex items-center">
						<button
							onClick={() => setShowBulk((s) => !s)}
							className="bg-bg-void border border-border-line hover:border-accent-readout text-text-primary font-display font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer mr-2"
						>
							{showBulk ? 'Close import' : 'Bulk import'}
						</button>
						<button
							onClick={() => setShowAddTeam((s) => !s)}
							className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-all cursor-pointer"
						>
							{showAddTeam ? 'Cancel' : '+ Register Team'}
						</button>
						</div>
					</div>

					{showBulk && (
						<BulkImportPanel
							compId={instance.id}
							teams={localRegistrations
								.filter((r) => r.teams)
								.map((r) => ({ id: r.teams!.id, name: r.teams!.name }))}
							onChanged={refreshRegistrations}
						/>
					)}

					{showAddTeam && (
						<div className="bg-bg-surface border border-border-line rounded p-6 space-y-4">
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setTeamMode('new')}
									className={`px-3 py-1 rounded text-xs font-display font-bold uppercase border transition-colors ${
										teamMode === 'new'
											? 'bg-accent-readout border-accent-readout text-bg-void'
											: 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
									}`}
								>
									New Team
								</button>
								<button
									type="button"
									onClick={() => setTeamMode('existing')}
									className={`px-3 py-1 rounded text-xs font-display font-bold uppercase border transition-colors ${
										teamMode === 'existing'
											? 'bg-accent-readout border-accent-readout text-bg-void'
											: 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
									}`}
								>
									Existing Team
								</button>
							</div>

							{teamMode === 'new' && (
								<LogoUpload value={teamLogo || null} label="Team logo" onUploaded={(u) => setTeamLogo(u)} />
							)}
							{teamMode === 'new' ? (
								<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
									<input
										placeholder="Team name"
										value={teamName}
										onChange={(e) =>
											setTeamName(e.target.value)
										}
										className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors md:col-span-2"
									/>
									<input
										placeholder="Short code"
										value={teamShortCode}
										onChange={(e) =>
											setTeamShortCode(e.target.value)
										}
										className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
									/>
									<input
										placeholder="Country"
										value={teamCountry}
										onChange={(e) =>
											setTeamCountry(e.target.value)
										}
										className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/30 focus:outline-none focus:border-accent-readout transition-colors"
									/>
								</div>
							) : (
								<select
									value={teamId}
									onChange={(e) => setTeamId(e.target.value)}
									className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout transition-colors"
								>
									<option value="">Select a team</option>
									{allTeams.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							)}

							<button
								disabled={loading}
								onClick={handleRegisterTeam}
								className="bg-accent-readout hover:bg-accent-readout/80 disabled:opacity-50 text-bg-void font-display font-black text-xs uppercase tracking-widest px-4 py-2 rounded transition-all cursor-pointer"
							>
								{loading ? 'REGISTERING...' : 'REGISTER TEAM'}
							</button>
						</div>
					)}

					<div className="space-y-2">
						{localRegistrations.length === 0 && (
							<p className="text-xs text-text-muted italic">
								No teams registered yet.
							</p>
						)}
						{localRegistrations.map((reg) => (
							<div
								key={reg.id}
								className="bg-bg-surface border border-border-line rounded p-4 text-xs"
							>
								<div className="flex justify-between items-center gap-3">
									<div className="flex items-center gap-3 min-w-0">
										{reg.teams?.logo_url && (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={reg.teams.logo_url} alt="" className="w-8 h-8 object-contain rounded" />
										)}
										<span className="font-display font-bold text-sm text-text-primary uppercase truncate">
											{reg.teams?.name}
										</span>
									</div>
									<div className="flex items-center gap-2">
										<span
											className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider ${
												reg.status === 'approved'
													? 'bg-state-win/10 text-state-win'
													: 'bg-bg-void text-text-muted'
											}`}
										>
											{reg.status}
										</span>
										{!(status === 'completed' || status === 'cancelled') && reg.teams && (
											<button
												disabled={removing === reg.teams.id}
												onClick={() => removeTeam(reg.teams!.id, reg.teams!.name)}
												className="px-2 py-1 rounded bg-bg-void border border-state-loss/40 text-[10px] font-display font-bold uppercase tracking-wider text-state-loss disabled:opacity-50"
											>
												{removing === reg.teams.id ? '...' : 'Remove'}
											</button>
										)}
										<button
											onClick={() => setOpenTeam(openTeam === reg.id ? null : reg.id)}
											className="px-2 py-1 rounded bg-bg-void border border-border-line text-[10px] font-display font-bold uppercase tracking-wider text-text-primary"
										>
											{openTeam === reg.id ? 'Close' : 'Roster & logo'}
										</button>
									</div>
								</div>
								{openTeam === reg.id && reg.teams && (
									<TeamRosterPanel
										compId={instance.id}
										teamId={reg.teams.id}
										logoUrl={reg.teams.logo_url}
										locked={status === 'completed' || status === 'cancelled'}
										games={gameTitles
											.map((g) => g.game_titles)
											.filter((g): g is NonNullable<typeof g> => !!g)
											.map((g) => ({ slug: g.slug, name: g.name }))}
										onLogoChanged={(url) =>
											setLocalRegistrations((rs) =>
												rs.map((r) =>
													r.id === reg.id && r.teams
														? { ...r, teams: { ...r.teams, logo_url: url } }
														: r,
												),
											)
										}
									/>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Schedule tab — reinstated from our branch, dev didn't have this */}
			{activeTab === 'schedule' && (
				<ScheduleMatchTab
					instanceId={instance.id}
					stages={stages}
					registeredTeams={
						localRegistrations
							.map((r) => r.teams)
							.filter(Boolean) as { id: string; name: string }[]
					}
					gameTitles={
						gameTitles
							.map((g) =>
								g.game_titles
									? {
											id: g.game_titles.id,
											name: g.game_titles.name,
											slug: g.game_titles.slug,
											game_type_slug:
												g.game_titles.game_types
													?.slug ?? '',
										}
									: null,
							)
							.filter(Boolean) as {
							id: string;
							name: string;
							slug: string;
							game_type_slug: string;
						}[]
					}
					matches={matches}
					contributors={contributors}
				/>
			)}

			{/* Matches tab */}
			{activeTab === 'matches' && (
				<div className="space-y-2">
					{matches.length === 0 && (
						<p className="text-xs text-text-muted italic">
							No matches scheduled yet.
						</p>
					)}
					{matches.map((m) => (
						<div
							key={m.id}
							className="bg-bg-surface border border-border-line rounded p-4 space-y-2 text-xs"
						>
							<div className="flex justify-between items-center">
								<span className="font-display font-black text-sm uppercase tracking-wider text-text-primary">
									{m.match_format === 'head_to_head'
										? `${getTeamName(m.home_team)} vs ${getTeamName(m.away_team)}`
										: 'Battle Royale Match'}
								</span>
								<span className="font-data text-text-muted">
									{getGameTitleName(m.game_titles)}
								</span>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<span
									className={`px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-wider inline-block ${
										m.status === 'live'
											? 'bg-state-win/10 text-state-win'
											: 'bg-bg-void text-text-muted border border-border-line'
									}`}
								>
									{m.status}
								</span>
								{m.notes && <span className="text-text-muted">{m.notes}</span>}
							</div>
							<MatchTimeEditor
								matchId={m.id}
								scheduledAt={m.scheduled_at}
								status={m.status}
								disabled={!['scheduled', 'cancelled', 'delayed'].includes(m.status)}
							/>
							<div className="border-t border-border-line pt-2">
								<MatchReporterRow match={m} contributors={contributors} />
							</div>
							<p className="text-[10px] text-text-muted">
								Times must be at least 8 hours before kickoff.
							</p>
						</div>
					))}
					<AddStage
						compId={instance.id}
						nextOrder={Math.max(0, ...stages.map((x) => x.stage_order)) + 1}
						games={gameTitles
							.map((g) => g.game_titles)
							.filter((g): g is NonNullable<typeof g> => !!g)
							.map((g) => ({ id: g.id, name: g.name }))}
						locked={status === 'completed' || status === 'cancelled'}
					/>
				</div>
			)}

			{/* Stages tab */}
			{activeTab === 'stages' && (
				<div className="space-y-3">
					{stages.map((st) => (
						<StageFixtures
							key={st.id}
							compId={instance.id}
							stage={st}
							followsGroups={stages.some(
								(o) => o.stage_order < st.stage_order && ['group', 'league'].includes(o.stage_type),
							)}
							fixtureCount={matches.filter((m) => m.stage_id === st.id).length}
							teamCount={approvedTeams}
							teams={localRegistrations
								.filter((r) => r.teams && r.status === 'approved')
								.map((r) => ({
									id: r.teams!.id,
									name: r.teams!.name,
									manual_group: r.manual_group ?? null,
								}))}
							locked={status === 'completed' || status === 'cancelled'}
						/>
					))}
				</div>
			)}
		</div>
	);
}
