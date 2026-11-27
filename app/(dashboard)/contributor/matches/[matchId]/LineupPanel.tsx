'use client';

import RosterHistory from '@/components/RosterHistory';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Player = { id: string; gamertag: string };
type TeamRef = { id: string; name: string };
type NewPlayer = { gamertag: string };

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
	initialMvpId: string | null;
	bestOf: number;
	maps: { id: string; map_number: number; status: string; mvp_player_id?: string | null }[];
	onGateChange: (gate: LineupGate) => void;
};

type MapRef = Props['maps'][number];

function computeGate(
	teams: TeamRef[],
	squads: Record<string, Player[]>,
	selected: Record<string, string[]>,
	mvpId: string | null,
	mvpRequired: boolean,
	bestOf: number,
	maps: MapRef[],
	mapMvps: Record<string, string | null>,
): LineupGate {
	const missing = teams.find((t) => (squads[t.id]?.length ?? 0) > 0 && (selected[t.id]?.length ?? 0) === 0);
	const anyPlayed = teams.some((t) => (selected[t.id]?.length ?? 0) > 0);
	const mvpReady = !mvpRequired || !anyPlayed || !!mvpId;
	const confirmMsg = missing ? `Confirm the rosters first (${missing.name} is not confirmed).` : null;
	const missingMap =
		mvpRequired && anyPlayed && bestOf > 1
			? maps.find((m) => m.status === 'completed' && !(mapMvps[m.id] ?? m.mvp_player_id))
			: undefined;
	return {
		lineupReady: !missing,
		mvpReady,
		startBlocker: confirmMsg,
		endBlocker:
			confirmMsg ??
			(missingMap ? `Pick the MVP for game ${missingMap.map_number} before ending the match.` : null) ??
			(!mvpReady ? 'Pick the match MVP before ending the match.' : null),
	};
}

export default function LineupPanel({
	matchId,
	compId,
	gameId,
	status,
	mvpRequired,
	teams,
	initialMvpId,
	bestOf,
	maps,
	onGateChange,
}: Props) {
	const supabase = useMemo(() => createClient(), []);
	const [squads, setSquads] = useState<Record<string, Player[]> | null>(null);
	const [selected, setSelected] = useState<Record<string, string[]>>({});
	const [mvpId, setMvpId] = useState<string | null>(initialMvpId);
	const [mapMvps, setMapMvps] = useState<Record<string, string | null>>({});
	const [editing, setEditing] = useState(false);
	const [removals, setRemovals] = useState<Record<string, string[]>>({});
	const [additions, setAdditions] = useState<Record<string, NewPlayer[]>>({});
	const [drafts, setDrafts] = useState<Record<string, string>>({});
	// Who plays this match by default, per team, and bench players the contributor brings in
	const [defaults, setDefaults] = useState<Record<string, string[]>>({});
	const [benchAdds, setBenchAdds] = useState<Record<string, string[]>>({});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const locked = status === 'completed' || status === 'cancelled';
	const teamKey = teams.map((t) => t.id).join(',');

	// Squads (the roster locked in at registration) and what is already confirmed for this match
	async function loadAll(): Promise<{ squads: Record<string, Player[]>; selected: Record<string, string[]> }> {
		const squadsOut: Record<string, Player[]> = {};
		for (const teamId of teamKey ? teamKey.split(',') : []) {
			const { data } = await supabase
				.from('player_game_assignments')
				.select('players(id, gamertag)')
				.eq('comp_instance_id', compId)
				.eq('game_title_id', gameId)
				.eq('team_id', teamId)
				.eq('is_active', true);
			const rows = (data ?? []) as unknown as { players: Player | Player[] | null }[];
			squadsOut[teamId] = rows
				.map((r) => (Array.isArray(r.players) ? r.players[0] : r.players))
				.filter((p): p is Player => !!p)
				.sort((a, b) => a.gamertag.localeCompare(b.gamertag));
		}
		const { data: lineupRows } = await supabase
			.from('match_lineups')
			.select('team_id, player_id')
			.eq('match_id', matchId);
		const selectedOut: Record<string, string[]> = {};
		for (const l of (lineupRows ?? []) as { team_id: string; player_id: string }[]) {
			(selectedOut[l.team_id] ??= []).push(l.player_id);
		}
		return { squads: squadsOut, selected: selectedOut };
	}

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const loaded = await loadAll();
			if (cancelled) return;
			setSquads(loaded.squads);
			setSelected(loaded.selected);
			onGateChange(computeGate(teams, loaded.squads, loaded.selected, mvpId, mvpRequired, bestOf, maps, mapMvps));
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [supabase, compId, gameId, matchId, teamKey]);

	async function refresh(nextMvp: string | null) {
		const loaded = await loadAll();
		setSquads(loaded.squads);
		setSelected(loaded.selected);
		// The database clears an MVP who is no longer on a confirmed roster
		const stillIn = nextMvp ? Object.values(loaded.selected).some((ids) => ids.includes(nextMvp)) : false;
		const mvp = stillIn ? nextMvp : null;
		setMvpId(mvp);
		onGateChange(computeGate(teams, loaded.squads, loaded.selected, mvp, mvpRequired, bestOf, maps, mapMvps));
	}

	async function confirmRosters() {
		setBusy(true);
		setError(null);
		const { error: err } = await supabase.rpc('confirm_match_roster', { p_match: matchId });
		if (err) {
			setBusy(false);
			setError(err.message);
			return;
		}
		await refresh(mvpId);
		setEditing(false);
		setBusy(false);
	}

	async function startEditing() {
		setBusy(true);
		setError(null);
		const out: Record<string, string[]> = {};
		for (const team of teams) {
			const { data, error: err } = await supabase.rpc('default_match_lineup', { p_match: matchId, p_team: team.id });
			if (err) {
				setBusy(false);
				setError(err.message);
				return;
			}
			out[team.id] = (data as string[] | null) ?? [];
		}
		setDefaults(out);
		setBusy(false);
		setEditing(true);
	}

	function toggleBench(teamId: string, playerId: string) {
		setBenchAdds((b) => {
			const cur = b[teamId] ?? [];
			return { ...b, [teamId]: cur.includes(playerId) ? cur.filter((x) => x !== playerId) : [...cur, playerId] };
		});
	}

	async function saveChangesAndConfirm() {
		setBusy(true);
		setError(null);
		for (const team of teams) {
			const out = removals[team.id] ?? [];
			const add = [
				...(benchAdds[team.id] ?? []).map((id) => ({ player_id: id })),
				...(additions[team.id] ?? []).map((a) => ({ gamertag: a.gamertag })),
			];
			if (out.length === 0 && add.length === 0) continue;
			const { error: err } = await supabase.rpc('change_match_roster', {
				p_match: matchId,
				p_team: team.id,
				p_remove: out,
				p_add: add,
			});
			if (err) {
				setBusy(false);
				setError(`${team.name}: ${err.message}`);
				return;
			}
		}
		setRemovals({});
		setAdditions({});
		setBenchAdds({});
		setDrafts({});
		await confirmRosters();
	}

	// Keep the start/end gate in step with games finishing and MVPs being picked
	useEffect(() => {
		if (squads === null) return;
		onGateChange(computeGate(teams, squads, selected, mvpId, mvpRequired, bestOf, maps, mapMvps));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [squads, selected, mvpId, mvpRequired, bestOf, maps, mapMvps]);

	async function chooseMapMvp(mapId: string, playerId: string) {
		if (locked || busy) return;
		setBusy(true);
		setError(null);
		const { error: err } = await supabase.rpc('set_map_mvp', { p_map: mapId, p_player: playerId || null });
		setBusy(false);
		if (err) {
			setError(err.message);
			return;
		}
		setMapMvps((cur) => ({ ...cur, [mapId]: playerId || null }));
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
		onGateChange(computeGate(teams, squads, selected, next, mvpRequired, bestOf, maps, mapMvps));
	}

	function toggleRemove(teamId: string, playerId: string) {
		setRemovals((r) => {
			const cur = r[teamId] ?? [];
			return { ...r, [teamId]: cur.includes(playerId) ? cur.filter((x) => x !== playerId) : [...cur, playerId] };
		});
	}

	function addDraft(teamId: string) {
		const tag = (drafts[teamId] ?? '').trim();
		if (!tag) return;
		const exists =
			(squads?.[teamId] ?? []).some((p) => p.gamertag.toLowerCase() === tag.toLowerCase()) ||
			(additions[teamId] ?? []).some((a) => a.gamertag.toLowerCase() === tag.toLowerCase());
		if (exists) {
			setError(`${tag} is already on this roster.`);
			return;
		}
		setError(null);
		setAdditions((a) => ({ ...a, [teamId]: [...(a[teamId] ?? []), { gamertag: tag }] }));
		setDrafts((d) => ({ ...d, [teamId]: '' }));
	}

	const everyTeamConfirmed =
		squads !== null && teams.every((t) => (squads[t.id]?.length ?? 0) === 0 || (selected[t.id]?.length ?? 0) > 0);
	const anyLive = maps.some((m) => m.status === 'live');
	const anyDone = maps.some((m) => m.status === 'completed');
	// With game slots: finished once none is live and one has ended. Without (battle royale): once the match is live.
	const gamesFinished = maps.length > 0 ? !anyLive && anyDone : status === 'live';
	const hasSquads = squads !== null && teams.some((t) => (squads[t.id]?.length ?? 0) > 0);

	const confirmedPlayers = teams.flatMap((t) =>
		(squads?.[t.id] ?? [])
			.filter((p) => (selected[t.id] ?? []).includes(p.id))
			.map((p) => ({ ...p, team: t.name })),
	);

	const pendingChanges =
		Object.values(removals).some((r) => r.length > 0) ||
		Object.values(additions).some((a) => a.length > 0) ||
		Object.values(benchAdds).some((a) => a.length > 0);

	return (
		<section className="rounded-lg border border-border-line bg-bg-surface p-5">
			<div className="mb-1 flex items-center justify-between gap-3">
				<h3 className="font-semibold">Rosters</h3>
				{locked ? <span className="text-xs text-text-muted">Locked, the match has ended</span> : null}
			</div>

			{squads === null ? (
				<p className="text-sm text-text-muted">Loading rosters...</p>
			) : !hasSquads ? (
				<p className="text-sm text-text-muted">
					No roster was registered for this game, so there is nothing to confirm.
				</p>
			) : editing && !locked ? (
				<div className="space-y-5">
					<p className="text-xs text-text-muted">
						Tap a player to take them out of this match. They stay on the team and can play the next one. Bring a
						player in from the bench, or add someone new by gamertag, even if they are not in the system yet.
						Then confirm.
					</p>
					{teams.map((team) => {
						const squad = squads[team.id] ?? [];
						const playingIds = defaults[team.id] ?? [];
						const playing = squad.filter((p) => playingIds.includes(p.id));
						const bench = squad.filter((p) => !playingIds.includes(p.id));
						const out = removals[team.id] ?? [];
						const benchIn = benchAdds[team.id] ?? [];
						const added = additions[team.id] ?? [];
						return (
							<div key={team.id}>
								<p className="mb-2 text-sm font-semibold">{team.name}</p>
								<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Playing</p>
								<div className="flex flex-wrap gap-2">
									{playing.map((p) => {
										const removing = out.includes(p.id);
										return (
											<button
												key={p.id}
												type="button"
												onClick={() => toggleRemove(team.id, p.id)}
												aria-pressed={removing}
												className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
													removing
														? 'border-red-500 bg-red-500/10 text-red-600 line-through dark:text-red-300'
														: 'border-border-line bg-bg-void text-text-primary'
												}`}
											>
												{p.gamertag}
												{removing ? ' (out)' : ''}
											</button>
										);
									})}
									{bench
										.filter((p) => benchIn.includes(p.id))
										.map((p) => (
											<button
												key={p.id}
												type="button"
												onClick={() => toggleBench(team.id, p.id)}
												className="min-h-10 rounded-lg border border-green-500 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-700 dark:text-green-300"
												title="Tap to cancel"
											>
												+ {p.gamertag} (in)
											</button>
										))}
									{added.map((a) => (
										<button
											key={a.gamertag}
											type="button"
											onClick={() =>
												setAdditions((all) => ({
													...all,
													[team.id]: (all[team.id] ?? []).filter((x) => x.gamertag !== a.gamertag),
												}))
											}
											className="min-h-10 rounded-lg border border-green-500 bg-green-500/10 px-3 py-2 text-sm font-semibold text-green-700 dark:text-green-300"
											title="Tap to cancel this new player"
										>
											+ {a.gamertag} (new)
										</button>
									))}
								</div>
								{bench.some((p) => !benchIn.includes(p.id)) ? (
									<div className="mt-3">
										<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
											On the bench
										</p>
										<div className="flex flex-wrap gap-2">
											{bench
												.filter((p) => !benchIn.includes(p.id))
												.map((p) => (
													<button
														key={p.id}
														type="button"
														onClick={() => toggleBench(team.id, p.id)}
														className="min-h-10 rounded-lg border border-dashed border-border-line px-3 py-2 text-sm font-semibold text-text-muted hover:text-text-primary"
													>
														+ {p.gamertag}
													</button>
												))}
										</div>
									</div>
								) : null}
								<div className="mt-3 flex gap-2">
									<input
										value={drafts[team.id] ?? ''}
										onChange={(e) => setDrafts((d) => ({ ...d, [team.id]: e.target.value }))}
										onKeyDown={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												addDraft(team.id);
											}
										}}
										placeholder="New player gamertag"
										className="min-h-10 flex-1 rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary"
									/>
									<button
										type="button"
										onClick={() => addDraft(team.id)}
										className="min-h-10 rounded-lg border border-border-line bg-bg-elevated px-4 py-2 text-sm font-semibold text-text-primary"
									>
										Add
									</button>
								</div>
							</div>
						);
					})}
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={saveChangesAndConfirm}
							disabled={busy}
							className="min-h-11 rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
						>
							{pendingChanges ? 'Save changes and confirm rosters' : 'Confirm rosters'}
						</button>
						<button
							type="button"
							onClick={() => {
								setEditing(false);
								setRemovals({});
								setAdditions({});
								setBenchAdds({});
								setDrafts({});
							}}
							disabled={busy}
							className="min-h-11 rounded-lg border border-border-line px-5 py-2 text-sm font-semibold text-text-primary"
						>
							Cancel
						</button>
					</div>
				</div>
			) : !everyTeamConfirmed ? (
				<div className="space-y-4">
					<p className="text-sm">Are there any roster changes before this match?</p>
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={confirmRosters}
							disabled={busy || locked}
							className="min-h-11 rounded-lg bg-green-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
						>
							No changes, confirm rosters
						</button>
						<button
							type="button"
							onClick={startEditing}
							disabled={busy || locked}
							className="min-h-11 rounded-lg border border-border-line px-5 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
						>
							Yes, roster changes
						</button>
					</div>
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-xs text-green-600 dark:text-green-400">Rosters confirmed for this match.</p>
					{teams.map((team) => (
						<div key={team.id}>
							<p className="mb-1 text-sm font-semibold">{team.name}</p>
							<p className="text-sm text-text-muted">
								{(squads[team.id] ?? [])
									.filter((p) => (selected[team.id] ?? []).includes(p.id))
									.map((p) => p.gamertag)
									.join(', ') || 'No roster registered'}
							</p>
						</div>
					))}
					{!locked ? (
						<button
							type="button"
							onClick={startEditing}
							className="text-sm font-semibold text-accent-primary"
						>
							Roster changes
						</button>
					) : null}
				</div>
			)}

			{mvpRequired && squads !== null && hasSquads ? (
				<div className="mt-5 space-y-4 border-t border-border-line pt-4">
					{bestOf > 1
						? maps
								.filter((m) => m.status === 'completed')
								.map((m) => (
									<MvpSelect
										key={m.id}
										id={`map-mvp-${m.id}`}
										label={`Game ${m.map_number} MVP`}
										value={mapMvps[m.id] ?? m.mvp_player_id ?? null}
										players={confirmedPlayers}
										disabled={locked || busy || confirmedPlayers.length === 0}
										onChange={(v) => chooseMapMvp(m.id, v)}
									/>
								))
						: null}
					{gamesFinished ? (
						<MvpSelect
							id="match-mvp"
							label={bestOf > 1 ? 'Overall match MVP' : 'Match MVP'}
							value={mvpId}
							players={confirmedPlayers}
							disabled={locked || busy || confirmedPlayers.length === 0}
							onChange={chooseMvp}
						/>
					) : (
						<p className="text-xs text-text-muted">
							{bestOf > 1
								? 'Each game gets its own MVP when it ends. The overall match MVP opens once the games are finished.'
								: 'The MVP can be picked once the game has ended.'}
						</p>
					)}
				</div>
			) : null}

			{error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

			{hasSquads ? (
				<div className="mt-5 border-t border-border-line pt-4">
					<RosterHistory matchId={matchId} title="Changes for this match" />
				</div>
			) : null}
		</section>
	);
}

function MvpSelect({
	id,
	label,
	value,
	players,
	disabled,
	onChange,
}: {
	id: string;
	label: string;
	value: string | null;
	players: { id: string; gamertag: string; team: string }[];
	disabled: boolean;
	onChange: (playerId: string) => void;
}) {
	return (
		<div>
			<label className="mb-2 block text-sm font-semibold" htmlFor={id}>
				{label}
			</label>
			<select
				id={id}
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className="w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-60"
			>
				<option value="">{players.length === 0 ? 'Confirm rosters first' : 'Choose the MVP'}</option>
				{players.map((p) => (
					<option key={p.id} value={p.id}>
						{p.gamertag} ({p.team})
					</option>
				))}
			</select>
		</div>
	);
}
