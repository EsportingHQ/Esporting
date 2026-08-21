'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LineupEditorPanel from './LineupEditorPanel';

type Status =
	| 'scheduled'
	| 'delayed'
	| 'live'
	| 'completed'
	| 'cancelled'
	| 'walkover';
type MatchFormat = 'head_to_head' | 'battle_royale';

export type Team = {
	id: string;
	name: string;
	short_code: string | null;
	logo_url: string | null;
	country: string | null;
};

export type GameType = { name: string; slug: string };
export type GameTitle = {
	id: string;
	name: string;
	slug: string;
	short_code: string | null;
	game_types: GameType | null;
};

export type MatchRoomMatch = {
	id: string;
	status: Status;
	match_format: MatchFormat;
	best_of: number;
	scheduled_at: string | null;
	started_at: string | null;
	ended_at: string | null;
	home_maps_won: number | null;
	away_maps_won: number | null;
	winner_team_id: string | null;
	team_home_id: string | null;
	team_away_id: string | null;
	game_title_id: string;
	comp_instance_id: string;
	game_titles: GameTitle | null;
	comp_instances: { name: string; slug: string | null } | null;
	comp_stages: { name: string } | null;
	home_team: Team | null;
	away_team: Team | null;
};

export type MatchScore = {
	match_id: string;
	current_map_id: string | null;
	home_maps_won: number | null;
	away_maps_won: number | null;
	home_current_score: number | null;
	away_current_score: number | null;
	score_breakdown: Record<string, unknown> | null;
	last_event_id: string | null;
	updated_at: string | null;
};

export type MatchEvent = {
	id: string;
	match_id: string;
	match_map_id: string | null;
	event_type: string;
	team_id: string | null;
	player_id: string | null;
	value: number | null;
	meta: Record<string, unknown> | null;
	is_correction: boolean | null;
	corrected_event_id: string | null;
	is_void: boolean | null;
	sequence_no: number | null;
	created_at: string | null;
	teams: { name: string; short_code: string | null } | null;
	players: { gamertag: string; real_name: string | null } | null;
};

export type StatusLog = {
	id: string;
	match_id: string;
	old_status: string | null;
	new_status: string;
	reason: string | null;
	created_at: string | null;
};

export type MatchMap = {
	id: string;
	match_id: string;
	map_number: number;
	map_id: string | null;
	mode_id: string | null;
	home_score: number | null;
	away_score: number | null;
	map_winner: string | null;
	status: string;
	started_at: string | null;
	ended_at: string | null;
	duration_seconds: number | null;
	maps: { name: string; slug: string } | null;
	modes: {
		name: string;
		slug: string;
		metric_type: string;
		unit_label: string;
	} | null;
};

export type Lineup = {
	id: string;
	team_id: string;
	role: string;
	players: {
		id: string;
		gamertag: string;
		real_name: string | null;
		avatar_url: string | null;
		country: string | null;
	} | null;
};

export type CatalogueMap = { id: string; name: string; slug: string };
export type CatalogueMode = {
	id: string;
	name: string;
	slug: string;
	metric_type: string;
	unit_label: string;
};
export type MapModeLink = { map_id: string; mode_id: string };

export type Participant = {
	id: string;
	slot_number: number;
	team_id: string | null;
	player_id: string | null;
	teams: {
		name: string;
		short_code: string | null;
		logo_url: string | null;
	} | null;
	players: { gamertag: string; avatar_url: string | null } | null;
};

export type BrResult = {
	id: string;
	participant_id: string;
	placement: number;
	kills: number;
	placement_pts: number;
	kill_pts: number;
	total_pts: number;
};

export type LineupRow = {
	id: string;
	team_id: string;
	player_id: string;
	role: string;
	confirmed: boolean;
};

type Props = {
	initialMatch: MatchRoomMatch;
	initialScore: MatchScore | null;
	initialEvents: MatchEvent[];
	initialStatusLogs: StatusLog[];
	initialMaps: MatchMap[];
	lineups: Lineup[];
	availableMaps: CatalogueMap[];
	availableModes: CatalogueMode[];
	mapModeLinks: MapModeLink[];
	participants: Participant[];
	initialBrResults: BrResult[];
	eligiblePlayers: { team_id: string; player_id: string; gamertag: string }[];
	currentLineup: LineupRow[];
};

const VALID_TRANSITIONS: Record<Status, { status: Status; label: string }[]> = {
	scheduled: [
		{ status: 'live', label: 'Go Live' },
		{ status: 'delayed', label: 'Mark Delayed' },
		{ status: 'cancelled', label: 'Cancel' },
	],
	delayed: [
		{ status: 'live', label: 'Go Live' },
		{ status: 'cancelled', label: 'Cancel' },
	],
	live: [
		{ status: 'completed', label: 'Mark Completed' },
		{ status: 'cancelled', label: 'Cancel' },
	],
	completed: [],
	cancelled: [],
	walkover: [],
};

const FOOTBALL_EVENTS = [
	{ type: 'goal', label: 'Goal', needsPlayer: false },
	{ type: 'own_goal', label: 'Own Goal', needsPlayer: false },
	{ type: 'penalty_goal', label: 'Penalty Goal', needsPlayer: false },
	{ type: 'penalty_miss', label: 'Penalty Miss', needsPlayer: false },
	{ type: 'yellow_card', label: 'Yellow Card', needsPlayer: true },
	{ type: 'red_card', label: 'Red Card', needsPlayer: true },
	{ type: 'half_time', label: 'Half Time', needsPlayer: false, noTeam: true },
	{ type: 'full_time', label: 'Full Time', needsPlayer: false, noTeam: true },
];

function statusClass(status: string): string {
	if (status === 'live')
		return 'bg-green-500/15 text-green-300 border-green-500/30';
	if (status === 'delayed')
		return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
	if (status === 'cancelled')
		return 'bg-red-500/15 text-red-300 border-red-500/30';
	return 'bg-gray-800 text-gray-300 border-gray-700';
}

function formatDate(value: string | null): string {
	if (!value) return 'Time TBD';
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value));
}

function numberValue(value: number | null | undefined): number {
	return Number(value ?? 0);
}

function teamName(team: Team | null): string {
	return team?.name ?? 'TBD';
}

function participantName(participant: Participant): string {
	return (
		participant.teams?.name ??
		participant.players?.gamertag ??
		`Slot ${participant.slot_number}`
	);
}

function eventLabel(event: MatchEvent): string {
	const player = event.players?.gamertag;
	const team = event.teams?.name;
	const minute = event.meta?.minute ? ` (${event.meta.minute}')` : '';
	const mapNumber = event.meta?.map_number
		? ` Map ${event.meta.map_number}`
		: '';

	if (event.event_type === 'correction') {
		return `Correction: ${String(event.meta?.reason ?? 'Event corrected')}`;
	}
	if (event.event_type === 'goal')
		return `${player ?? 'Player'} scores for ${team ?? 'team'}${minute}`;
	if (event.event_type === 'own_goal')
		return `${player ?? 'Player'} own goal${minute}`;
	if (event.event_type === 'penalty_goal')
		return `${player ?? 'Player'} converts penalty${minute}`;
	if (event.event_type === 'penalty_miss')
		return `${player ?? 'Player'} misses penalty${minute}`;
	if (event.event_type === 'yellow_card')
		return `${player ?? 'Player'} yellow card${minute}`;
	if (event.event_type === 'red_card')
		return `${player ?? 'Player'} red card${minute}`;
	if (event.event_type === 'half_time') return 'Half Time';
	if (event.event_type === 'full_time') return 'Full Time';
	if (event.event_type === 'score_update')
		return `${team ?? 'Team'} score updated to ${event.value ?? 0}`;
	if (event.event_type === 'round_end') return `${team ?? 'Team'} wins round`;
	if (event.event_type === 'map_end') return `${mapNumber || 'Map'} ended`;
	if (event.event_type === 'map_selected')
		return `${mapNumber || 'Map'} selected`;
	if (event.event_type === 'mode_selected')
		return `${mapNumber || 'Mode'} selected`;
	return event.event_type.replaceAll('_', ' ');
}

function getEdgeError(data: unknown): string {
	if (data && typeof data === 'object' && 'error' in data) {
		return String((data as { error: unknown }).error);
	}
	return 'Request failed';
}

export default function MatchRoomClient({
	initialMatch,
	initialScore,
	initialEvents,
	initialStatusLogs,
	initialMaps,
	lineups,
	availableMaps,
	availableModes,
	mapModeLinks,
	participants,
	initialBrResults,
	eligiblePlayers,
	currentLineup,
}: Props) {
	const supabase = useMemo(() => createClient(), []);
	const [match, setMatch] = useState(initialMatch);
	const [score, setScore] = useState(initialScore);
	const [events, setEvents] = useState(initialEvents);
	const [statusLogs, setStatusLogs] = useState(initialStatusLogs);
	const [maps, setMaps] = useState(initialMaps);
	const [brResults, setBrResults] = useState(initialBrResults);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState<string | null>(null);
	const [statusReason, setStatusReason] = useState('');
	const [eventType, setEventType] = useState('goal');
	const [eventTeamId, setEventTeamId] = useState(match.team_home_id ?? '');
	const [eventPlayerId, setEventPlayerId] = useState('');
	const [eventMinute, setEventMinute] = useState('');
	const [mapSlotId, setMapSlotId] = useState(maps[0]?.id ?? '');
	const [selectedMapId, setSelectedMapId] = useState('');
	const [selectedModeId, setSelectedModeId] = useState('');
	const [homeScoreInput, setHomeScoreInput] = useState('0');
	const [awayScoreInput, setAwayScoreInput] = useState('0');
	const [durationMinutes, setDurationMinutes] = useState('');
	const [correctionEventId, setCorrectionEventId] = useState('');
	const [correctionReason, setCorrectionReason] = useState('');
	const [replacementType, setReplacementType] = useState('');
	const [brRows, setBrRows] = useState(
		participants.map((participant, index) => ({
			participant_id: participant.id,
			placement: index + 1,
			kills: 0,
		})),
	);

	const isFootball = match.game_titles?.game_types?.slug === 'football';
	const isShooter = match.game_titles?.game_types?.slug === 'shooter';
	const isBattleRoyale = match.match_format === 'battle_royale';
	const visibleEvents = events.filter((event) => !event.is_void);
	const currentMap =
		maps.find((map) => map.id === mapSlotId) ?? maps[0] ?? null;
	const liveMap = maps.find((map) => map.status === 'live') ?? currentMap;
	const selectedEventConfig =
		FOOTBALL_EVENTS.find((item) => item.type === eventType) ??
		FOOTBALL_EVENTS[0];
	const eventPlayers = lineups.filter(
		(lineup) => lineup.team_id === eventTeamId,
	);
	const allowedModes = selectedMapId
		? availableModes.filter((mode) =>
				mapModeLinks.some(
					(link) =>
						link.map_id === selectedMapId &&
						link.mode_id === mode.id,
				),
			)
		: availableModes;

	const refreshMaps = useCallback(async () => {
		const { data } = await supabase
			.from('match_maps')
			.select(
				'id, match_id, map_number, map_id, mode_id, home_score, away_score, map_winner, status, started_at, ended_at, duration_seconds, maps(name, slug), modes(name, slug, metric_type, unit_label)',
			)
			.eq('match_id', match.id)
			.order('map_number', { ascending: true });

		if (data) setMaps(data as unknown as MatchMap[]);
	}, [match.id, supabase]);

	useEffect(() => {
		const channel = supabase
			.channel(`contributor-match-room:${match.id}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'match_scores',
					filter: `match_id=eq.${match.id}`,
				},
				(payload) => setScore(payload.new as MatchScore),
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'matches',
					filter: `id=eq.${match.id}`,
				},
				(payload) => {
					setMatch((current) => ({
						...current,
						...(payload.new as Partial<MatchRoomMatch>),
					}));
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'match_status_log',
					filter: `match_id=eq.${match.id}`,
				},
				(payload) => {
					if (payload.eventType === 'INSERT') {
						setStatusLogs((current) => [
							payload.new as StatusLog,
							...current,
						]);
					}
				},
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'match_events',
					filter: `match_id=eq.${match.id}`,
				},
				async (payload) => {
					if (payload.eventType === 'UPDATE') {
						const updated = payload.new as MatchEvent;
						setEvents((current) =>
							current.map((event) =>
								event.id === updated.id
									? { ...event, ...updated }
									: event,
							),
						);
						return;
					}

					if (payload.eventType === 'INSERT') {
						const inserted = payload.new as MatchEvent;
						const { data } = await supabase
							.from('match_events')
							.select(
								'*, teams(name, short_code), players(gamertag, real_name)',
							)
							.eq('id', inserted.id)
							.single();

						setEvents((current) => {
							const next = ((data as MatchEvent | null) ??
								inserted) as MatchEvent;
							if (current.some((event) => event.id === next.id))
								return current;
							return [next, ...current].sort(
								(a, b) =>
									numberValue(b.sequence_no) -
									numberValue(a.sequence_no),
							);
						});

						if (
							[
								'map_selected',
								'mode_selected',
								'score_update',
								'map_end',
							].includes(inserted.event_type)
						) {
							void refreshMaps();
						}
					}
				},
			)
			.subscribe();

		return () => {
			void supabase.removeChannel(channel);
		};
	}, [match.id, refreshMaps, supabase]);

	async function edgeCall(
		functionName: string,
		body: Record<string, unknown>,
	) {
		setError(null);
		setMessage(null);

		const {
			data: { session },
		} = await supabase.auth.getSession();

		if (!session?.access_token) {
			throw new Error('Your session has expired. Please sign in again.');
		}

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.access_token}`,
					apikey:
						process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			},
		);
		const data = (await response.json().catch(() => null)) as unknown;

		if (!response.ok) {
			throw new Error(getEdgeError(data));
		}

		return data;
	}

	async function refreshBrResults() {
		const { data } = await supabase
			.from('br_match_results')
			.select(
				'id, participant_id, placement, kills, placement_pts, kill_pts, total_pts',
			)
			.eq('match_id', match.id)
			.order('placement', { ascending: true });

		if (data) setBrResults(data as unknown as BrResult[]);
	}

	async function runAction(label: string, action: () => Promise<unknown>) {
		setPending(label);
		try {
			await action();
			setMessage('Saved');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setPending(null);
		}
	}

	async function updateStatus(nextStatus: Status) {
		await runAction(`status-${nextStatus}`, async () => {
			await edgeCall('trigger-match-status', {
				match_id: match.id,
				new_status: nextStatus,
				reason: statusReason || null,
			});
			setStatusReason('');
		});
	}

	async function postFootballEvent() {
		await runAction('event', async () => {
			await edgeCall('post-match-event', {
				match_id: match.id,
				event_type: eventType,
				team_id: selectedEventConfig.noTeam
					? null
					: eventTeamId || null,
				player_id: selectedEventConfig.noTeam
					? null
					: eventPlayerId || null,
				value: ['goal', 'own_goal', 'penalty_goal'].includes(eventType)
					? 1
					: null,
				meta: eventMinute ? { minute: Number(eventMinute) } : {},
			});
			setEventMinute('');
		});
	}

	async function selectMapMode() {
		if (!currentMap) return;
		await runAction('map-mode', async () => {
			await edgeCall('select-map-mode', {
				match_id: match.id,
				match_map_id: currentMap.id,
				map_id: selectedMapId || null,
				mode_id: selectedModeId || null,
				start_map: true,
			});
			await refreshMaps();
		});
	}

	async function postScoreUpdate(teamId: string, value: string) {
		if (!liveMap) return;
		const nextHome =
			teamId === match.team_home_id
				? Number(value)
				: Number(homeScoreInput);
		const nextAway =
			teamId === match.team_away_id
				? Number(value)
				: Number(awayScoreInput);

		await edgeCall('post-match-event', {
			match_id: match.id,
			match_map_id: liveMap.id,
			event_type: 'score_update',
			team_id: teamId,
			value: Number(value),
			meta: {
				home_score: nextHome,
				away_score: nextAway,
				map_number: liveMap.map_number,
			},
		});
	}

	async function updateShooterScore() {
		await runAction('score-update', async () => {
			if (!match.team_home_id || !match.team_away_id) return;
			await postScoreUpdate(match.team_home_id, homeScoreInput);
			await postScoreUpdate(match.team_away_id, awayScoreInput);
			await refreshMaps();
		});
	}

	async function endMap() {
		if (!liveMap) return;
		await runAction('map-end', async () => {
			await edgeCall('post-match-event', {
				match_id: match.id,
				match_map_id: liveMap.id,
				event_type: 'map_end',
				meta: {
					map_number: liveMap.map_number,
					duration_seconds: durationMinutes
						? Math.round(Number(durationMinutes) * 60)
						: null,
				},
			});
			setDurationMinutes('');
			await refreshMaps();
		});
	}

	async function correctEvent() {
		await runAction('correction', async () => {
			await edgeCall('correct-match-event', {
				match_id: match.id,
				corrected_event_id: correctionEventId,
				reason: correctionReason || null,
				replacement_event_type: replacementType || null,
				replacement_team_id: replacementType
					? eventTeamId || null
					: null,
				replacement_player_id: replacementType
					? eventPlayerId || null
					: null,
				replacement_value: [
					'goal',
					'own_goal',
					'penalty_goal',
				].includes(replacementType)
					? 1
					: null,
				replacement_meta:
					replacementType && eventMinute
						? { minute: Number(eventMinute) }
						: {},
			});
			setCorrectionEventId('');
			setCorrectionReason('');
			setReplacementType('');
		});
	}

	async function submitBrResults() {
		await runAction('br-results', async () => {
			await edgeCall('post-br-results', {
				match_id: match.id,
				results: brRows,
			});
			await refreshBrResults();
		});
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between gap-4">
				<a
					href="/contributor"
					className="text-sm text-gray-400 hover:text-white"
				>
					Back to matches
				</a>
				<div className="flex items-center gap-3">
					{message ? (
						<span className="text-sm text-green-300">
							{message}
						</span>
					) : null}
					{error ? (
						<span className="text-sm text-red-300">{error}</span>
					) : null}
				</div>
			</div>

			<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
							<span>
								{match.comp_instances?.name ?? 'Competition'}
							</span>
							<span>
								{match.comp_stages?.name ?? 'Stage TBD'}
							</span>
							<span>{match.game_titles?.name ?? 'Game'}</span>
						</div>
						<h2 className="mt-3 text-2xl font-bold">
							{isBattleRoyale
								? 'Battle Royale Match'
								: `${teamName(match.home_team)} vs ${teamName(match.away_team)}`}
						</h2>
						<p className="mt-2 text-sm text-gray-500">
							Scheduled {formatDate(match.scheduled_at)} - Best of{' '}
							{match.best_of}
						</p>
					</div>
					<span
						className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase ${statusClass(match.status)}`}
					>
						{match.status === 'live' ? 'Live' : match.status}
					</span>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
				<div className="space-y-6">
					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<div className="mb-5 flex items-center justify-between">
							<h3 className="font-semibold">Live Scoreboard</h3>
							<span className="text-xs text-gray-500">
								Updated {formatDate(score?.updated_at ?? null)}
							</span>
						</div>

						{isBattleRoyale ? (
							<div className="overflow-x-auto">
								<table className="w-full min-w-140 text-sm">
									<thead className="text-left text-xs uppercase text-gray-500">
										<tr>
											<th className="py-2">#</th>
											<th>Participant</th>
											<th>Kills</th>
											<th>Placement Pts</th>
											<th>Kill Pts</th>
											<th>Total</th>
										</tr>
									</thead>
									<tbody>
										{brResults.map((result) => {
											const participant =
												participants.find(
													(item) =>
														item.id ===
														result.participant_id,
												);
											return (
												<tr
													key={result.id}
													className="border-t border-gray-800"
												>
													<td className="py-3">
														{result.placement}
													</td>
													<td>
														{participant
															? participantName(
																	participant,
																)
															: 'Participant'}
													</td>
													<td>{result.kills}</td>
													<td>
														{result.placement_pts}
													</td>
													<td>{result.kill_pts}</td>
													<td className="font-semibold">
														{result.total_pts}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
								{brResults.length === 0 ? (
									<p className="py-6 text-center text-sm text-gray-500">
										No BR results posted yet.
									</p>
								) : null}
							</div>
						) : (
							<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
								<div>
									<p className="text-sm text-gray-500">
										{match.home_team?.short_code}
									</p>
									<p className="text-lg font-semibold">
										{teamName(match.home_team)}
									</p>
								</div>
								<div className="rounded-lg bg-gray-950 px-6 py-4 text-4xl font-bold">
									{numberValue(score?.home_current_score)}
									<span className="px-4 text-gray-600">
										-
									</span>
									{numberValue(score?.away_current_score)}
								</div>
								<div className="text-right">
									<p className="text-sm text-gray-500">
										{match.away_team?.short_code}
									</p>
									<p className="text-lg font-semibold">
										{teamName(match.away_team)}
									</p>
								</div>
							</div>
						)}
					</section>

					{isShooter && !isBattleRoyale ? (
						<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
							<h3 className="mb-4 font-semibold">
								Map Breakdown
							</h3>
							<div className="space-y-3">
								{maps.map((map) => (
									<div
										key={map.id}
										className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950 p-4 md:grid-cols-[80px_1fr_120px_120px]"
									>
										<p className="font-semibold">
											Map {map.map_number}
										</p>
										<p className="text-sm text-gray-300">
											{map.maps?.name ?? 'Map TBD'} -{' '}
											{map.modes?.name ?? 'Mode TBD'}
										</p>
										<p className="text-sm">
											{numberValue(map.home_score)} -{' '}
											{numberValue(map.away_score)}
										</p>
										<p className="text-xs uppercase text-gray-500">
											{map.status}
										</p>
									</div>
								))}
							</div>
						</section>
					) : null}

					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Event Logging</h3>

						{isFootball ? (
							<div className="grid gap-4 md:grid-cols-2">
								<label className="text-sm text-gray-400">
									Event
									<select
										value={eventType}
										onChange={(event) =>
											setEventType(event.target.value)
										}
										className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
									>
										{FOOTBALL_EVENTS.map((item) => (
											<option
												key={item.type}
												value={item.type}
											>
												{item.label}
											</option>
										))}
									</select>
								</label>
								<label className="text-sm text-gray-400">
									Team
									<select
										value={eventTeamId}
										onChange={(event) => {
											setEventTeamId(event.target.value);
											setEventPlayerId('');
										}}
										disabled={selectedEventConfig.noTeam}
										className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white disabled:opacity-50"
									>
										{match.home_team ? (
											<option value={match.home_team.id}>
												{match.home_team.name}
											</option>
										) : null}
										{match.away_team ? (
											<option value={match.away_team.id}>
												{match.away_team.name}
											</option>
										) : null}
									</select>
								</label>
								<label className="text-sm text-gray-400">
									Player
									<select
										value={eventPlayerId}
										onChange={(event) =>
											setEventPlayerId(event.target.value)
										}
										disabled={selectedEventConfig.noTeam}
										className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white disabled:opacity-50"
									>
										<option value="">No player</option>
										{eventPlayers.map((lineup) => (
											<option
												key={lineup.id}
												value={lineup.players?.id ?? ''}
											>
												{lineup.players?.gamertag ??
													'Player'}
											</option>
										))}
									</select>
								</label>
								<label className="text-sm text-gray-400">
									Minute
									<input
										value={eventMinute}
										onChange={(event) =>
											setEventMinute(event.target.value)
										}
										type="number"
										min="0"
										className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
									/>
								</label>
								<button
									type="button"
									onClick={postFootballEvent}
									disabled={pending === 'event'}
									className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 md:col-span-2"
								>
									Log Event
								</button>
							</div>
						) : null}

						{isShooter && !isBattleRoyale ? (
							<div className="space-y-5">
								<div className="grid gap-4 md:grid-cols-3">
									<label className="text-sm text-gray-400">
										Map Slot
										<select
											value={mapSlotId}
											onChange={(event) =>
												setMapSlotId(event.target.value)
											}
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										>
											{maps.map((map) => (
												<option
													key={map.id}
													value={map.id}
												>
													Map {map.map_number} -{' '}
													{map.status}
												</option>
											))}
										</select>
									</label>
									<label className="text-sm text-gray-400">
										Map
										<select
											value={selectedMapId}
											onChange={(event) => {
												setSelectedMapId(
													event.target.value,
												);
												setSelectedModeId('');
											}}
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										>
											<option value="">Select map</option>
											{availableMaps.map((map) => (
												<option
													key={map.id}
													value={map.id}
												>
													{map.name}
												</option>
											))}
										</select>
									</label>
									<label className="text-sm text-gray-400">
										Mode
										<select
											value={selectedModeId}
											onChange={(event) =>
												setSelectedModeId(
													event.target.value,
												)
											}
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										>
											<option value="">
												Select mode
											</option>
											{allowedModes.map((mode) => (
												<option
													key={mode.id}
													value={mode.id}
												>
													{mode.name}
												</option>
											))}
										</select>
									</label>
									<button
										type="button"
										onClick={selectMapMode}
										disabled={
											pending === 'map-mode' ||
											(!selectedMapId && !selectedModeId)
										}
										className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 md:col-span-3"
									>
										Start Map
									</button>
								</div>
								<div className="grid gap-4 md:grid-cols-4">
									<label className="text-sm text-gray-400">
										Home Score
										<input
											value={homeScoreInput}
											onChange={(event) =>
												setHomeScoreInput(
													event.target.value,
												)
											}
											type="number"
											min="0"
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										/>
									</label>
									<label className="text-sm text-gray-400">
										Away Score
										<input
											value={awayScoreInput}
											onChange={(event) =>
												setAwayScoreInput(
													event.target.value,
												)
											}
											type="number"
											min="0"
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										/>
									</label>
									<label className="text-sm text-gray-400">
										Duration Min
										<input
											value={durationMinutes}
											onChange={(event) =>
												setDurationMinutes(
													event.target.value,
												)
											}
											type="number"
											min="0"
											className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
										/>
									</label>
									<div className="flex items-end gap-2">
										<button
											type="button"
											onClick={updateShooterScore}
											disabled={
												pending === 'score-update' ||
												!liveMap
											}
											className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
										>
											Update Score
										</button>
										<button
											type="button"
											onClick={endMap}
											disabled={
												pending === 'map-end' ||
												!liveMap
											}
											className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50"
										>
											End Map
										</button>
									</div>
								</div>
							</div>
						) : null}

						{isBattleRoyale ? (
							<div className="space-y-3">
								{brRows.map((row, index) => {
									const participant = participants.find(
										(item) =>
											item.id === row.participant_id,
									);
									return (
										<div
											key={row.participant_id}
											className="grid gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 md:grid-cols-[1fr_120px_120px]"
										>
											<p className="self-center text-sm">
												{participant
													? participantName(
															participant,
														)
													: `Slot ${index + 1}`}
											</p>
											<input
												value={row.placement}
												onChange={(event) => {
													const placement = Number(
														event.target.value,
													);
													setBrRows((current) =>
														current.map((item) =>
															item.participant_id ===
															row.participant_id
																? {
																		...item,
																		placement,
																	}
																: item,
														),
													);
												}}
												type="number"
												min="1"
												className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
											/>
											<input
												value={row.kills}
												onChange={(event) => {
													const kills = Number(
														event.target.value,
													);
													setBrRows((current) =>
														current.map((item) =>
															item.participant_id ===
															row.participant_id
																? {
																		...item,
																		kills,
																	}
																: item,
														),
													);
												}}
												type="number"
												min="0"
												className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
											/>
										</div>
									);
								})}
								<button
									type="button"
									onClick={submitBrResults}
									disabled={
										pending === 'br-results' ||
										participants.length === 0
									}
									className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
								>
									Submit BR Results
								</button>
							</div>
						) : null}
					</section>

					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Correction Flow</h3>
						<div className="grid gap-4 md:grid-cols-2">
							<label className="text-sm text-gray-400">
								Event to void
								<select
									value={correctionEventId}
									onChange={(event) =>
										setCorrectionEventId(event.target.value)
									}
									className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
								>
									<option value="">
										Select recent event
									</option>
									{visibleEvents
										.filter((event) => !event.is_correction)
										.slice(0, 12)
										.map((event) => (
											<option
												key={event.id}
												value={event.id}
											>
												{eventLabel(event)}
											</option>
										))}
								</select>
							</label>
							<label className="text-sm text-gray-400">
								Optional replacement
								<select
									value={replacementType}
									onChange={(event) =>
										setReplacementType(event.target.value)
									}
									className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
								>
									<option value="">Void only</option>
									{FOOTBALL_EVENTS.filter(
										(item) => !item.noTeam,
									).map((item) => (
										<option
											key={item.type}
											value={item.type}
										>
											{item.label}
										</option>
									))}
								</select>
							</label>
							<label className="text-sm text-gray-400 md:col-span-2">
								Reason
								<input
									value={correctionReason}
									onChange={(event) =>
										setCorrectionReason(event.target.value)
									}
									className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white"
									placeholder="Wrong team credited"
								/>
							</label>
							<button
								type="button"
								onClick={correctEvent}
								disabled={
									pending === 'correction' ||
									!correctionEventId
								}
								className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 md:col-span-2"
							>
								Void Event
							</button>
						</div>
					</section>
				</div>

				<div className="space-y-6">
					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Status Controls</h3>
						<input
							value={statusReason}
							onChange={(event) =>
								setStatusReason(event.target.value)
							}
							className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white"
							placeholder="Reason, if needed"
						/>
						<div className="grid gap-2">
							{VALID_TRANSITIONS[match.status]?.map((action) => (
								<button
									key={action.status}
									type="button"
									onClick={() => updateStatus(action.status)}
									disabled={
										pending === `status-${action.status}`
									}
									className="rounded-lg bg-gray-800 px-4 py-2 text-left text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
								>
									{action.label}
								</button>
							))}
							{VALID_TRANSITIONS[match.status]?.length === 0 ? (
								<p className="rounded-lg bg-gray-950 p-4 text-sm text-gray-500">
									This match is in a terminal state.
								</p>
							) : null}
						</div>
					</section>

					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Live Event Feed</h3>
						<div className="max-h-120 space-y-3 overflow-y-auto pr-1">
							{visibleEvents.map((event) => (
								<div
									key={event.id}
									className="rounded-lg border border-gray-800 bg-gray-950 p-3"
								>
									<p className="text-sm font-medium">
										{eventLabel(event)}
									</p>
									<p className="mt-1 text-xs text-gray-500">
										{formatDate(event.created_at)}
									</p>
								</div>
							))}
							{visibleEvents.length === 0 ? (
								<p className="rounded-lg bg-gray-950 p-4 text-sm text-gray-500">
									No events logged yet.
								</p>
							) : null}
						</div>
					</section>

					<LineupEditorPanel
						matchId={match.id}
						homeTeamId={match.team_home_id}
						awayTeamId={match.team_away_id}
						homeTeamName={teamName(match.home_team)}
						awayTeamName={teamName(match.away_team)}
						eligiblePlayers={eligiblePlayers}
						initialLineup={currentLineup}
					/>

					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Status Timeline</h3>
						<div className="space-y-3">
							{statusLogs.map((log) => (
								<div
									key={log.id}
									className="rounded-lg bg-gray-950 p-3"
								>
									<p className="text-sm">
										{log.old_status ?? 'created'} {'->'}{' '}
										{log.new_status}
									</p>
									<p className="mt-1 text-xs text-gray-500">
										{log.reason ?? 'No reason'} -{' '}
										{formatDate(log.created_at)}
									</p>
								</div>
							))}
							{statusLogs.length === 0 ? (
								<p className="rounded-lg bg-gray-950 p-4 text-sm text-gray-500">
									No status changes yet.
								</p>
							) : null}
						</div>
					</section>

					<section className="rounded-lg border border-gray-800 bg-gray-900 p-5">
						<h3 className="mb-4 font-semibold">Lineups</h3>
						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
							{[match.home_team, match.away_team]
								.filter(Boolean)
								.map((team) => (
									<div
										key={team?.id}
										className="rounded-lg bg-gray-950 p-4"
									>
										<p className="mb-3 text-sm font-semibold">
											{team?.name}
										</p>
										<div className="space-y-2">
											{lineups
												.filter(
													(lineup) =>
														lineup.team_id ===
														team?.id,
												)
												.map((lineup) => (
													<div
														key={lineup.id}
														className="flex items-center justify-between text-sm"
													>
														<span>
															{lineup.players
																?.gamertag ??
																'Player'}
														</span>
														<span className="text-xs text-gray-500">
															{lineup.role}
														</span>
													</div>
												))}
										</div>
									</div>
								))}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
