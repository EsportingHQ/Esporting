import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import MatchRoomClient, {
	BrResult,
	CatalogueMap,
	CatalogueMode,
	Lineup,
	MapModeLink,
	MatchEvent,
	MatchMap,
	MatchRoomMatch,
	MatchScore,
	Participant,
	StatusLog,
	LineupRow,
} from './MatchRoomClient';

type RoleRow = { roles: { name: string } | { name: string }[] | null };

function first<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null;
	return value ?? null;
}

function normalizeMatch(rawMatch: Record<string, unknown>): MatchRoomMatch {
	return {
		...(rawMatch as MatchRoomMatch),
		game_titles: first(
			rawMatch.game_titles as
				| MatchRoomMatch['game_titles']
				| MatchRoomMatch['game_titles'][],
		),
		comp_instances: first(
			rawMatch.comp_instances as
				| MatchRoomMatch['comp_instances']
				| MatchRoomMatch['comp_instances'][],
		),
		comp_stages: first(
			rawMatch.comp_stages as
				| MatchRoomMatch['comp_stages']
				| MatchRoomMatch['comp_stages'][],
		),
		home_team: first(
			rawMatch.home_team as
				| MatchRoomMatch['home_team']
				| MatchRoomMatch['home_team'][],
		),
		away_team: first(
			rawMatch.away_team as
				| MatchRoomMatch['away_team']
				| MatchRoomMatch['away_team'][],
		),
	};
}

function normalizeEvents(rows: unknown[] | null): MatchEvent[] {
	return (rows ?? []).map((row) => {
		const event = row as Record<string, unknown>;
		return {
			...(event as MatchEvent),
			teams: first(
				event.teams as MatchEvent['teams'] | MatchEvent['teams'][],
			),
			players: first(
				event.players as
					| MatchEvent['players']
					| MatchEvent['players'][],
			),
		};
	});
}

function normalizeMaps(rows: unknown[] | null): MatchMap[] {
	return (rows ?? []).map((row) => {
		const map = row as Record<string, unknown>;
		return {
			...(map as MatchMap),
			maps: first(map.maps as MatchMap['maps'] | MatchMap['maps'][]),
			modes: first(map.modes as MatchMap['modes'] | MatchMap['modes'][]),
		};
	});
}

function normalizeLineups(rows: unknown[] | null): Lineup[] {
	return (rows ?? []).map((row) => {
		const lineup = row as Record<string, unknown>;
		return {
			...(lineup as Lineup),
			players: first(
				lineup.players as Lineup['players'] | Lineup['players'][],
			),
		};
	});
}

function normalizeParticipants(rows: unknown[] | null): Participant[] {
	return (rows ?? []).map((row) => {
		const participant = row as Record<string, unknown>;
		return {
			...(participant as Participant),
			teams: first(
				participant.teams as
					| Participant['teams']
					| Participant['teams'][],
			),
			players: first(
				participant.players as
					| Participant['players']
					| Participant['players'][],
			),
		};
	});
}

type EligiblePlayer = { team_id: string; player_id: string; gamertag: string };

function normalizeAssignedPlayers(rows: unknown[] | null): EligiblePlayer[] {
	return (rows ?? []).map((row) => {
		const r = row as {
			team_id: string;
			player_id: string;
			players:
				| { id: string; gamertag: string }
				| { id: string; gamertag: string }[]
				| null;
		};
		const player = first(r.players);
		return {
			team_id: r.team_id,
			player_id: r.player_id,
			gamertag: player?.gamertag ?? 'Unknown',
		};
	});
}

export default async function ContributorMatchRoomPage({
	params,
}: {
	params: Promise<{ matchId: string }>;
}) {
	const { matchId } = await params;
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
		(roleData as RoleRow[] | null)?.flatMap((row) => {
			const rolesValue = row.roles;
			if (!rolesValue) return [];
			return Array.isArray(rolesValue)
				? rolesValue.map((role) => role.name)
				: [rolesValue.name];
		}) ?? [];

	const canAccess =
		roles.includes('super_admin') || roles.includes('contributor');
	if (!canAccess) redirect('/dashboard-redirect');

	const { data: rawMatch, error: matchError } = await supabase
		.from('matches')
		.select(
			`
        id, status, match_format, best_of, scheduled_at, started_at, ended_at,
        home_maps_won, away_maps_won, winner_team_id, team_home_id, team_away_id,
        game_title_id, comp_instance_id, contrib_id,
        game_titles(id, name, slug, short_code, game_types(name, slug)),
        comp_instances(name, slug),
        comp_stages(name),
        home_team:teams!matches_team_home_id_fkey(id, name, short_code, logo_url, country),
        away_team:teams!matches_team_away_id_fkey(id, name, short_code, logo_url, country)
      `,
		)
		.eq('id', matchId)
		.is('deleted_at', null)
		.single();

	if (matchError || !rawMatch) notFound();

	const match = normalizeMatch(rawMatch as Record<string, unknown>);
	const isAssigned =
		(rawMatch as { contrib_id: string | null }).contrib_id === user.id;
	if (!isAssigned && !roles.includes('super_admin')) redirect('/contributor');

	const [
		scoreResult,
		eventsResult,
		statusLogsResult,
		mapsResult,
		lineupsResult,
		catalogueMapsResult,
		catalogueModesResult,
		participantsResult,
		brResultsResult,
		assignedPlayersResult,
		currentLineupResult,
	] = await Promise.all([
		supabase
			.from('match_scores')
			.select(
				'match_id, current_map_id, home_maps_won, away_maps_won, home_current_score, away_current_score, score_breakdown, updated_at',
			)
			.eq('match_id', matchId)
			.maybeSingle(),
		supabase
			.from('match_events')
			.select(
				'id, match_id, match_map_id, event_type, team_id, player_id, value, meta, is_correction, corrected_event_id, is_void, sequence_no, created_at, teams(name, short_code), players(gamertag, real_name)',
			)
			.eq('match_id', matchId)
			.order('sequence_no', { ascending: false })
			.limit(40),
		supabase
			.from('match_status_log')
			.select('id, match_id, old_status, new_status, reason, created_at')
			.eq('match_id', matchId)
			.order('created_at', { ascending: false }),
		supabase
			.from('match_maps')
			.select(
				'id, match_id, map_number, map_id, mode_id, home_score, away_score, map_winner, status, started_at, ended_at, duration_seconds, maps(name, slug), modes(name, slug, metric_type, unit_label)',
			)
			.eq('match_id', matchId)
			.order('map_number', { ascending: true }),
		supabase
			.from('match_lineups')
			.select(
				'id, team_id, role, players(id, gamertag, real_name, avatar_url, country)',
			)
			.eq('match_id', matchId)
			.order('created_at', { ascending: true }),
		supabase
			.from('maps')
			.select('id, name, slug')
			.eq('game_title_id', match.game_title_id)
			.eq('is_active', true)
			.eq('is_approved', true)
			.order('name', { ascending: true }),
		supabase
			.from('modes')
			.select('id, name, slug, metric_type, unit_label')
			.eq('game_title_id', match.game_title_id)
			.eq('is_active', true)
			.order('name', { ascending: true }),
		supabase
			.from('match_participants')
			.select(
				'id, slot_number, team_id, player_id, teams(name, short_code, logo_url), players(gamertag, avatar_url)',
			)
			.eq('match_id', matchId)
			.order('slot_number', { ascending: true }),
		supabase
			.from('br_match_results')
			.select(
				'id, participant_id, placement, kills, placement_pts, kill_pts, total_pts',
			)
			.eq('match_id', matchId)
			.order('placement', { ascending: true }),
		supabase
			.from('player_game_assignments')
			.select('team_id, player_id, players(id, gamertag)')
			.eq('comp_instance_id', match.comp_instance_id)
			.eq('game_title_id', match.game_title_id)
			.in(
				'team_id',
				[match.team_home_id, match.team_away_id].filter(
					Boolean,
				) as string[],
			)
			.eq('is_active', true),
		supabase
			.from('match_lineups')
			.select('id, team_id, player_id, role, confirmed')
			.eq('match_id', matchId),
	]);

	const mapIds = ((catalogueMapsResult.data ?? []) as CatalogueMap[]).map(
		(map) => map.id,
	);
	const { data: rawMapModeLinks } =
		mapIds.length > 0
			? await supabase
					.from('map_mode_links')
					.select('map_id, mode_id')
					.in('map_id', mapIds)
			: { data: [] };

	return (
		<MatchRoomClient
			initialMatch={match}
			initialScore={(scoreResult.data as MatchScore | null) ?? null}
			initialEvents={normalizeEvents(
				eventsResult.data as unknown[] | null,
			)}
			initialStatusLogs={(statusLogsResult.data ?? []) as StatusLog[]}
			initialMaps={normalizeMaps(mapsResult.data as unknown[] | null)}
			lineups={normalizeLineups(lineupsResult.data as unknown[] | null)}
			availableMaps={(catalogueMapsResult.data ?? []) as CatalogueMap[]}
			availableModes={
				(catalogueModesResult.data ?? []) as CatalogueMode[]
			}
			mapModeLinks={(rawMapModeLinks ?? []) as MapModeLink[]}
			participants={normalizeParticipants(
				participantsResult.data as unknown[] | null,
			)}
			initialBrResults={(brResultsResult.data ?? []) as BrResult[]}
			eligiblePlayers={normalizeAssignedPlayers(
				assignedPlayersResult.data as unknown[] | null,
			)}
			currentLineup={(currentLineupResult.data ?? []) as LineupRow[]}
		/>
	);
}
