'use client';

import { useState } from 'react';
import { getSeriesState } from '@/lib/series-rules';
import type {
	CatalogueMap,
	CatalogueMode,
	MapModeLink,
	MatchEvent,
	MatchMap,
	MatchRoomMatch,
} from './MatchRoomClient';

type Draft = { mapId: string; modeId: string };

export type SetupChange = { slotId: string; mapId: string; modeId: string };

type Props = {
	match: MatchRoomMatch;
	maps: MatchMap[];
	events: MatchEvent[];
	availableMaps: CatalogueMap[];
	availableModes: CatalogueMode[];
	mapModeLinks: MapModeLink[];
	pending: string | null;
	homeScoreInput: string;
	awayScoreInput: string;
	durationMinutes: string;
	onHomeScoreChange: (value: string) => void;
	onAwayScoreChange: (value: string) => void;
	onDurationChange: (value: string) => void;
	onSaveSetup: (changes: SetupChange[]) => void | Promise<void>;
	onStartGame: (slot: MatchMap) => void | Promise<void>;
	onSaveScore: () => void | Promise<void>;
	onEndGame: (winner?: 'home' | 'away') => void | Promise<void>;
};

const selectClass =
	'mt-1 w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary disabled:opacity-50';
const inputClass =
	'mt-1 w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary';

function statusChip(status: string) {
	if (status === 'live') return 'border-red-500/40 bg-red-500/15 text-red-300';
	if (status === 'completed') return 'border-green-500/40 bg-green-500/15 text-green-300';
	if (status === 'skipped') return 'border-border-line bg-bg-elevated text-text-muted';
	return 'border-border-line bg-bg-elevated text-text-muted';
}

export default function SeriesPanel({
	match,
	maps,
	events,
	availableMaps,
	availableModes,
	mapModeLinks,
	pending,
	homeScoreInput,
	awayScoreInput,
	durationMinutes,
	onHomeScoreChange,
	onAwayScoreChange,
	onDurationChange,
	onSaveSetup,
	onStartGame,
	onSaveScore,
	onEndGame,
}: Props) {
	// Unsaved choices, keyed by game. Saved values come from the database.
	const [drafts, setDrafts] = useState<Record<string, Draft>>({});
	// MLBB: who destroyed the base, chosen per game before it can end
	const [winners, setWinners] = useState<Record<string, 'home' | 'away'>>({});
	const winnerBased = match.game_titles?.game_types?.slug === 'moba';

	const needsMap = !winnerBased && availableMaps.length > 0;
	const homeLabel = match.home_team?.short_code ?? match.home_team?.name ?? 'Home';
	const awayLabel = match.away_team?.short_code ?? match.away_team?.name ?? 'Away';

	const series = getSeriesState({
		slots: maps,
		events,
		homeTeamId: match.team_home_id,
		awayTeamId: match.team_away_id,
		bestOf: match.best_of,
		needsMap,
		winnerBased,
	});

	const saved = (slot: MatchMap): Draft => ({
		mapId: slot.map_id ?? '',
		modeId: slot.mode_id ?? '',
	});
	const effective = (slot: MatchMap): Draft => drafts[slot.id] ?? saved(slot);

	const modesFor = (mapId: string) =>
		mapId
			? availableModes.filter((mode) =>
					mapModeLinks.some((link) => link.map_id === mapId && link.mode_id === mode.id),
				)
			: availableModes;

	// Only games that haven't started can have their map/mode edited.
	const editable = winnerBased ? [] : maps.filter((slot) => slot.status === 'pending');

	const changes: SetupChange[] = editable
		.map((slot) => ({ slot, draft: effective(slot) }))
		.filter(({ slot, draft }) => {
			const current = saved(slot);
			return (
				(draft.mapId !== current.mapId || draft.modeId !== current.modeId) &&
				(draft.mapId || draft.modeId)
			);
		})
		.map(({ slot, draft }) => ({ slotId: slot.id, mapId: draft.mapId, modeId: draft.modeId }));

	function setDraft(slot: MatchMap, next: Partial<Draft>) {
		setDrafts((current) => ({
			...current,
			[slot.id]: { ...effective(slot), ...next },
		}));
	}

	function applyFirstToAll() {
		const first = editable[0];
		if (!first) return;
		const source = effective(first);
		if (!source.mapId && !source.modeId) return;
		setDrafts((current) => {
			const next = { ...current };
			for (const slot of editable) next[slot.id] = { ...source };
			return next;
		});
	}

	async function saveSetup() {
		await onSaveSetup(changes);
		// Saved values now come back from the database
		setDrafts({});
	}

	const total = maps.length;
	const configuredCount = series.remaining.length - series.unconfigured.length;
	const matchIsLive = match.status === 'live';

	return (
		<section className="rounded-lg border border-border-line bg-bg-surface p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className="font-semibold">Series</h3>
					<p className="mt-1 text-xs text-text-muted">
						Best of {match.best_of} - {total} game{total === 1 ? '' : 's'}
					</p>
				</div>
				<div className="rounded-lg bg-bg-elevated px-4 py-2 text-lg font-bold">
					<span className="text-xs font-normal text-text-muted">{homeLabel} </span>
					{series.homeWins}
					<span className="px-2 text-text-muted">-</span>
					{series.awayWins}
					<span className="text-xs font-normal text-text-muted"> {awayLabel}</span>
				</div>
			</div>

			{total === 0 ? (
				<p className="text-sm text-text-muted">
					No games have been created for this match yet.
				</p>
			) : null}

			{series.decided ? (
				<div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
					The series is decided {series.homeWins}-{series.awayWins}. The remaining games are not
					needed. Mark the match as completed in Match Status.
				</div>
			) : null}

			{series.remaining.length > 0 && !winnerBased ? (
				<div
					className={`mb-4 rounded-lg border p-3 text-sm ${
						series.setupComplete
							? 'border-green-500/30 bg-green-500/10 text-green-200'
							: 'border-amber-500/30 bg-amber-500/10 text-amber-200'
					}`}
				>
					{series.setupComplete
						? 'Every game is set up. Games can now be started in order.'
						: `${configuredCount} of ${series.remaining.length} games are set up. Game ${series.remaining[0].map_number} can't start until every game has its ${needsMap ? 'map and mode' : 'mode'}.`}
				</div>
			) : null}

			{editable.length > 0 ? (
				<div className="mb-4 flex flex-wrap items-center gap-3">
					{editable.length > 1 ? (
						<button
							type="button"
							onClick={applyFirstToAll}
							className="rounded-lg border border-border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-text-primary hover:border-accent-primary/40"
						>
							Use Game {editable[0].map_number}&apos;s choice for all games
						</button>
					) : null}
					<button
						type="button"
						onClick={saveSetup}
						disabled={changes.length === 0 || pending === 'series-setup'}
						className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-text-primary hover:bg-green-500 disabled:opacity-50"
					>
						{pending === 'series-setup'
							? 'Saving...'
							: changes.length > 0
								? `Save setup (${changes.length} game${changes.length === 1 ? '' : 's'})`
								: 'Save setup'}
					</button>
					{changes.length > 0 ? (
						<span className="text-xs text-amber-300">Unsaved changes</span>
					) : null}
				</div>
			) : null}

			<div className="space-y-3">
				{maps.map((slot) => {
					const control = series.controls[slot.id];
					const draft = effective(slot);
					const isEditable = slot.status === 'pending';
					const isLive = slot.status === 'live';
					const isCompleted = slot.status === 'completed';
					const winnerLabel =
						slot.map_winner === 'home'
							? homeLabel
							: slot.map_winner === 'away'
								? awayLabel
								: slot.map_winner === 'draw'
									? 'Draw'
									: null;

					return (
						<div
							key={slot.id}
							className={`rounded-lg border p-4 ${
								isLive ? 'border-red-500/40 bg-red-500/5' : 'border-border-line bg-bg-surface'
							}`}
						>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<p className="font-semibold">Game {slot.map_number}</p>
								<span
									className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase ${statusChip(slot.status)}`}
								>
									{slot.status === 'pending' ? 'Not started' : slot.status}
								</span>
							</div>

							{isEditable && winnerBased ? (
								<div className="mt-3">
									<button
										type="button"
										onClick={() => onStartGame(slot)}
										disabled={!control.canStart || pending === `start-${slot.id}`}
										className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Start Game {slot.map_number}
									</button>
								</div>
							) : isEditable ? (
								<div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
									{needsMap ? (
										<label className="text-xs text-text-muted">
											Map
											<select
												value={draft.mapId}
												onChange={(event) => {
													const mapId = event.target.value;
													const stillValid = modesFor(mapId).some((m) => m.id === draft.modeId);
													setDraft(slot, { mapId, modeId: stillValid ? draft.modeId : '' });
												}}
												className={selectClass}
											>
												<option value="">Select map</option>
												{availableMaps.map((map) => (
													<option key={map.id} value={map.id}>
														{map.name}
													</option>
												))}
											</select>
										</label>
									) : null}
									<label className="text-xs text-text-muted">
										Mode
										<select
											value={draft.modeId}
											onChange={(event) => setDraft(slot, { modeId: event.target.value })}
											className={selectClass}
										>
											<option value="">Select mode</option>
											{modesFor(draft.mapId).map((mode) => (
												<option key={mode.id} value={mode.id}>
													{mode.name}
												</option>
											))}
										</select>
									</label>
									<div>
										<button
											type="button"
											onClick={() => onStartGame(slot)}
											disabled={!control.canStart || pending === `start-${slot.id}`}
											className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
										>
											Start Game {slot.map_number}
										</button>
									</div>
								</div>
							) : (
								<p className="mt-2 text-sm text-text-muted">
									{winnerBased ? null : <>{slot.maps?.name ?? 'Map TBD'} - {slot.modes?.name ?? 'Mode TBD'}</>}
									{isCompleted ? (
										<>
											{' '}
											<span className="text-text-primary">
												{homeLabel} {Number(slot.home_score ?? 0)} - {Number(slot.away_score ?? 0)}{' '}
												{awayLabel}
											</span>
											{winnerLabel ? <span> - {winnerLabel === 'Draw' ? 'Draw' : `${winnerLabel} won`}</span> : null}
										</>
									) : null}
								</p>
							)}

							{isEditable && control.startLockedReason ? (
								<p className="mt-2 text-xs text-amber-300">{control.startLockedReason}</p>
							) : null}
							{isEditable && changes.some((c) => c.slotId === slot.id) && control.canStart ? (
								<p className="mt-2 text-xs text-amber-300">
									Save your setup changes before starting.
								</p>
							) : null}

							{isLive && winnerBased ? (
								<div className="mt-4 space-y-4">
									<div className="grid gap-3 md:grid-cols-3">
										<label className="text-xs text-text-muted">
											{homeLabel} kills / score (optional)
											<input
												value={homeScoreInput}
												onChange={(event) => onHomeScoreChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
										<label className="text-xs text-text-muted">
											{awayLabel} kills / score (optional)
											<input
												value={awayScoreInput}
												onChange={(event) => onAwayScoreChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
										<label className="text-xs text-text-muted">
											Duration (minutes)
											<input
												value={durationMinutes}
												onChange={(event) => onDurationChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
									</div>
									<div>
										<p className="mb-2 text-xs text-text-muted">Who destroyed the base? Pick the winner</p>
										<div className="grid grid-cols-2 gap-3">
											{(['home', 'away'] as const).map((side) => {
												const picked = winners[slot.id] === side;
												return (
													<button
														key={side}
														type="button"
														onClick={() => setWinners((w) => ({ ...w, [slot.id]: side }))}
														aria-pressed={picked}
														className={`min-h-12 rounded-lg border px-4 py-2 text-sm font-bold transition-colors ${
															picked
																? 'border-accent-primary bg-accent-primary text-white'
																: 'border-border-line bg-bg-elevated text-text-primary hover:border-accent-primary/50'
														}`}
													>
														{side === 'home' ? homeLabel : awayLabel} won
													</button>
												);
											})}
										</div>
									</div>
									<div className="flex flex-wrap items-center gap-3">
										<button
											type="button"
											onClick={async () => {
												const w = winners[slot.id];
												if (!w) return;
												if (homeScoreInput !== '0' || awayScoreInput !== '0') await onSaveScore();
												await onEndGame(w);
											}}
											disabled={!winners[slot.id] || !matchIsLive || pending === 'map-end'}
											className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
										>
											End Game {slot.map_number}
										</button>
									</div>
									{!matchIsLive ? (
										<p className="text-xs text-amber-300">
											Set the match to Live in Match Status before ending a game.
										</p>
									) : !winners[slot.id] ? (
										<p className="text-xs text-amber-300">Pick the winning team to end this game.</p>
									) : null}
								</div>
							) : isLive ? (
								<div className="mt-4 space-y-3">
									<div className="grid gap-3 md:grid-cols-3">
										<label className="text-xs text-text-muted">
											{homeLabel} score
											<input
												value={homeScoreInput}
												onChange={(event) => onHomeScoreChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
										<label className="text-xs text-text-muted">
											{awayLabel} score
											<input
												value={awayScoreInput}
												onChange={(event) => onAwayScoreChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
										<label className="text-xs text-text-muted">
											Duration (minutes)
											<input
												value={durationMinutes}
												onChange={(event) => onDurationChange(event.target.value)}
												type="number"
												min="0"
												className={inputClass}
											/>
										</label>
									</div>
									<div className="flex flex-wrap items-center gap-3">
										<button
											type="button"
											onClick={onSaveScore}
											disabled={pending === 'score-update' || !matchIsLive}
											className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-text-primary hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
										>
											Save score
										</button>
										<button
											type="button"
											onClick={() => onEndGame()}
											disabled={!control.canEnd || pending === 'map-end'}
											className="rounded-lg bg-bg-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-40"
										>
											End Game {slot.map_number}
										</button>
									</div>
									{!matchIsLive ? (
										<p className="text-xs text-amber-300">
											Set the match to Live in Match Status before saving scores.
										</p>
									) : control.endLockedReason ? (
										<p className="text-xs text-amber-300">{control.endLockedReason}</p>
									) : null}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
		</section>
	);
}
