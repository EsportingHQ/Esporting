import { createClient } from 'jsr:@supabase/supabase-js@2';
/// <reference lib="deno.ns" />

const apiKey = Deno.env.get('PANDASCORE_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

// How many matches/teams to process concurrently per invocation.
// Bounded on purpose — unbounded Promise.all() over 20-30 matches would
// hammer the DB connection pool and likely trade one timeout problem
// for another.
const CONCURRENCY = 6;

const GAME_CONFIG = {
	valorant: {
		endpoint: '/valorant/matches',
		gameTitleId: 'fefb9413-9852-4b07-b120-8aba37b810a8',
	},
	csgo: {
		endpoint: '/csgo/matches',
		gameTitleId: '84891a91-f9ac-476d-b893-3576cea58d86',
	},
} as const;

type PandaResult = {
	score?: number | null;
	team_id?: number | null;
};

type PandaGameWinner = {
	id?: number | null;
	type?: string | null;
};

type PandaGame = {
	id?: number | null;
	position?: number | null;
	status?: string | null;
	complete?: boolean | null;
	finished?: boolean | null;
	length?: number | null;
	begin_at?: string | null;
	end_at?: string | null;
	forfeit?: boolean | null;
	winner_type?: string | null;
	winner?: PandaGameWinner | null;
};

type PandaOpponent = {
	type?: string | null;
	opponent?: {
		id?: number | null;
		name?: string | null;
		location?: string | null;
		slug?: string | null;
		acronym?: string | null;
		image_url?: string | null;
		dark_mode_image_url?: string | null;
	} | null;
};

type PandaMatch = {
	id: number | string;
	status: string;
	begin_at?: string | null;
	end_at?: string | null;
	original_scheduled_at?: string | null;
	scheduled_at?: string | null;
	number_of_games?: number | null;
	match_type?: string | null;
	winner_type?: string | null;
	winner_id?: number | null;
	draw?: boolean | null;

	opponents?: PandaOpponent[];
	results?: PandaResult[];
	games?: PandaGame[];

	league?: PandaLeague | null;
	serie?: PandaSerie | null;
	tournament?: PandaTournament | null;
};

type PandaLeague = {
	id: number;
	name: string;
	slug?: string | null;
	image_url?: string | null;
};

type PandaSerie = {
	id: number;
	full_name?: string | null;
	season?: string | null;
	year?: number | null;
	slug?: string | null;
	begin_at?: string | null;
	end_at?: string | null;
	league_id?: number | null;
};

type PandaTournament = {
	id: number;
	name: string;
	slug?: string | null;
	begin_at?: string | null;
	end_at?: string | null;
	serie_id?: number | null;
	has_bracket?: boolean | null;
};

type PandaPlayer = {
	id: number;
	name: string;
	first_name?: string | null;
	last_name?: string | null;
	nationality?: string | null;
	image_url?: string | null;
};

type PandaRosterTeam = {
	id: number;
	players: PandaPlayer[];
};

type PandaRostersResponse = {
	rosters: PandaRosterTeam[];
};

async function getTournamentRosters(
	tournamentId: number,
): Promise<PandaRosterTeam[]> {
	// NOTE: This endpoint is Pro-only on PandaScore free tier.
	// Keeping function for future Pro upgrade, but disabled in sync flow.
	const url = `https://api.pandascore.co/tournaments/${tournamentId}/rosters`;
	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json',
		},
	});

	if (!response.ok) {
		console.error(
			`Failed to fetch rosters for tournament ${tournamentId}: ${response.status}`,
		);
		return [];
	}

	const data = (await response.json()) as PandaRostersResponse;
	return data.rosters ?? [];
}

async function ensureExternalPlayer(
	player: PandaPlayer,
	teamId: string,
	gameTitleId: string,
) {
	const { data: existing, error: existingError } = await supabase
		.from('external_players')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(player.id))
		.maybeSingle();

	if (existingError) throw existingError;

	const gamertag = player.name.replace(/\s+/g, ' ').trim();
	const realName =
		[player.first_name, player.last_name]
			.filter(Boolean)
			.join(' ')
			.trim() || null;

	if (existing) {
		// Keep team/name fresh on re-sync (transfers, name changes).
		const { error } = await supabase
			.from('external_players')
			.update({
				gamertag,
				real_name: realName,
				nationality: player.nationality ?? null,
				image_url: player.image_url ?? null,
				external_team_id: teamId,
				updated_at: new Date().toISOString(),
				game_title_id: gameTitleId,
			})
			.eq('id', existing.id);
		if (error) throw error;
		return existing.id;
	}

	const { data, error } = await supabase
		.from('external_players')
		.insert({
			external_source: 'pandascore',
			external_id: String(player.id),
			gamertag,
			real_name: realName,
			nationality: player.nationality ?? null,
			image_url: player.image_url ?? null,
			external_team_id: teamId,
			game_title_id: gameTitleId,
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id;
}

async function syncLineupForCompletedMatch(
	matchId: string,
	tournamentId: number,
	teamAId: string,
	teamAPandaId: number,
	teamBId: string,
	teamBPandaId: number,
	gameTitleId: string,
) {
	const rosters = await getTournamentRosters(tournamentId);

	const rosterA = rosters.find((r) => r.id === teamAPandaId)?.players ?? [];
	const rosterB = rosters.find((r) => r.id === teamBPandaId)?.players ?? [];

	for (const [roster, teamId] of [
		[rosterA, teamAId],
		[rosterB, teamBId],
	] as const) {
		for (const player of roster) {
			try {
				const externalPlayerId = await ensureExternalPlayer(
					player,
					teamId,
					gameTitleId,
				);
				const { error } = await supabase
					.from('external_match_lineups')
					.upsert(
						{
							match_id: matchId,
							team_id: teamId,
							external_player_id: externalPlayerId,
						},
						{ onConflict: 'match_id,external_player_id' },
					);
				if (error) throw error;
			} catch (err) {
				console.error(
					`Failed to sync lineup player ${player.id} for match ${matchId}:`,
					err instanceof Error ? err.message : err,
				);
			}
		}
	}
}

async function getMatches(
	endpoint: string,
	limit = 10,
	onRateLimit?: () => void,
	onQuotaError?: () => void,
): Promise<PandaMatch[]> {
	const separator = endpoint.includes('?') ? '&' : '?';
	const url = `https://api.pandascore.co${endpoint}${separator}per_page=${limit}`;

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
			Accept: 'application/json',
		},
	});

	// Rate limit detection: 429 Too Many Requests
	if (response.status === 429) {
		onRateLimit?.();
		const retryAfter = response.headers.get('Retry-After');
		const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
		console.error(
			`[PandaScore Rate Limited] 429 response. Retry-After: ${waitSeconds}s. URL: ${url}`,
		);
		// Don't retry automatically — let the cron scheduler handle backoff
		throw new Error(
			`PandaScore rate limited (429). Retry after ${waitSeconds}s`,
		);
	}

	if (!response.ok) {
		const errorBody = await response.text();
		// Log quota-related errors separately for monitoring
		if (response.status === 403) {
			onQuotaError?.();
			console.error(
				`[PandaScore Quota Error] 403 Forbidden for ${url}: ${errorBody}`,
			);
		}
		throw new Error(
			`PandaScore ${response.status} for ${url}: ${errorBody}`,
		);
	}

	return await response.json();
}

async function getAllRelevantMatches(
	baseEndpoint: string,
	limit = 10,
	onRateLimit?: () => void,
	onQuotaError?: () => void,
): Promise<PandaMatch[]> {
	const upcoming = await getMatches(
		`${baseEndpoint}/upcoming`,
		limit,
		onRateLimit,
		onQuotaError,
	);
	const running = await getMatches(
		`${baseEndpoint}/running`,
		limit,
		onRateLimit,
		onQuotaError,
	);
	const past = await getMatches(
		`${baseEndpoint}/past`,
		limit,
		onRateLimit,
		onQuotaError,
	);
	const canceled = await getMatches(
		`${baseEndpoint}?filter[status]=canceled`,
		limit,
		onRateLimit,
		onQuotaError,
	);

	const map = new Map<string, PandaMatch>();
	for (const match of [...upcoming, ...running, ...past, ...canceled]) {
		map.set(String(match.id), match);
	}

	return Array.from(map.values());
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

async function logQuotaMetrics(
	source: string,
	rateLimitHits: number,
	quotaErrors: number,
	syncedCount: number,
	game: string,
) {
	try {
		const logsToInsert = [];

		if (rateLimitHits > 0) {
			logsToInsert.push({
				source,
				metric_type: 'rate_limit',
				count: rateLimitHits,
				endpoint: `/pandascore/matches?game=${game}`,
				status_code: 429,
				metadata: { game },
			});
		}

		if (quotaErrors > 0) {
			logsToInsert.push({
				source,
				metric_type: 'quota_error',
				count: quotaErrors,
				endpoint: `/pandascore/matches?game=${game}`,
				status_code: 403,
				metadata: { game },
			});
		}

		if (syncedCount > 0) {
			logsToInsert.push({
				source,
				metric_type: 'sync_success',
				count: syncedCount,
				endpoint: `/pandascore/matches?game=${game}`,
				status_code: 200,
				metadata: { game },
			});
		}

		if (logsToInsert.length > 0) {
			const { error } = await supabase
				.from('api_quota_logs')
				.insert(logsToInsert);

			if (error) {
				console.error('Failed to log quota metrics:', error);
			} else {
				console.log(
					`Logged ${logsToInsert.length} quota metric entries`,
				);
			}
		}
	} catch (err) {
		console.error('Error logging quota metrics:', err);
		// Don't throw — metrics logging shouldn't block sync
	}
}

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function inferStageType(
	tournamentName: string,
	hasBracket?: boolean | null,
): string {
	const lower = tournamentName.toLowerCase();
	if (lower.includes('group')) return 'group';
	if (lower.includes('swiss')) return 'group';
	if (hasBracket) return 'knockout';
	return 'league';
}

async function ensureTeam(name: string, logoUrl?: string | null) {
	const clean = name.replace(/\s+/g, ' ').trim();
	const slug = slugify(clean);

	const { data: existing, error: existingError } = await supabase
		.from('teams')
		.select('id')
		.eq('slug', slug)
		.is('deleted_at', null)
		.maybeSingle();

	if (existingError) throw existingError;

	if (existing) {
		if (logoUrl) {
			const { error } = await supabase
				.from('teams')
				.update({ logo_url: logoUrl })
				.eq('id', existing.id);

			if (error) throw error;
		}
		return existing.id;
	}

	const shortCode = clean
		.split(' ')
		.map((part) => part[0])
		.join('')
		.slice(0, 6)
		.toUpperCase();

	const { data, error } = await supabase
		.from('teams')
		.insert({
			name: clean,
			slug,
			short_code: shortCode,
			logo_url: logoUrl ?? null,
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id;
}

function mapStatus(status: string) {
	switch (status) {
		case 'running':
			return 'live';
		case 'finished':
			return 'completed';
		case 'not_started':
			return 'scheduled';
		case 'canceled':
		case 'postponed':
			return 'cancelled';
		default:
			return 'scheduled';
	}
}

// Runs `fn` over `items` with at most `limit` in flight at once.
// Every call is expected to handle its own errors internally (return a
// result object rather than throwing) so one failure never aborts the
// others already running.
async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	let cursor = 0;

	async function worker() {
		while (cursor < items.length) {
			const current = cursor++;
			results[current] = await fn(items[current], current);
		}
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		worker(),
	);
	await Promise.all(workers);

	return results;
}

async function ensureLeague(league: {
	id: number;
	name: string;
	slug?: string | null;
	image_url?: string | null;
}) {
	const { data: existing, error: existingError } = await supabase
		.from('comp_series')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(league.id))
		.maybeSingle();

	if (existingError) throw existingError;
	if (existing) return existing.id;

	const cleanName = league.name.replace(/\s+/g, ' ').trim();
	const slug = league.slug ?? slugify(cleanName);

	const { data, error } = await supabase
		.from('comp_series')
		.insert({
			name: cleanName,
			slug,
			logo_url: league.image_url ?? null,
			external_source: 'pandascore',
			external_id: String(league.id),
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id;
}

async function ensureSerie(
	serie: {
		id: number;
		full_name?: string | null;
		season?: string | null;
		year?: number | null;
		slug?: string | null;
		begin_at?: string | null;
		end_at?: string | null;
	},
	seriesId: string,
	gameTitleId: string,
) {
	const { data: existing, error: existingError } = await supabase
		.from('comp_instances')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(serie.id))
		.maybeSingle();

	if (existingError) throw existingError;
	if (existing) return existing.id;

	const name = (serie.full_name ?? `Serie ${serie.id}`)
		.replace(/\s+/g, ' ')
		.trim();
	const slug = serie.slug ?? slugify(name);

	const { data, error } = await supabase
		.from('comp_instances')
		.insert({
			series_id: seriesId,
			name,
			slug,
			edition_label:
				serie.season ?? (serie.year ? String(serie.year) : null),
			format: 'knockout', // PandaScore doesn't expose a round-robin/bracket
			// distinction at this level; 'knockout' is the
			// closest generic fit. Revisit if this needs to
			// be more precise later.
			status: 'ongoing',
			starts_at: serie.begin_at ?? null,
			ends_at: serie.end_at ?? null,
			external_source: 'pandascore',
			external_id: String(serie.id),
		})
		.select('id')
		.single();

	if (error) throw error;

	// Link the game title to this instance so it shows up correctly in
	// any query that joins through comp_game_titles.
	const { error: linkError } = await supabase
		.from('comp_game_titles')
		.upsert(
			{ comp_instance_id: data.id, game_title_id: gameTitleId },
			{ onConflict: 'comp_instance_id,game_title_id' },
		);

	if (linkError) throw linkError;

	return data.id;
}

async function ensureTournament(
	tournament: {
		id: number;
		name: string;
		slug?: string | null;
		begin_at?: string | null;
		end_at?: string | null;
		has_bracket?: boolean | null;
	},
	compInstanceId: string,
	gameTitleId: string,
) {
	const { data: existing, error: existingError } = await supabase
		.from('comp_stages')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(tournament.id))
		.maybeSingle();

	if (existingError) throw existingError;
	if (existing) return existing.id;

	const name = tournament.name.replace(/\s+/g, ' ').trim();

	// stage_order has no PandaScore equivalent — default to 1. Since
	// stages are looked up/deduped by external_id, not by
	// (comp_instance_id, stage_order), this doesn't cause collisions;
	// it just means the ordering isn't meaningful for synced stages yet.
	const { data, error } = await supabase
		.from('comp_stages')
		.insert({
			comp_instance_id: compInstanceId,
			game_title_id: gameTitleId,
			name,
			stage_type: inferStageType(name, tournament.has_bracket),
			stage_order: 1,
			starts_at: tournament.begin_at ?? null,
			ends_at: tournament.end_at ?? null,
			external_source: 'pandascore',
			external_id: String(tournament.id),
		})
		.select('id')
		.single();

	if (error) throw error;
	return data.id;
}

Deno.serve(async (req: Request) => {
	// Shared-secret auth. This function is deployed with --no-verify-jwt,
	// so this app-level check is the ONLY thing guarding this endpoint.
	// Do not remove it.
	const authHeader = req.headers.get('Authorization');
	if (authHeader !== `Bearer ${cronSecret}`) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Unauthorized' }),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	}

	// Track API errors for monitoring
	let rateLimitHits = 0;
	let quotaErrors = 0;

	try {
		const body = await req.json().catch(() => ({}));

		const game = (body.game ?? 'valorant') as keyof typeof GAME_CONFIG;
		const limit = Number(body.limit ?? 3);

		const config = GAME_CONFIG[game];
		if (!config) {
			return new Response(
				JSON.stringify({ ok: false, error: 'Unsupported game' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const matches = await getAllRelevantMatches(config.endpoint, limit, () => {
			rateLimitHits++;
		}, () => {
			quotaErrors++;
		});

		// ---- Step 1: filter out incomplete fixtures up front ----
		type ValidMatch = {
			match: PandaMatch;
			teamA: NonNullable<PandaOpponent['opponent']>;
			teamB: NonNullable<PandaOpponent['opponent']>;
			teamAName: string;
			teamBName: string;
		};

		const validMatches: ValidMatch[] = [];

		for (const match of matches) {
			const teamA = match.opponents?.[0]?.opponent;
			const teamB = match.opponents?.[1]?.opponent;

			const teamAName = teamA?.name?.replace(/\s+/g, ' ').trim();
			const teamBName = teamB?.name?.replace(/\s+/g, ' ').trim();

			if (
				!teamA ||
				!teamB ||
				!teamAName ||
				!teamBName ||
				teamAName === teamBName
			) {
				console.log(
					'Skipping incomplete fixture',
					match.id,
					teamAName,
					teamBName,
				);
				continue;
			}

			validMatches.push({ match, teamA, teamB, teamAName, teamBName });
		}

		// ---- Step 2: dedupe teams across the whole batch by slug ----
		// This is what makes concurrent team creation safe — each distinct
		// team is only ever resolved once, so there's no race between two
		// matches trying to insert the same new team at the same time.
		const teamsToResolve = new Map<
			string,
			{ name: string; logoUrl: string | null }
		>();

		for (const vm of validMatches) {
			const slugA = slugify(vm.teamAName);
			if (!teamsToResolve.has(slugA)) {
				teamsToResolve.set(slugA, {
					name: vm.teamAName,
					logoUrl: vm.teamA.image_url ?? null,
				});
			}
			const slugB = slugify(vm.teamBName);
			if (!teamsToResolve.has(slugB)) {
				teamsToResolve.set(slugB, {
					name: vm.teamBName,
					logoUrl: vm.teamB.image_url ?? null,
				});
			}
		}

		// ---- Step 3: resolve all teams concurrently (bounded) ----
		const teamIdBySlug = new Map<string, string>();
		const teamErrors = new Map<string, string>();

		await mapWithConcurrency(
			Array.from(teamsToResolve.entries()),
			CONCURRENCY,
			async ([slug, info]) => {
				try {
					const id = await ensureTeam(info.name, info.logoUrl);
					teamIdBySlug.set(slug, id);
				} catch (err) {
					const message =
						err instanceof Error ? err.message : String(err);
					console.error(
						`Failed to resolve team "${info.name}":`,
						message,
					);
					teamErrors.set(slug, message);
				}
			},
		);

		// ---- Step 3B: dedupe and resolve leagues, series, tournaments ----
		const leaguesToResolve = new Map<number, PandaLeague>();
		const seriesToResolve = new Map<number, PandaSerie>();
		const tournamentsToResolve = new Map<number, PandaTournament>();

		for (const vm of validMatches) {
			if (vm.match.league && !leaguesToResolve.has(vm.match.league.id)) {
				leaguesToResolve.set(vm.match.league.id, vm.match.league);
			}
			if (vm.match.serie && !seriesToResolve.has(vm.match.serie.id)) {
				seriesToResolve.set(vm.match.serie.id, vm.match.serie);
			}
			if (
				vm.match.tournament &&
				!tournamentsToResolve.has(vm.match.tournament.id)
			) {
				tournamentsToResolve.set(
					vm.match.tournament.id,
					vm.match.tournament,
				);
			}
		}

		// Leagues first — series depend on them.
		const compSeriesIdByLeagueExtId = new Map<number, string>();
		await mapWithConcurrency(
			Array.from(leaguesToResolve.values()),
			CONCURRENCY,
			async (league) => {
				try {
					compSeriesIdByLeagueExtId.set(
						league.id,
						await ensureLeague(league),
					);
				} catch (err) {
					console.error(
						`Failed to resolve league "${league.name}":`,
						err instanceof Error ? err.message : err,
					);
				}
			},
		);

		// Series next — tournaments depend on them.
		const compInstanceIdBySerieExtId = new Map<number, string>();
		await mapWithConcurrency(
			Array.from(seriesToResolve.values()),
			CONCURRENCY,
			async (serie) => {
				try {
					const compSeriesId =
						serie.league_id != null
							? compSeriesIdByLeagueExtId.get(serie.league_id)
							: undefined;
					if (!compSeriesId)
						throw new Error(
							`No resolved league for serie ${serie.id}`,
						);
					compInstanceIdBySerieExtId.set(
						serie.id,
						await ensureSerie(
							serie,
							compSeriesId,
							config.gameTitleId,
						),
					);
				} catch (err) {
					console.error(
						`Failed to resolve serie ${serie.id}:`,
						err instanceof Error ? err.message : err,
					);
				}
			},
		);

		// Tournaments last — matches depend on them.
		const stageIdByTournamentExtId = new Map<number, string>();
		await mapWithConcurrency(
			Array.from(tournamentsToResolve.values()),
			CONCURRENCY,
			async (tournament) => {
				try {
					const compInstanceId =
						tournament.serie_id != null
							? compInstanceIdBySerieExtId.get(
									tournament.serie_id,
								)
							: undefined;
					if (!compInstanceId)
						throw new Error(
							`No resolved serie for tournament ${tournament.id}`,
						);
					stageIdByTournamentExtId.set(
						tournament.id,
						await ensureTournament(
							tournament,
							compInstanceId,
							config.gameTitleId,
						),
					);
				} catch (err) {
					console.error(
						`Failed to resolve tournament ${tournament.id}:`,
						err instanceof Error ? err.message : err,
					);
				}
			},
		);

		// ---- Step 4: sync matches concurrently (bounded) ----
		type SyncOutcome = { externalId: string; ok: boolean; error?: string };

		const outcomes = await mapWithConcurrency(
			validMatches,
			CONCURRENCY,
			async ({
				match,
				teamA,
				teamB,
				teamAName,
				teamBName,
			}): Promise<SyncOutcome> => {
				try {
					const teamAId = teamIdBySlug.get(slugify(teamAName));
					const teamBId = teamIdBySlug.get(slugify(teamBName));

					if (!teamAId || !teamBId) {
						throw new Error(
							'Team resolution failed for this match',
						);
					}

					const compInstanceId =
						match.serie?.id != null
							? compInstanceIdBySerieExtId.get(match.serie.id)
							: undefined;
					if (!compInstanceId)
						throw new Error(
							'No resolved competition instance for this match',
						);

					const stageId =
						match.tournament?.id != null
							? (stageIdByTournamentExtId.get(
									match.tournament.id,
								) ?? null)
							: null;

					const homeResult = match.results?.find(
						(r) => r.team_id === teamA.id,
					);
					const awayResult = match.results?.find(
						(r) => r.team_id === teamB.id,
					);
					const homeScore = homeResult?.score ?? 0;
					const awayScore = awayResult?.score ?? 0;

					let winnerTeamId: string | null = null;
					if (match.winner_id != null) {
						if (match.winner_id === teamA.id)
							winnerTeamId = teamAId;
						else if (match.winner_id === teamB.id)
							winnerTeamId = teamBId;
					}

					const payload = {
						external_source: 'pandascore',
						external_id: String(match.id),
						comp_instance_id: compInstanceId,
						stage_id: stageId,
						game_title_id: config.gameTitleId,
						team_home_id: teamAId,
						team_away_id: teamBId,
						match_format: 'head_to_head',
						best_of: Number(match.number_of_games) || 3,
						scheduled_at: match.begin_at,
						started_at:
							match.status === 'running' ||
							match.status === 'finished'
								? (match.begin_at ?? new Date().toISOString())
								: null,
						ended_at:
							match.status === 'finished'
								? (match.end_at ?? new Date().toISOString())
								: null,
						status: mapStatus(match.status),
						winner_team_id: winnerTeamId,
						home_maps_won: Number(homeScore) || 0,
						away_maps_won: Number(awayScore) || 0,
					};

					const { data: upsertedMatch, error } = await supabase
						.from('matches')
						.upsert(payload, {
							onConflict: 'external_source,external_id',
						})
						.select('id')
						.single();

					if (error) throw error;

					const { error: scoreError } = await supabase
						.from('match_scores')
						.upsert({
							match_id: upsertedMatch.id,
							home_maps_won: Number(homeScore) || 0,
							away_maps_won: Number(awayScore) || 0,
							home_current_score: Number(homeScore) || 0,
							away_current_score: Number(awayScore) || 0,
							score_breakdown:
								Array.isArray(match.games) &&
								match.games.length > 0
									? {
											games: match.games.map(
												(g: PandaGame) => {
													let winner: string | null =
														null;
													if (g.winner?.id != null) {
														if (
															g.winner.id ===
															teamA.id
														)
															winner = teamAName;
														else if (
															g.winner.id ===
															teamB.id
														)
															winner = teamBName;
													}
													return {
														position:
															g.position ?? null,
														status:
															g.status ?? null,
														winner,
														home_score: null,
														away_score: null,
														finished_at:
															g.end_at ?? null,
													};
												},
											),
										}
									: null,
							updated_at: new Date().toISOString(),
						})
						.select('match_id')
						.single();

					if (scoreError) throw scoreError;

					// NOTE: syncLineupForCompletedMatch calls /rosters endpoint
					// which is Pro-only on PandaScore free tier.
					// Disabled to save quota. Re-enable if/when upgrading to Pro.
					// if (
					// 	mapStatus(match.status) === 'completed' &&
					// 	teamA.id != null &&
					// 	teamB.id != null &&
					// 	match.tournament?.id != null
					// ) {
					// 	await syncLineupForCompletedMatch(
					// 		upsertedMatch.id,
					// 		match.tournament.id,
					// 		teamAId,
					// 		teamA.id,
					// 		teamBId,
					// 		teamB.id,
					// 		config.gameTitleId,
					// 	);
					// }

					return { externalId: String(match.id), ok: true };
				} catch (err) {
					const message =
						err instanceof Error ? err.message : String(err);
					console.error(`Failed to sync match ${match.id}:`, message);
					return {
						externalId: String(match.id),
						ok: false,
						error: message,
					};
				}
			},
		);

		const synced = outcomes.filter((o) => o.ok).length;
		const failed = outcomes.filter((o) => !o.ok);

		// Log metrics to database for monitoring
		await logQuotaMetrics(
			'pandascore',
			rateLimitHits,
			quotaErrors,
			synced,
			game,
		);

		return new Response(
			JSON.stringify({
				ok: true,
				game,
				synced,
				failed: failed.length,
				metrics: {
					rateLimitHits,
					quotaErrors,
					timestamp: new Date().toISOString(),
				},
				...(failed.length > 0 ? { errors: failed } : {}),
			}),
			{ headers: { 'Content-Type': 'application/json' } },
		);
	} catch (error) {
		console.error('SYNC ERROR:', error);
		const message =
			error instanceof Error
				? error.message
				: JSON.stringify(error, null, 2);

		return new Response(JSON.stringify({ ok: false, error: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
});
