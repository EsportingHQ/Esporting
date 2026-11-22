'use client';

import { useState } from 'react';
import { Swords } from 'lucide-react';
import { Match, MatchMap } from '@/hooks/useMatchRealtime';

interface GamesTabProps {
	match: Match;
	matchMaps: MatchMap[];
}

function fmtDuration(sec: number | null) {
	if (!sec || sec <= 0) return '–';
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

function short(name?: string) {
	return (name ?? '').split(' ').map((w) => w[0]).join('').slice(0, 3).toUpperCase() || '–';
}

export function GamesTab({ match, matchMaps }: GamesTabProps) {
	const home = match.team_home?.name ?? 'Home';
	const away = match.team_away?.name ?? 'Away';
	const hasModes = matchMaps.some((m) => m.modes?.name || m.maps?.name);
	const firstLive = matchMaps.findIndex((m) => m.status === 'live');
	const firstOpen = matchMaps.findIndex((m) => m.status !== 'completed');
	const [picked, setPicked] = useState<number | null>(null);
	const sel = picked ?? (firstLive >= 0 ? firstLive : firstOpen >= 0 ? firstOpen : Math.max(matchMaps.length - 1, 0));

	if (matchMaps.length === 0) {
		return (
			<div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded">
				<Swords className="w-6 h-6 mx-auto mb-2 text-text-muted/40" />
				<p className="font-display font-semibold uppercase text-xs tracking-wider">
					Games will appear here once the series starts
				</p>
			</div>
		);
	}

	const winnerLabel = (m: MatchMap) =>
		m.map_winner === 'home' ? home : m.map_winner === 'away' ? away : m.map_winner === 'draw' ? 'Draw' : null;

	// MLBB-style: no modes or maps, every game is a straight win/loss with a game clock
	if (!hasModes) {
		return (
			<div className="max-w-3xl space-y-4">
				<div className="bg-bg-surface border border-border-line rounded-2xl overflow-hidden">
					<div className="px-4 py-3 font-display font-bold text-[11px] tracking-wider text-text-muted">
						GAME RESULTS
					</div>
					<div className="grid grid-cols-[1fr_56px_56px_56px] px-4 pb-2 text-[10px] font-display font-bold text-text-muted/70 tracking-wider">
						<span>GAME</span>
						<span className="text-center">{short(home)}</span>
						<span className="text-center">{short(away)}</span>
						<span className="text-right">TIME</span>
					</div>
					{matchMaps.map((m) => {
						const done = m.status === 'completed';
						const live = m.status === 'live';
						return (
							<div
								key={m.id}
								className="grid grid-cols-[1fr_56px_56px_56px] items-center px-4 py-3 border-t border-border-line"
							>
								<span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
									Game {m.map_number}
									{live && (
										<span className="text-[9px] font-display font-bold text-accent-primary animate-pulse">
											LIVE
										</span>
									)}
								</span>
								{done ? (
									<>
										<span className={`text-center font-black text-sm ${m.map_winner === 'home' ? 'text-accent-cyan' : 'text-text-muted/60'}`}>
											{m.map_winner === 'home' ? 'W' : 'L'}
										</span>
										<span className={`text-center font-black text-sm ${m.map_winner === 'away' ? 'text-accent-cyan' : 'text-text-muted/60'}`}>
											{m.map_winner === 'away' ? 'W' : 'L'}
										</span>
									</>
								) : (
									<>
										<span className="text-center text-text-muted/50">–</span>
										<span className="text-center text-text-muted/50">–</span>
									</>
								)}
								<span className="text-right text-[11px] font-data text-text-muted tabular-nums">
									{done ? fmtDuration(m.duration_seconds) : live ? 'In play' : 'Upcoming'}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	// CODM-style: each game has its own mode and map, and its own score unit
	const g = matchMaps[sel];
	const unit = g?.modes?.unit_label ?? null;
	const gw = g ? winnerLabel(g) : null;
	return (
		<div className="max-w-3xl space-y-4">
			<div className="font-display font-bold text-[11px] tracking-wider text-text-muted">GAMES</div>
			<div className="space-y-2">
				{matchMaps.map((m, i) => {
					const done = m.status === 'completed';
					const live = m.status === 'live';
					const label = [m.modes?.name, m.maps?.name].filter(Boolean).join(' · ') || `Game ${m.map_number}`;
					return (
						<button
							key={m.id}
							type="button"
							onClick={() => setPicked(i)}
							className={`w-full flex items-center gap-3 min-h-12 px-4 rounded-xl bg-bg-surface border text-left transition-colors ${
								i === sel ? 'border-accent-primary' : 'border-border-line hover:border-accent-primary/40'
							}`}
						>
							<span className="w-6 text-[11px] font-bold text-text-muted/70">G{m.map_number}</span>
							<span className={`flex-1 min-w-0 truncate text-sm font-semibold ${done || live ? 'text-text-primary' : 'text-text-muted'}`}>
								{label}
							</span>
							{live && <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />}
							<span
								className={`text-xs font-data font-bold tabular-nums ${
									live ? 'text-accent-primary' : done ? 'text-accent-cyan' : 'text-text-muted/60'
								}`}
							>
								{done ? `${m.home_score ?? 0}–${m.away_score ?? 0}` : live ? 'IN PROGRESS' : 'Upcoming'}
							</span>
						</button>
					);
				})}
			</div>

			{g && (
				<div className="bg-bg-surface border border-border-line rounded-2xl p-4">
					<div className="text-[11px] font-bold tracking-wider text-text-muted/70">GAME {g.map_number}</div>
					<div className="text-base font-black text-text-primary mt-1">
						{[g.modes?.name, g.maps?.name].filter(Boolean).join(' · ') || `Game ${g.map_number}`}
					</div>
					{g.status === 'completed' ? (
						<>
							<div className="flex items-center justify-between mt-3 bg-bg-void rounded-xl px-4 py-3">
								<span className="text-sm font-semibold">{home}</span>
								<span className="text-xl font-black font-data tabular-nums">
									{g.home_score ?? 0} – {g.away_score ?? 0}
								</span>
								<span className="text-sm font-semibold">{away}</span>
							</div>
							<div className="text-xs text-text-muted mt-2 text-center">
								{gw === 'Draw' ? 'Draw' : gw ? `${gw} won` : ''}
								{unit ? ` · scored in ${unit}` : ''}
							</div>
						</>
					) : (
						<p className="text-sm text-text-muted mt-3">
							{g.status === 'live'
								? 'This game is in progress. The result is added when the organiser ends the game.'
								: 'This game starts after the one before it ends.'}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
