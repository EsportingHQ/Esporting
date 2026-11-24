'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Player = { id: string; gamertag: string };
type TeamRef = { id: string; name: string };

export type LineupGate = {
	lineupReady: boolean;
	mvpReady: boolean;
	// Why the match cannot start or end yet, or null when it can
	startBlocker: string | null;
	endBlocker: string | null;
};

type Props = {
	matchId: string;
	compId: string;
	gameId: string;
	status: string;
	mvpRequired: boolean;
	teams: TeamRef[];
	initialLineups: { team_id: string; player_id: string }[];
	initialMvpId: string | null;
	onGateChange: (gate: LineupGate) => void;
};

function computeGate(
	teams: TeamRef[],
	squads: Record<string, Player[]>,
	selected: Record<string, string[]>,
	mvpId: string | null,
	mvpRequired: boolean,
): LineupGate {
	const missing = teams.find((t) => (squads[t.id]?.length ?? 0) > 0 && (selected[t.id]?.length ?? 0) === 0);
	const anyPlayed = teams.some((t) => (selected[t.id]?.length ?? 0) > 0);
	const lineupReady = !missing;
	const mvpReady = !mvpRequired || !anyPlayed || !!mvpId;
	return {
		lineupReady,
		mvpReady,
		startBlocker: missing ? `Select who is playing for ${missing.name} first (Who played).` : null,
		endBlocker: missing
			? `Select who played for ${missing.name} first (Who played).`
			: !mvpReady
				? 'Pick the match MVP before ending the match.'
				: null,
	};
}

export default function LineupPanel({
	matchId,
	compId,
	gameId,
	status,
	mvpRequired,
	teams,
	initialLineups,
	initialMvpId,
	onGateChange,
}: Props) {
	const supabase = useMemo(() => createClient(), []);
	const [squads, setSquads] = useState<Record<string, Player[]> | null>(null);
	const [selected, setSelected] = useState<Record<string, string[]>>(() => {
		const out: Record<string, string[]> = {};
		for (const l of initialLineups) (out[l.team_id] ??= []).push(l.player_id);
		return out;
	});
	const [mvpId, setMvpId] = useState<string | null>(initialMvpId);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const locked = status === 'completed' || status === 'cancelled';
	const teamKey = teams.map((t) => t.id).join(',');

	// Load each team's squad for this competition and game
	useEffect(() => {
		let cancelled = false;
		(async () => {
			const out: Record<string, Player[]> = {};
			for (const teamId of teamKey ? teamKey.split(',') : []) {
				const { data } = await supabase
					.from('player_game_assignments')
					.select('players(id, gamertag)')
					.eq('comp_instance_id', compId)
					.eq('game_title_id', gameId)
					.eq('team_id', teamId)
					.eq('is_active', true);
				const rows = (data ?? []) as unknown as { players: Player | Player[] | null }[];
				out[teamId] = rows
					.map((r) => (Array.isArray(r.players) ? r.players[0] : r.players))
					.filter((p): p is Player => !!p)
					.sort((a, b) => a.gamertag.localeCompare(b.gamertag));
			}
			if (cancelled) return;
			setSquads(out);
			onGateChange(computeGate(teams, out, selected, mvpId, mvpRequired));
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [supabase, compId, gameId, teamKey]);

	async function toggle(teamId: string, playerId: string) {
		if (locked || busy || !squads) return;
		const current = selected[teamId] ?? [];
		const next = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
		setBusy(true);
		setError(null);
		const { error: err } = await supabase.rpc('set_match_lineup', {
			p_match: matchId,
			p_team: teamId,
			p_players: next,
		});
		setBusy(false);
		if (err) {
			setError(err.message);
			return;
		}
		const nextSel = { ...selected, [teamId]: next };
		// An MVP who was taken out of the lineup is cleared by the database too
		const stillIn = mvpId ? Object.values(nextSel).some((ids) => ids.includes(mvpId)) : false;
		const nextMvp = stillIn ? mvpId : null;
		setSelected(nextSel);
		setMvpId(nextMvp);
		onGateChange(computeGate(teams, squads, nextSel, nextMvp, mvpRequired));
	}

	async function chooseMvp(playerId: string) {
		if (locked || busy || !squads) return;
		setBusy(true);
		setError(null);
		const { error: err } = await supabase.rpc('set_match_mvp', {
			p_match: matchId,
			p_player: playerId || null,
		});
		setBusy(false);
		if (err) {
			setError(err.message);
			return;
		}
		const next = playerId || null;
		setMvpId(next);
		onGateChange(computeGate(teams, squads, selected, next, mvpRequired));
	}

	const played = teams.flatMap((t) =>
		(squads?.[t.id] ?? [])
			.filter((p) => (selected[t.id] ?? []).includes(p.id))
			.map((p) => ({ ...p, team: t.name })),
	);

	return (
		<section className="rounded-lg border border-border-line bg-bg-surface p-5">
			<div className="mb-1 flex items-center justify-between gap-3">
				<h3 className="font-semibold">Who played</h3>
				{locked ? <span className="text-xs text-text-muted">Locked, the match has ended</span> : null}
			</div>
			<p className="mb-4 text-xs text-text-muted">
				Tick the players who are playing. Only they get this match in their form{mvpRequired ? ' and can be MVP' : ''}.
				It must be done before the match goes live.
			</p>

			{squads === null ? (
				<p className="text-sm text-text-muted">Loading squads...</p>
			) : (
				<div className="space-y-4">
					{teams.map((team) => {
						const squad = squads[team.id] ?? [];
						return (
							<div key={team.id}>
								<p className="mb-2 text-sm font-semibold">{team.name}</p>
								{squad.length === 0 ? (
									<p className="text-xs text-text-muted">
										No squad registered for this game, so nothing to select.
									</p>
								) : (
									<div className="flex flex-wrap gap-2">
										{squad.map((p) => {
											const on = (selected[team.id] ?? []).includes(p.id);
											return (
												<button
													key={p.id}
													type="button"
													onClick={() => toggle(team.id, p.id)}
													disabled={locked || busy}
													aria-pressed={on}
													className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
														on
															? 'border-green-500 bg-green-500/15 text-green-700 dark:text-green-300'
															: 'border-border-line bg-bg-void text-text-muted hover:text-text-primary'
													}`}
												>
													{on ? '✓ ' : ''}
													{p.gamertag}
												</button>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{mvpRequired && squads !== null ? (
				<div className="mt-5 border-t border-border-line pt-4">
					<label className="mb-2 block text-sm font-semibold" htmlFor="match-mvp">
						Match MVP
					</label>
					<select
						id="match-mvp"
						value={mvpId ?? ''}
						onChange={(e) => chooseMvp(e.target.value)}
						disabled={locked || busy || played.length === 0}
						className="w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-60"
					>
						<option value="">{played.length === 0 ? 'Select who played first' : 'Choose the MVP'}</option>
						{played.map((p) => (
							<option key={p.id} value={p.id}>
								{p.gamertag} ({p.team})
							</option>
						))}
					</select>
					<p className="mt-1 text-xs text-text-muted">Required before the match can be ended.</p>
				</div>
			) : null}

			{error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
		</section>
	);
}
