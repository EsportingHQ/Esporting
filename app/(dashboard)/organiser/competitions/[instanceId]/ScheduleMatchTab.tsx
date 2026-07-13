'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
};

type Props = {
	instanceId: string;
	stages: Stage[];
	registeredTeams: Team[];
	gameTitles: GameTitle[];
	matches: Match[];
};

export default function ScheduleMatchTab({
	instanceId,
	stages,
	registeredTeams,
	gameTitles,
	matches: initialMatches,
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
							max={15}
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
								{m.game_titles?.[0]?.name}
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
