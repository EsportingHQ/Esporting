import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { getUpcomingValorantMatches } from '../lib/pandascore/valorant';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PANDASCORE_COMP_INSTANCE_ID = '792ac7cf-cef3-4d49-8e5d-9c08846fbd3e';
const VALORANT_ID = 'fefb9413-9852-4b07-b120-8aba37b810a8';

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

async function main() {
	const matches = await getUpcomingValorantMatches(5);

	console.log(`Fetched ${matches.length} Valorant matches`);

	for (const match of matches) {
		const teamAName =
			match.opponents[0]?.opponent?.name?.replace(/\s+/g, ' ').trim() ??
			'TBD';
		const teamBName =
			match.opponents[1]?.opponent?.name?.replace(/\s+/g, ' ').trim() ??
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

		const { error } = await supabase.from('matches').upsert(payload, {
			onConflict: 'external_source,external_id',
		});

		if (error) throw error;

		console.log('Synced:', teamAName, 'vs', teamBName, '|', match.begin_at);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
