'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ScheduleMatchTab from './ScheduleMatchTab';

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
};
export type Registration = {
	id: string;
	status: string;
	registered_at: string;
	teams: {
		id: string;
		name: string;
		short_code: string | null;
		country: string | null;
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
	comp_series: { name: string }[] | null;
};

type Props = {
	instance: Instance;
	gameTitles: GameTitleWrap[];
	stages: Stage[];
	registrations: Registration[];
	allTeams: TeamOption[];
	matches: Match[];
};

export default function CompetitionDetailClient({
	instance,
	gameTitles,
	stages,
	registrations,
	allTeams,
	matches,
}: Props) {
	const supabase = createClient();

	const [activeTab, setActiveTab] = useState<
		'teams' | 'matches' | 'stages' | 'schedule'
	>('teams');
	const [showAddTeam, setShowAddTeam] = useState(false);
	const [teamMode, setTeamMode] = useState<'new' | 'existing'>('new');
	const [teamId, setTeamId] = useState('');
	const [teamName, setTeamName] = useState('');
	const [teamShortCode, setTeamShortCode] = useState('');
	const [teamCountry, setTeamCountry] = useState('NG');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [localRegistrations, setLocalRegistrations] = useState(registrations);

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
					'id, status, registered_at, teams(id, name, short_code, country)',
				)
				.eq('comp_instance_id', instance.id)
				.order('registered_at', { ascending: false });

			setLocalRegistrations((fresh as unknown as Registration[]) ?? []);
			setShowAddTeam(false);
			setTeamName('');
			setTeamShortCode('');
			setTeamId('');
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
		<div style={{ maxWidth: 900 }}>
			<div style={{ marginBottom: 24 }}>
				<p style={{ fontSize: 13, color: '#888' }}>{seriesName}</p>
				<h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0' }}>
					{instance.name}
				</h2>
				<div
					style={{
						display: 'flex',
						gap: 8,
						alignItems: 'center',
						fontSize: 13,
						color: '#999',
					}}
				>
					<span>{instance.format}</span>
					<span>·</span>
					<span
						style={{
							fontSize: 12,
							fontWeight: 600,
							padding: '2px 10px',
							borderRadius: 999,
							background:
								instance.status === 'ongoing'
									? '#16a34a22'
									: '#33333322',
							color:
								instance.status === 'ongoing'
									? '#22c55e'
									: '#999',
						}}
					>
						{instance.status}
					</span>
					{instance.prize_pool && (
						<>
							<span>·</span>
							<span>{instance.prize_pool}</span>
						</>
					)}
				</div>
				<div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
					{gameTitles.map((g, i) => (
						<span
							key={i}
							style={{
								fontSize: 12,
								background: '#1a1a1a',
								padding: '2px 8px',
								borderRadius: 6,
							}}
						>
							{g.game_titles?.name}
						</span>
					))}
				</div>
			</div>

			{error && (
				<div
					style={{
						background: '#7f1d1d33',
						border: '1px solid #7f1d1d',
						color: '#fca5a5',
						padding: 10,
						borderRadius: 8,
						marginBottom: 16,
						fontSize: 13,
					}}
				>
					{error}
				</div>
			)}

			<div
				style={{
					display: 'flex',
					gap: 4,
					marginBottom: 20,
					borderBottom: '1px solid #222',
				}}
			>
				{(['teams', 'schedule', 'matches', 'stages'] as const).map(
					(tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							style={{
								background: 'none',
								border: 'none',
								borderBottom:
									activeTab === tab
										? '2px solid #22c55e'
										: '2px solid transparent',
								color: activeTab === tab ? '#fff' : '#888',
								padding: '8px 16px',
								fontSize: 13,
								fontWeight: 600,
								cursor: 'pointer',
								textTransform: 'capitalize',
							}}
						>
							{tab}
							{tab === 'teams' &&
								` (${localRegistrations.length})`}
							{tab === 'matches' && ` (${matches.length})`}
							{tab === 'stages' && ` (${stages.length})`}
						</button>
					),
				)}
			</div>

			{activeTab === 'teams' && (
				<div>
					<button
						onClick={() => setShowAddTeam((s) => !s)}
						style={buttonStyle('#16a34a')}
					>
						{showAddTeam ? 'Cancel' : '+ Register Team'}
					</button>

					{showAddTeam && (
						<div
							style={{
								background: '#111',
								borderRadius: 10,
								padding: 16,
								marginTop: 12,
								marginBottom: 16,
							}}
						>
							<div
								style={{
									display: 'flex',
									gap: 8,
									marginBottom: 10,
								}}
							>
								<button
									onClick={() => setTeamMode('new')}
									style={toggleButtonStyle(
										teamMode === 'new',
									)}
								>
									New Team
								</button>
								<button
									onClick={() => setTeamMode('existing')}
									style={toggleButtonStyle(
										teamMode === 'existing',
									)}
								>
									Existing Team
								</button>
							</div>

							{teamMode === 'new' ? (
								<div style={{ display: 'flex', gap: 8 }}>
									<input
										placeholder="Team name"
										value={teamName}
										onChange={(e) =>
											setTeamName(e.target.value)
										}
										style={{ ...inputStyle, flex: 2 }}
									/>
									<input
										placeholder="Short code"
										value={teamShortCode}
										onChange={(e) =>
											setTeamShortCode(e.target.value)
										}
										style={{ ...inputStyle, flex: 1 }}
									/>
									<input
										placeholder="Country"
										value={teamCountry}
										onChange={(e) =>
											setTeamCountry(e.target.value)
										}
										style={{ ...inputStyle, flex: 1 }}
									/>
								</div>
							) : (
								<select
									value={teamId}
									onChange={(e) => setTeamId(e.target.value)}
									style={inputStyle}
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
								style={{
									...buttonStyle('#16a34a'),
									marginTop: 10,
								}}
							>
								{loading ? 'Registering...' : 'Register'}
							</button>
						</div>
					)}

					<div
						style={{
							marginTop: 16,
							display: 'flex',
							flexDirection: 'column',
							gap: 8,
						}}
					>
						{localRegistrations.length === 0 && (
							<p style={{ color: '#666', fontSize: 13 }}>
								No teams registered yet.
							</p>
						)}
						{localRegistrations.map((reg) => (
							<div
								key={reg.id}
								style={{
									background: '#111',
									borderRadius: 8,
									padding: 12,
									display: 'flex',
									justifyContent: 'space-between',
								}}
							>
								<span style={{ fontWeight: 600, fontSize: 13 }}>
									{reg.teams?.name}
								</span>
								<span
									style={{
										fontSize: 12,
										color:
											reg.status === 'approved'
												? '#22c55e'
												: '#999',
									}}
								>
									{reg.status}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

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
				/>
			)}

			{activeTab === 'matches' && (
				<div
					style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					{matches.length === 0 && (
						<p style={{ color: '#666', fontSize: 13 }}>
							No matches scheduled yet.
						</p>
					)}
					{matches.map((m) => (
						<div
							key={m.id}
							style={{
								background: '#111',
								borderRadius: 8,
								padding: 12,
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									fontSize: 13,
								}}
							>
								<span>
									{m.match_format === 'head_to_head'
										? `${getTeamName(m.home_team)} vs ${getTeamName(m.away_team)}`
										: 'Battle Royale'}
								</span>
								<span style={{ color: '#888' }}>
									{getGameTitleName(m.game_titles)}
								</span>
							</div>
							<span
								style={{
									fontSize: 12,
									color:
										m.status === 'live'
											? '#22c55e'
											: '#999',
								}}
							>
								{m.status}
							</span>
						</div>
					))}
				</div>
			)}

			{activeTab === 'stages' && (
				<div
					style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
				>
					{stages.map((s) => (
						<div
							key={s.id}
							style={{
								background: '#111',
								borderRadius: 8,
								padding: 12,
								display: 'flex',
								justifyContent: 'space-between',
								fontSize: 13,
							}}
						>
							<span>
								{s.stage_order}. {s.name}
							</span>
							<span style={{ color: '#888' }}>
								{s.stage_type} · Best of {s.best_of}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function buttonStyle(bg: string): React.CSSProperties {
	return {
		background: bg,
		color: '#fff',
		border: 'none',
		borderRadius: 8,
		padding: '8px 16px',
		fontSize: 13,
		fontWeight: 600,
		cursor: 'pointer',
	};
}

function toggleButtonStyle(active: boolean): React.CSSProperties {
	return {
		background: active ? '#16a34a' : '#1a1a1a',
		color: '#fff',
		border: `1px solid ${active ? '#16a34a' : '#333'}`,
		borderRadius: 8,
		padding: '6px 14px',
		fontSize: 13,
		cursor: 'pointer',
	};
}

const inputStyle: React.CSSProperties = {
	background: '#1a1a1a',
	color: '#fff',
	border: '1px solid #333',
	borderRadius: 8,
	padding: '8px 10px',
	fontSize: 13,
};
