import { createClient } from 'jsr:@supabase/supabase-js@2';
/// <reference lib="deno.ns" />

const apiKey = Deno.env.get('PANDASCORE_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronSecret = Deno.env.get('CRON_SECRET')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PANDASCORE_COMP_INSTANCE_ID =
  '792ac7cf-cef3-4d49-8e5d-9c08846fbd3e';

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
};

async function getMatches(
  endpoint: string,
  limit = 10,
): Promise<PandaMatch[]> {
  const url = `https://api.pandascore.co${endpoint}?per_page=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `PandaScore ${response.status} for ${url}: ${errorBody}`,
    );
  }

  return await response.json();
}

async function getAllRelevantMatches(
  baseEndpoint: string,
  limit = 10,
): Promise<PandaMatch[]> {
  const [upcoming, running, past] = await Promise.all([
    getMatches(`${baseEndpoint}/upcoming`, limit),
    getMatches(`${baseEndpoint}/running`, limit),
    getMatches(`${baseEndpoint}/past`, limit),
  ]);

  const map = new Map<string, PandaMatch>();
  for (const match of [...upcoming, ...running, ...past]) {
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

async function ensureTeam(
  name: string,
  logoUrl?: string | null,
) {
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

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

Deno.serve(async (req: Request) => {
  // Shared-secret auth. This function is deployed with --no-verify-jwt,
  // so this app-level check is the ONLY thing guarding this endpoint.
  // Do not remove it.
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const game = (body.game ?? 'valorant') as keyof typeof GAME_CONFIG;
    const limit = Number(body.limit ?? 3);

    const config = GAME_CONFIG[game];
    if (!config) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Unsupported game' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const matches = await getAllRelevantMatches(config.endpoint, limit);

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

      if (!teamA || !teamB || !teamAName || !teamBName || teamAName === teamBName) {
        console.log('Skipping incomplete fixture', match.id, teamAName, teamBName);
        continue;
      }

      validMatches.push({ match, teamA, teamB, teamAName, teamBName });
    }

    // ---- Step 2: dedupe teams across the whole batch by slug ----
    // This is what makes concurrent team creation safe — each distinct
    // team is only ever resolved once, so there's no race between two
    // matches trying to insert the same new team at the same time.
    const teamsToResolve = new Map<string, { name: string; logoUrl: string | null }>();

    for (const vm of validMatches) {
      const slugA = slugify(vm.teamAName);
      if (!teamsToResolve.has(slugA)) {
        teamsToResolve.set(slugA, { name: vm.teamAName, logoUrl: vm.teamA.image_url ?? null });
      }
      const slugB = slugify(vm.teamBName);
      if (!teamsToResolve.has(slugB)) {
        teamsToResolve.set(slugB, { name: vm.teamBName, logoUrl: vm.teamB.image_url ?? null });
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
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Failed to resolve team "${info.name}":`, message);
          teamErrors.set(slug, message);
        }
      },
    );

    // ---- Step 4: sync matches concurrently (bounded) ----
    type SyncOutcome = { externalId: string; ok: boolean; error?: string };

    const outcomes = await mapWithConcurrency(
      validMatches,
      CONCURRENCY,
      async ({ match, teamA, teamB, teamAName, teamBName }): Promise<SyncOutcome> => {
        try {
          const teamAId = teamIdBySlug.get(slugify(teamAName));
          const teamBId = teamIdBySlug.get(slugify(teamBName));

          if (!teamAId || !teamBId) {
            throw new Error('Team resolution failed for this match');
          }

          const homeResult = match.results?.find((r) => r.team_id === teamA.id);
          const awayResult = match.results?.find((r) => r.team_id === teamB.id);
          const homeScore = homeResult?.score ?? 0;
          const awayScore = awayResult?.score ?? 0;

          let winnerTeamId: string | null = null;
          if (match.winner_id != null) {
            if (match.winner_id === teamA.id) winnerTeamId = teamAId;
            else if (match.winner_id === teamB.id) winnerTeamId = teamBId;
          }

          const payload = {
            external_source: 'pandascore',
            external_id: String(match.id),
            comp_instance_id: PANDASCORE_COMP_INSTANCE_ID,
            game_title_id: config.gameTitleId,
            team_home_id: teamAId,
            team_away_id: teamBId,
            match_format: 'head_to_head',
            best_of: Number(match.number_of_games) || 3,
            scheduled_at: match.begin_at,
            started_at:
              match.status === 'running' || match.status === 'finished'
                ? match.begin_at ?? new Date().toISOString()
                : null,
            ended_at:
              match.status === 'finished'
                ? match.end_at ?? new Date().toISOString()
                : null,
            status: mapStatus(match.status),
            winner_team_id: winnerTeamId,
            home_maps_won: Number(homeScore) || 0,
            away_maps_won: Number(awayScore) || 0,
          };

          const { data: upsertedMatch, error } = await supabase
            .from('matches')
            .upsert(payload, { onConflict: 'external_source,external_id' })
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
                Array.isArray(match.games) && match.games.length > 0
                  ? {
                      games: match.games.map((g: PandaGame) => {
                        let winner: string | null = null;
                        if (g.winner?.id != null) {
                          if (g.winner.id === teamA.id) winner = teamAName;
                          else if (g.winner.id === teamB.id) winner = teamBName;
                        }
                        return {
                          position: g.position ?? null,
                          status: g.status ?? null,
                          winner,
                          home_score: null,
                          away_score: null,
                          finished_at: g.end_at ?? null,
                        };
                      }),
                    }
                  : null,
              updated_at: new Date().toISOString(),
            })
            .select('match_id')
            .single();

          if (scoreError) throw scoreError;

          return { externalId: String(match.id), ok: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`Failed to sync match ${match.id}:`, message);
          return { externalId: String(match.id), ok: false, error: message };
        }
      },
    );

    const synced = outcomes.filter((o) => o.ok).length;
    const failed = outcomes.filter((o) => !o.ok);

    return new Response(
      JSON.stringify({
        ok: true,
        game,
        synced,
        failed: failed.length,
        ...(failed.length > 0 ? { errors: failed } : {}),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('SYNC ERROR:', error);
    const message = error instanceof Error ? error.message : JSON.stringify(error, null, 2);

    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});