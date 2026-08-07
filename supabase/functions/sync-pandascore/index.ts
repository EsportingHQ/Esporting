import { createClient } from 'jsr:@supabase/supabase-js@2';
/// <reference lib="deno.ns" />

const apiKey = Deno.env.get('PANDASCORE_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const PANDASCORE_COMP_INSTANCE_ID =
  '792ac7cf-cef3-4d49-8e5d-9c08846fbd3e';
const VALORANT_ID = 'fefb9413-9852-4b07-b120-8aba37b810a8';

async function getUpcomingValorantMatches(limit = 5) {
  const url =
    `https://api.pandascore.co/valorant/matches/upcoming?per_page=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PandaScore ${response.status}`);
  }

  return await response.json();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureTeam(name: string) {
  const clean = name.replace(/\s+/g, ' ').trim();
  const slug = slugify(clean);

  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) return existing.id;

  const shortCode = clean
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 6)
    .toUpperCase();

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: clean,
      slug,
      short_code: shortCode,
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

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({}));
    const limit = Number(body.limit ?? 5);

    const matches = await getUpcomingValorantMatches(limit);

    let synced = 0;

    for (const match of matches) {
      const teamAName =
        match.opponents?.[0]?.opponent?.name?.replace(/\s+/g, ' ').trim() ??
        'TBD';

      const teamBName =
        match.opponents?.[1]?.opponent?.name?.replace(/\s+/g, ' ').trim() ??
        'TBD';

      const teamAId = await ensureTeam(teamAName);
      const teamBId = await ensureTeam(teamBName);

      const payload = {
        external_source: 'pandascore',
        external_id: String(match.id),
        comp_instance_id: PANDASCORE_COMP_INSTANCE_ID,
        game_title_id: VALORANT_ID,
        team_home_id: teamAId,
        team_away_id: teamBId,
        match_format: 'head_to_head',
        best_of: 3,
        scheduled_at: match.begin_at,
        status: mapStatus(match.status),
      };

      const { error } = await supabase
        .from('matches')
        .upsert(payload, {
          onConflict: 'external_source,external_id',
        });

      if (error) throw error;

      synced++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        synced,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
});