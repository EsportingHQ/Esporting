'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ReporterPicker, {
	reporterError,
	type ContributorOption,
	type ReporterValue,
} from './ReporterPicker';

type Stage = {
	id: string;
	name: string;
	stage_type: string;
	stage_order: number;
	best_of: number;
	game_title_id: string | null;
};
type Team = { id: string; name: string };
type GameTitle = {
	id: string;
	name: string;
	slug: string;
	game_type_slug: string;
};

type Match = {
	id: string;
	status: string;
	scheduled_at: string | null;
	match_format: string;
	game_titles: { name: string }[] | { name: string } | null;
	home_team: { name: string }[] | { name: string } | null;
	away_team: { name: string }[] | { name: string } | null;
	contrib_id?: string | null;
	backup_contrib_id?: string | null;
	assignment_mode?: string | null;
	needs_cover?: boolean | null;
	contrib_confirmed_at?: string | null;
};

type Props = {
	instanceId: string;
	stages: Stage[];
	registeredTeams: Team[];
	gameTitles: GameTitle[];
	matches: Match[];
	contributors: ContributorOption[];
};

export default function ScheduleMatchTab({
	instanceId,
	stages,
	registeredTeams,
	gameTitles,
	matches: initialMatches,
	contributors,
}: Props) {
	const supabase = createClient();

	const [matches, setMatches] = useState(initialMatches);
	const [stageId, setStageId] = useState(stages[0]?.id ?? '');
	const [gameTitleId, setGameTitleId] = useState(gameTitles[0]?.id ?? '');
	const [matchFormat, setMatchFormat] = useState<
		'head_to_head' | 'battle_royale'
	>('head_to_head');
	const [homeTeamId, setHomeTeamId] = useState('');
	const [awayTeamId, setAwayTeamId] = useState('');
	const [scheduledAt, setScheduledAt] = useState('');
	const [bestOf, setBestOf] = useState(1);
	const [reporter, setReporter] = useState<ReporterValue>({
		mode: 'assigned',
		primaryId: '',
		backupId: '',
	});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editReporter, setEditReporter] = useState<ReporterValue>({
		mode: 'assigned',
		primaryId: '',
		backupId: '',
	});
	const [notice, setNotice] = useState<string | null>(null);

	const contributorName = (id?: string | null) =>
		contributors.find((c) => c.id === id)?.name ?? null;

	function reporterLabel(m: Match): { text: string; color: string } {
		if (m.assignment_mode === 'self')
			return { text: 'You report this match', color: '#93c5fd' };
		if (m.contrib_id) {
			const name = contributorName(m.contrib_id) ?? 'A contributor';
			const backup = contributorName(m.backup_contrib_id);
			const state = m.contrib_confirmed_at ? 'confirmed' : 'waiting to confirm';
			return {
				text: `${name} (${state})${backup ? ` \u00b7 backup ${backup}` : ''}`,
				color: m.contrib_confirmed_at ? '#4ade80' : '#fbbf24',
			};
		}
		if (m.needs_cover) return { text: 'Needs cover \u2014 contributor dropped out', color: '#f87171' };
		if (m.assignment_mode === 'open')
			return { text: 'Open to claim', color: '#93c5fd' };
		return { text: 'No contributor yet', color: '#fbbf24' };
	}

	async function applyReporter(matchId: string, v: ReporterValue) {
		const { error: rpcError } = await supabase.rpc('assign_match_reporting', {
			p_match_id: matchId,
			p_mode: v.mode,
			p_primary: v.mode === 'assigned' ? v.primaryId : null,
			p_backup: v.mode === 'assigned' && v.backupId ? v.backupId : null,
		});
		if (rpcError) throw new Error(rpcError.message);
		const { data: me } = await supabase.auth.getUser();
		setMatches((prev) =>
			prev.map((m) =>
				m.id !== matchId
					? m
					: {
							...m,
							assignment_mode: v.mode,
							contrib_id:
								v.mode === 'assigned'
									? v.primaryId
									: v.mode === 'self'
										? (me.user?.id ?? null)
										: null,
							backup_contrib_id:
								v.mode === 'assigned' && v.backupId ? v.backupId : null,
							needs_cover: false,
							contrib_confirmed_at: v.mode === 'self' ? new Date().toISOString() : null,
						},
			),
		);
	}

	async function handleChangeReporter(matchId: string) {
		setError(null);
		setNotice(null);
		const problem = reporterError(editReporter);
		if (problem) return setError(problem);
		try {
			await applyReporter(matchId, editReporter);
			setEditingId(null);
			setNotice('Updated. The contributor will see it in their list.');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not update');
		}
	}
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const selectedGame = gameTitles.find((g) => g.id === gameTitleId);
	const isFootballGame = selectedGame?.game_type_slug === 'football';

	async function handleCreateMatch() {
		setError(null);

		if (!gameTitleId || !stageId) {
			setError('Game and stage are required');
			return;
		}
		if (matchFormat === 'head_to_head' && (!homeTeamId || !awayTeamId)) {
			setError('Both teams are required for head-to-head matches');
			return;
		}
		if (matchFormat === 'head_to_head' && homeTeamId === awayTeamId) {
			setError('Home and away teams must be different');
			return;
		}

		const reporterProblem = reporterError(reporter);
		if (reporterProblem) {
			setError(reporterProblem);
			return;
		}

		setNotice(null);
		setLoading(true);
		try {
			const { data, error: insertError } = await supabase
				.from('matches')
				.insert({
					comp_instance_id: instanceId,
					stage_id: stageId,
					game_title_id: gameTitleId,
					match_format: matchFormat,
					team_home_id:
						matchFormat === 'head_to_head' ? homeTeamId : null,
					team_away_id:
						matchFormat === 'head_to_head' ? awayTeamId : null,
					best_of: bestOf,
					scheduled_at: scheduledAt || null,
					status: 'scheduled',
				})
				.select(
					`
          id, status, scheduled_at, match_format,
          contrib_id, backup_contrib_id, assignment_mode, needs_cover, contrib_confirmed_at,
          game_titles(name),
          home_team:teams!matches_team_home_id_fkey(name),
          away_team:teams!matches_team_away_id_fkey(name)
        `,
				)
				.single();

			if (insertError) throw insertError;

			if (matchFormat === 'head_to_head') {
				const count = bestOf > 1 ? bestOf : 1;
				const mapSlots = Array.from({ length: count }, (_, i) => ({
					match_id: data.id,
					map_number: i + 1,
					status: 'pending',
				}));
				await supabase.from('match_maps').insert(mapSlots);
			}

			setMatches((prev) => [...prev, data as unknown as Match]);
			try {
				await applyReporter(data.id, reporter);
			} catch (err) {
				setError(
					`Match scheduled, but the contributor was not set: ${err instanceof Error ? err.message : 'unknown error'}`,
				);
			}
			setHomeTeamId('');
			setAwayTeamId('');
			setScheduledAt('');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to schedule match',
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

	return (
		<div>
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

			{notice && (
				<div
					style={{
						background: '#14532d33',
						border: '1px solid #14532d',
						color: '#86efac',
						padding: 10,
						borderRadius: 8,
						marginBottom: 16,
						fontSize: 13,
					}}
				>
					{notice}
				</div>
			)}

			<div
				style={{
					background: '#111',
					borderRadius: 10,
					padding: 16,
					marginBottom: 24,
				}}
			>
				<h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
					Schedule a Match
				</h4>

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 10,
						marginBottom: 10,
					}}
				>
					<div>
						<label style={labelStyle}>Stage</label>
						<select
							value={stageId}
							onChange={(e) => setStageId(e.target.value)}
							style={inputStyle}
						>
							{stages
								.filter(
									(s) =>
										s.game_title_id === null ||
										s.game_title_id === gameTitleId,
								)
								.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
						</select>
					</div>
					<div>
						<label style={labelStyle}>Game</label>
						<select
							value={gameTitleId}
							onChange={(e) => {
								const newGameId = e.target.value;
								setGameTitleId(newGameId);
								const newGame = gameTitles.find(
									(g) => g.id === newGameId,
								);
								if (newGame?.game_type_slug === 'football') {
									setMatchFormat('head_to_head');
								}
							}}
							style={inputStyle}
						>
							{gameTitles.map((g) => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div style={{ marginBottom: 10 }}>
					<label style={labelStyle}>Match Format</label>
					<div style={{ display: 'flex', gap: 8 }}>
						<button
							onClick={() => setMatchFormat('head_to_head')}
							style={toggleButtonStyle(
								matchFormat === 'head_to_head',
							)}
						>
							Head to Head
						</button>
						{!isFootballGame && (
							<button
								onClick={() => setMatchFormat('battle_royale')}
								style={toggleButtonStyle(
									matchFormat === 'battle_royale',
								)}
							>
								Battle Royale
							</button>
						)}
					</div>
				</div>

				{matchFormat === 'head_to_head' && (
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 10,
							marginBottom: 10,
						}}
					>
						<div>
							<label style={labelStyle}>Home Team</label>
							<select
								value={homeTeamId}
								onChange={(e) => setHomeTeamId(e.target.value)}
								style={inputStyle}
							>
								<option value="">Select team</option>
								{registeredTeams.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</div>
						<div>
							<label style={labelStyle}>Away Team</label>
							<select
								value={awayTeamId}
								onChange={(e) => setAwayTeamId(e.target.value)}
								style={inputStyle}
							>
								<option value="">Select team</option>
								{registeredTeams.map((t) => (
									<option key={t.id} value={t.id}>
										{t.name}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 10,
						marginBottom: 14,
					}}
				>
					<div>
						<label style={labelStyle}>Best Of</label>
						<input
							type="number"
							min={1}
							max={99}
							value={bestOf}
							onChange={(e) => setBestOf(Number(e.target.value))}
							style={inputStyle}
						/>
					</div>
					<div>
						<label style={labelStyle}>Scheduled Time</label>
						<input
							type="datetime-local"
							value={scheduledAt}
							onChange={(e) => setScheduledAt(e.target.value)}
							style={inputStyle}
						/>
					</div>
				</div>

				<ReporterPicker
					value={reporter}
					onChange={setReporter}
					contributors={contributors}
				/>

				<button
					disabled={loading}
					onClick={handleCreateMatch}
					style={buttonStyle('#16a34a')}
				>
					{loading ? 'Scheduling...' : 'Schedule Match'}
				</button>
			</div>

			<h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
				Scheduled Matches ({matches.length})
			</h4>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
							fontSize: 13,
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
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
								color: m.status === 'live' ? '#22c55e' : '#999',
							}}
						>
							{m.status}
						</span>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginTop: 6,
								gap: 8,
							}}
						>
							<span style={{ fontSize: 12, color: reporterLabel(m).color }}>
								{reporterLabel(m).text}
							</span>
							{m.status === 'scheduled' && (
								<button
									type="button"
									onClick={() => {
										setEditingId(editingId === m.id ? null : m.id);
										setEditReporter({
											mode: (m.assignment_mode as ReporterValue['mode']) ?? 'assigned',
											primaryId: m.assignment_mode === 'assigned' ? (m.contrib_id ?? '') : '',
											backupId: m.backup_contrib_id ?? '',
										});
									}}
									style={{ ...buttonStyle('#1f2937'), padding: '4px 10px', fontSize: 12 }}
								>
									{editingId === m.id ? 'Close' : 'Change'}
								</button>
							)}
						</div>
						{editingId === m.id && (
							<div style={{ marginTop: 12 }}>
								<ReporterPicker
									value={editReporter}
									onChange={setEditReporter}
									contributors={contributors}
								/>
								<button
									type="button"
									onClick={() => handleChangeReporter(m.id)}
									style={buttonStyle('#16a34a')}
								>
									Save
								</button>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
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

function buttonStyle(bg: string): React.CSSProperties {
	return {
		background: bg,
		color: '#fff',
		border: 'none',
		borderRadius: 8,
		padding: '10px 18px',
		fontSize: 13,
		fontWeight: 600,
		cursor: 'pointer',
	};
}

const labelStyle: React.CSSProperties = {
	display: 'block',
	fontSize: 12,
	color: '#aaa',
	marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
	width: '100%',
	background: '#1a1a1a',
	color: '#fff',
	border: '1px solid #333',
	borderRadius: 6,
	padding: '8px 10px',
	fontSize: 13,
};
