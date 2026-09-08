import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PANDASCORE_API_KEY = process.env.PANDASCORE_API_KEY!;
const BATCH_SIZE = 20; // PandaScore filter[id] comfortably handles small batches

function slugify(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function inferStageType(name: string, hasBracket?: boolean | null): string {
	const lower = name.toLowerCase();
	if (lower.includes('group') || lower.includes('swiss')) return 'group';
	if (hasBracket) return 'knockout';
	return 'league';
}

async function ensureLeague(league: any) {
	const { data: existing } = await supabase
		.from('comp_series')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(league.id))
		.maybeSingle();
	if (existing) return existing.id;

	const name = league.name.replace(/\s+/g, ' ').trim();
	const { data, error } = await supabase
		.from('comp_series')
		.insert({
			name,
			slug: league.slug ?? slugify(name),
			logo_url: league.image_url ?? null,
			external_source: 'pandascore',
			external_id: String(league.id),
		})
		.select('id')
		.single();
	if (error) throw error;
	return data.id;
}

async function ensureSerie(serie: any, seriesId: string, gameTitleId: string) {
	const { data: existing } = await supabase
		.from('comp_instances')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(serie.id))
		.maybeSingle();
	if (existing) return existing.id;

	const name = (serie.full_name ?? `Serie ${serie.id}`)
		.replace(/\s+/g, ' ')
		.trim();
	const { data, error } = await supabase
		.from('comp_instances')
		.insert({
			series_id: seriesId,
			name,
			slug: serie.slug ?? slugify(name),
			edition_label:
				serie.season ?? (serie.year ? String(serie.year) : null),
			format: 'knockout',
			status: 'ongoing',
			starts_at: serie.begin_at ?? null,
			ends_at: serie.end_at ?? null,
			external_source: 'pandascore',
			external_id: String(serie.id),
		})
		.select('id')
		.single();
	if (error) throw error;

	await supabase
		.from('comp_game_titles')
		.upsert(
			{ comp_instance_id: data.id, game_title_id: gameTitleId },
			{ onConflict: 'comp_instance_id,game_title_id' },
		);

	return data.id;
}

async function ensureTournament(
	tournament: any,
	compInstanceId: string,
	gameTitleId: string,
) {
	const { data: existing } = await supabase
		.from('comp_stages')
		.select('id')
		.eq('external_source', 'pandascore')
		.eq('external_id', String(tournament.id))
		.maybeSingle();
	if (existing) return existing.id;

	const name = tournament.name.replace(/\s+/g, ' ').trim();
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

const GAME_TITLE_IDS: Record<string, string> = {
	'cs-go': '84891a91-f9ac-476d-b893-3576cea58d86',
	valorant: 'fefb9413-9852-4b07-b120-8aba37b810a8',
};

async function main() {
	// 1. Find every stuck match's external_id
	const { data: stuck } = await supabase
		.from('matches')
		.select(
			'id, external_id, comp_instance:comp_instances!inner(id, series:comp_series!inner(name))',
		)
		.eq('external_source', 'pandascore')
		.eq('comp_instances.comp_series.name', 'PandaScore External Feed');

	const rows = (stuck ?? []) as unknown as {
		id: string;
		external_id: string;
	}[];
	console.log(`Found ${rows.length} stuck matches`);

	// 2. Batch-fetch real PandaScore data
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE);
		const ids = batch.map((r) => r.external_id).join(',');

		const response = await fetch(
			`https://api.pandascore.co/matches?filter[id]=${ids}&per_page=${BATCH_SIZE}`,
			{ headers: { Authorization: `Bearer ${PANDASCORE_API_KEY}` } },
		);

		if (!response.ok) {
			console.error(`Batch ${i} failed: ${response.status}`);
			continue;
		}

		const pandaMatches = (await response.json()) as any[];
		console.log(
			`Batch ${i}: fetched ${pandaMatches.length}/${batch.length} from PandaScore`,
		);

		for (const pm of pandaMatches) {
			try {
				if (
					!pm.league ||
					!pm.serie ||
					!pm.tournament ||
					!pm.videogame
				) {
					console.log(
						`Match ${pm.id}: missing hierarchy data, skipping`,
					);
					continue;
				}

				const gameTitleId = GAME_TITLE_IDS[pm.videogame.slug];
				if (!gameTitleId) {
					console.log(
						`Match ${pm.id}: unknown videogame slug "${pm.videogame.slug}", skipping`,
					);
					continue;
				}

				const seriesId = await ensureLeague(pm.league);
				const compInstanceId = await ensureSerie(
					pm.serie,
					seriesId,
					gameTitleId,
				);
				const stageId = await ensureTournament(
					pm.tournament,
					compInstanceId,
					gameTitleId,
				);

				const { error } = await supabase
					.from('matches')
					.update({
						comp_instance_id: compInstanceId,
						stage_id: stageId,
					})
					.eq('external_source', 'pandascore')
					.eq('external_id', String(pm.id));

				if (error) throw error;
				console.log(`Fixed match ${pm.id} -> ${pm.league.name}`);
			} catch (err) {
				console.error(`Failed to fix match ${pm.id}:`, err);
			}
		}

		// Small delay between batches — same burst-safety principle as the main sync function.
		await new Promise((r) => setTimeout(r, 500));
	}

	console.log('Backfill complete.');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
