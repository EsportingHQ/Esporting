import type { SupabaseClient } from '@supabase/supabase-js';

export type RescheduleItem = {
	id: string;
	competitionId: string;
	competitionName: string;
	home: string;
	away: string;
	homeId: string | null;
	awayId: string | null;
	game: string;
	stage: string | null;
	round: number | null;
	originalAt: string | null;
	reason: string | null;
	carryRequested: boolean;
};

type One<T> = T | T[] | null;
const one = <T,>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

// Cancelled matches in these competitions that are waiting for a new date.
export async function loadRescheduleQueue(supabase: SupabaseClient, compIds: string[]): Promise<RescheduleItem[]> {
	if (compIds.length === 0) return [];
	const { data } = await supabase
		.from('matches')
		.select(
			`id, scheduled_at, comp_instance_id, bracket_round, team_home_id, team_away_id, cancel_carry_over,
			 game_titles(name), comp_instances(name), comp_stages(name),
			 home_team:teams!matches_team_home_id_fkey(name),
			 away_team:teams!matches_team_away_id_fkey(name)`,
		)
		.in('comp_instance_id', compIds)
		.eq('status', 'cancelled')
		.is('deleted_at', null)
		.order('scheduled_at', { ascending: true, nullsFirst: false });

	const rows = (data ?? []) as unknown as {
		id: string;
		scheduled_at: string | null;
		comp_instance_id: string;
		bracket_round: number | null;
		team_home_id: string | null;
		team_away_id: string | null;
		cancel_carry_over: boolean | null;
		game_titles: One<{ name: string }>;
		comp_instances: One<{ name: string }>;
		comp_stages: One<{ name: string }>;
		home_team: One<{ name: string }>;
		away_team: One<{ name: string }>;
	}[];
	if (rows.length === 0) return [];

	// The reason the contributor gave when cancelling
	const { data: logs } = await supabase
		.from('match_status_log')
		.select('match_id, reason, created_at')
		.in('match_id', rows.map((r) => r.id))
		.eq('new_status', 'cancelled')
		.order('created_at', { ascending: false });
	const reasonBy = new Map<string, string | null>();
	for (const l of (logs ?? []) as { match_id: string; reason: string | null }[]) {
		if (!reasonBy.has(l.match_id)) reasonBy.set(l.match_id, l.reason);
	}

	return rows.map((r) => ({
		id: r.id,
		competitionId: r.comp_instance_id,
		competitionName: one(r.comp_instances)?.name ?? 'Competition',
		home: one(r.home_team)?.name ?? 'TBD',
		away: one(r.away_team)?.name ?? 'TBD',
		homeId: r.team_home_id,
		awayId: r.team_away_id,
		carryRequested: r.cancel_carry_over === true,
		game: one(r.game_titles)?.name ?? '',
		stage: one(r.comp_stages)?.name ?? null,
		round: r.bracket_round,
		originalAt: r.scheduled_at,
		reason: reasonBy.get(r.id) ?? null,
	}));
}
