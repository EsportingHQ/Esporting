'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Match } from '@/hooks/useMatchRealtime';
import { createClient } from '@/lib/supabase/client';
import { one } from '@/lib/utils/array';

interface LineupsTabProps {
	match: Match;
}

type LineupPlayer = {
	id: string;
	name: string;
	role: string;
	position: string;
};

export function LineupsTab({ match }: LineupsTabProps) {
	const [homeLineup, setHomeLineup] = useState<LineupPlayer[]>([]);
	const [awayLineup, setAwayLineup] = useState<LineupPlayer[]>([]);
	const [isConfirmed, setIsConfirmed] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const supabase = createClient();

		(async () => {
			setIsLoading(true);

			if (match.external_source) {
				// PandaScore-synced match — separate external tables, never mixed
				// with organiser data.
				const { data } = await supabase
					.from('external_match_lineups')
					.select(
						'team_id, external_players(id, gamertag, nationality)',
					)
					.eq('match_id', match.id);

				const rows = (data ?? []) as unknown as {
					team_id: string;
					external_players:
						| {
								id: string;
								gamertag: string;
								nationality: string | null;
						  }
						| {
								id: string;
								gamertag: string;
								nationality: string | null;
						  }[]
						| null;
				}[];

				const home: LineupPlayer[] = [];
				const away: LineupPlayer[] = [];
				for (const row of rows) {
					const p = one(row.external_players);
					if (!p) continue;
					const entry = {
						id: p.id,
						name: p.gamertag,
						role: 'starter',
						position: p.nationality ?? '',
					};
					if (row.team_id === match.team_home_id) home.push(entry);
					else if (row.team_id === match.team_away_id)
						away.push(entry);
				}
				setHomeLineup(home);
				setAwayLineup(away);
				setIsConfirmed(rows.length > 0); // PandaScore rosters are always considered final once synced
			} else {
				// Organiser/contributor match — gated on confirmed = true.
				const { data } = await supabase
					.from('match_lineups')
					.select('team_id, role, confirmed, players(id, gamertag)')
					.eq('match_id', match.id)
					.eq('confirmed', true);

				const rows = (data ?? []) as unknown as {
					team_id: string;
					role: string;
					confirmed: boolean;
					players:
						| { id: string; gamertag: string }
						| { id: string; gamertag: string }[]
						| null;
				}[];

				const home: LineupPlayer[] = [];
				const away: LineupPlayer[] = [];
				for (const row of rows) {
					const p = one(row.players);
					if (!p) continue;
					const entry = {
						id: p.id,
						name: p.gamertag,
						role: row.role,
						position: '',
					};
					if (row.team_id === match.team_home_id) home.push(entry);
					else if (row.team_id === match.team_away_id)
						away.push(entry);
				}
				setHomeLineup(home);
				setAwayLineup(away);
				setIsConfirmed(rows.length > 0);
			}

			setIsLoading(false);
		})();
	}, [
		match.id,
		match.external_source,
		match.team_home_id,
		match.team_away_id,
	]);

	if (isLoading) {
		return <p className="text-xs text-text-muted">Loading lineups...</p>;
	}

	if (!isConfirmed) {
		return (
			<div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded text-xs font-data">
				Lineups have not been confirmed for this match yet.
			</div>
		);
	}

	function renderColumn(
		teamName: string | undefined,
		players: LineupPlayer[],
		label: string,
	) {
		return (
			<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
				<div className="flex items-center justify-between border-b border-border-line pb-2">
					<span className="font-display font-bold uppercase text-sm text-accent-readout">
						{teamName}
					</span>
					<span className="text-[10px] font-data text-text-muted">
						{label}
					</span>
				</div>

				<div className="space-y-2 text-xs font-body">
					{players.length === 0 && (
						<p className="text-text-muted italic">
							No confirmed players.
						</p>
					)}
					{players.map((p) => (
						<Link
							key={p.id}
							href={`/players/${p.id}`}
							className="bg-bg-void border border-border-line hover:border-accent-readout/40 px-3 py-2 rounded flex items-center justify-between transition-all group"
						>
							<span className="font-medium text-text-primary group-hover:text-accent-readout transition-colors">
								{p.name}
							</span>
							{p.position && (
								<span className="text-[9px] font-data text-text-muted bg-bg-surface px-1.5 py-0.5 rounded border border-border-line">
									{p.position}
								</span>
							)}
						</Link>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2 border-b border-border-line pb-2">
				<Users className="w-4 h-4 text-accent-readout" />
				<h3 className="font-display font-black text-lg uppercase tracking-wider">
					OFFICIAL SQUAD LINEUPS
				</h3>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{renderColumn(match.team_home?.name, homeLineup, 'HOME SQUAD')}
				{renderColumn(match.team_away?.name, awayLineup, 'AWAY SQUAD')}
			</div>
		</div>
	);
}
