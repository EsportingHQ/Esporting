'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MatchCardProps } from '@/components/broadcast/match-card';
import { one } from '@/lib/utils/array';
import { mapGameType } from '@/lib/utils/game-type';

export interface TeamDetail {
	id: string;
	name: string;
	slug: string;
	shortCode: string;
	logoUrl: string | null;
}

export interface TeamPlayer {
	id: string;
	name: string;
	role: string;
	game: string;
}

export interface TeamCompetition {
	name: string;
	slug: string;
	status: string;
}

interface RawTeamRef {
	id: string;
	name: string;
	short_code: string | null;
}

interface RawRecentMatch {
	id: string;
	status: string;
	scheduled_at: string | null;
	home_maps_won: number | null;
	away_maps_won: number | null;
	best_of: number;
	home_team: RawTeamRef | RawTeamRef[] | null;
	away_team: RawTeamRef | RawTeamRef[] | null;
	game_titles: { name: string } | { name: string }[] | null;
	match_scores:
		| { home_current_score: number; away_current_score: number }
		| { home_current_score: number; away_current_score: number }[]
		| null;
}

function isUuid(value: string) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		value,
	);
}

export function useTeamDetail(slug: string) {
	const [team, setTeam] = useState<TeamDetail | null>(null);
	const [roster, setRoster] = useState<TeamPlayer[]>([]);
	const [activeComps, setActiveComps] = useState<TeamCompetition[]>([]);
	const [lastResults, setLastResults] = useState<MatchCardProps[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const supabase = createClient();

		async function load() {
			setIsLoading(true);
			setError(null);
			setNotFound(false);

			try {
				const teamLookup = isUuid(slug)
					? supabase
							.from('teams')
							.select('id, name, slug, short_code, logo_url')
							.eq('id', slug)
							.single()
					: supabase
							.from('teams')
							.select('id, name, slug, short_code, logo_url')
							.eq('slug', slug)
							.single();

				const { data: teamRow, error: teamErr } = await teamLookup;

				if (teamErr || !teamRow) {
					setNotFound(true);
					return;
				}

				setTeam({
					id: teamRow.id,
					name: teamRow.name,
					slug: teamRow.slug,
					shortCode: teamRow.short_code ?? '',
					logoUrl: teamRow.logo_url ?? null,
				});

				// Parallelize all data fetches after team is resolved
				const [
					{ data: rosterRows },
					{ data: externalPlayers },
					{ data: regs },
					{ data: externalCompRows },
					{ data: matches },
				] = await Promise.all([
					// Fetch local team roster
					supabase
						.from('team_rosters')
						.select('players(id, gamertag)')
						.eq('team_id', teamRow.id)
						.is('left_at', null),
					// Fetch external players
					supabase
						.from('external_players')
						.select('id, gamertag, game_titles(name)')
						.eq('external_team_id', teamRow.id),
					// Fetch local team competitions
					supabase
						.from('comp_registrations')
						.select('comp_instances(name, slug, status)')
						.eq('team_id', teamRow.id)
						.eq('status', 'approved'),
					// Fetch external (PandaScore) competitions
					supabase
						.from('matches')
						.select('comp_instances(name, slug, status)')
						.or(
							`team_home_id.eq.${teamRow.id},team_away_id.eq.${teamRow.id}`,
						)
						.eq('external_source', 'pandascore'),
					// Fetch recent completed matches
					supabase
						.from('matches')
						.select(
							`
								id, status, scheduled_at, home_maps_won, away_maps_won, best_of,
								home_team:teams!matches_team_home_id_fkey(id, name, short_code, logo_url),
								away_team:teams!matches_team_away_id_fkey(id, name, short_code, logo_url),
								game_titles(name),
								match_scores(home_current_score, away_current_score)
							`,
						)
						.or(
							`team_home_id.eq.${teamRow.id},team_away_id.eq.${teamRow.id}`,
						)
						.eq('status', 'completed')
						.order('scheduled_at', { ascending: false })
						.limit(10),
				]);

				// Process local roster
				setRoster(
					(rosterRows ?? [])
						.map(
							(r: {
								players:
									| { id: string; gamertag: string }
									| { id: string; gamertag: string }[]
									| null;
							}) => one(r.players),
						)
						.filter(Boolean)
						.map((p) => ({
							id: p!.id,
							name: p!.gamertag,
							role: 'Player',
							game: 'Esports',
						})),
				);

				// Process external players and combine with local roster
				setRoster((prev) => {
					const combined = [
						...prev,
						...(externalPlayers ?? []).map((p) => ({
							id: p.id,
							name: p.gamertag,
							role: 'Player',
							game:
								one(
									p.game_titles as
										| { name: string }
										| { name: string }[]
										| null,
								)?.name ?? 'Esports',
						})),
					];

					return Array.from(
						new Map(
							combined.map((player) => [player.id, player]),
						).values(),
					);
				});

				// Process competitions (local + external)
				const merged = new Map<string, TeamCompetition>();

				for (const r of regs ?? []) {
					const c = one(
						(
							r as {
								comp_instances:
									| TeamCompetition
									| TeamCompetition[]
									| null;
							}
						).comp_instances,
					);
					if (c) merged.set(c.slug, c);
				}

				for (const r of externalCompRows ?? []) {
					const c = one(
						(
							r as {
								comp_instances:
									| TeamCompetition
									| TeamCompetition[]
									| null;
							}
						).comp_instances,
					);
					if (c) merged.set(c.slug, c);
				}

				setActiveComps(Array.from(merged.values()));

				// Process recent matches
				setLastResults(
					((matches ?? []) as RawRecentMatch[]).map((m) => {
						const gameTitle = one(m.game_titles);
						return {
							id: m.id,
							gameType: mapGameType(
								(gameTitle as any)?.game_types?.slug,
							),
							gameTitle: gameTitle?.name ?? 'Match',
							homeTeam: {
								id: one(m.home_team)?.id ?? '',
								name: one(m.home_team)?.name ?? 'TBD',
								shortCode: one(m.home_team)?.short_code ?? '',
							},
							awayTeam: {
								id: one(m.away_team)?.id ?? '',
								name: one(m.away_team)?.name ?? 'TBD',
								shortCode: one(m.away_team)?.short_code ?? '',
							},
							homeScore: one(m.match_scores)?.home_current_score ?? 0,
							awayScore: one(m.match_scores)?.away_current_score ?? 0,
							homeMapsWon: m.home_maps_won ?? undefined,
							awayMapsWon: m.away_maps_won ?? undefined,
							bestOf: m.best_of > 1 ? m.best_of : undefined,
							status: 'completed' as const,
							timeLabel: m.scheduled_at
								? new Date(m.scheduled_at).toLocaleDateString()
								: 'Finished',
						};
					}),
				);
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Failed to load team'),
				);
			} finally {
				setIsLoading(false);
			}
		}

		void load();
	}, [slug]);

	return {
		team,
		roster,
		activeComps,
		lastResults,
		isLoading,
		notFound,
		error,
	};
}
