'use client';

import { Flame, Clock, Award, ListOrdered } from 'lucide-react';
import { StatusDot } from '../StatusDot';
import {
	MatchEvent,
	MatchStatusLog,
	MatchMap,
	BRResult,
} from '@/hooks/useMatchRealtime';
interface TimelineTabProps {
	events: MatchEvent[];
	statusLogs: MatchStatusLog[];
	isLive: boolean;
	isShooter: boolean;
	isBR: boolean;
	matchMaps: MatchMap[];
	brResults: BRResult[];
}

export function TimelineTab({
	events,
	statusLogs,
	isLive,
	isShooter,
	isBR,
	matchMaps,
	brResults,
}: TimelineTabProps) {
	const getEventEmoji = (type: string) => {
		switch (type) {
			case 'goal':
			case 'penalty_goal':
				return '⚽';
			case 'own_goal':
				return '🙃';
			case 'yellow_card':
				return '🟨';
			case 'red_card':
				return '🟥';
			case 'score_update':
				return '🎯';
			case 'map_end':
				return '🏁';
			case 'status_change':
				return '📢';
			default:
				return '•';
		}
	};

	const getEventText = (ev: MatchEvent) => {
		const timeText = ev.meta?.minute ? `${ev.meta.minute}' ` : '';
		switch (ev.event_type) {
			case 'goal':
				return `${timeText}GOAL! ${ev.team?.name || 'Player'} scores.`;
			case 'penalty_goal':
				return `${timeText}PENALTY CONVERTED! ${ev.team?.name || 'Player'} scores.`;
			case 'own_goal':
				return `${timeText}OWN GOAL! Credited to opponent.`;
			case 'yellow_card':
				return `${timeText}Yellow Card issued.`;
			case 'red_card':
				return `${timeText}RED CARD! Player sent off.`;
			case 'status_change':
				const status =
					typeof ev.meta?.status === 'string'
						? ev.meta.status.toUpperCase()
						: 'UNKNOWN';

				return `MATCH STATUS CHANGED TO ${status}`;
			default:
				return `${ev.event_type.toUpperCase()} recorded`;
		}
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
			{/* Left 2 Cols: Event Stream */}
			<div className="lg:col-span-2 space-y-6">
				<div className="flex items-center gap-2 border-b border-border-line pb-2">
					<Flame className="w-4 h-4 text-accent-signal" />
					<h3 className="font-display font-black text-lg uppercase tracking-wider">
						LIVE BROADCAST TIMELINE
					</h3>
					{isLive && (
						<span className="ml-auto text-[9px] font-data text-accent-signal flex items-center gap-1.5 bg-accent-signal/10 px-2 py-0.5 rounded border border-accent-signal/30 font-semibold">
							<StatusDot status="live" size="sm" />
							<span>TELEMETRY STREAM CONNECTED</span>
						</span>
					)}
				</div>

				{/* Status Delay Announcement */}
				{statusLogs.length > 0 && statusLogs[0].reason && (
					<div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded flex items-start gap-3">
						<Clock className="w-5 h-5 shrink-0 mt-0.5" />
						<div className="text-xs space-y-1">
							<span className="font-display font-bold uppercase tracking-wider block">
								Broadcast Delay Announcement
							</span>
							<p className="font-body text-text-muted">
								Match status:{' '}
								<span className="font-semibold text-amber-400 uppercase">
									{statusLogs[0].new_status}
								</span>
								. Reason: &ldquo;{statusLogs[0].reason}&rdquo;.
							</p>
						</div>
					</div>
				)}

				{/* Live Timeline Events List */}
				<div className="space-y-3 max-h-125 overflow-y-auto pr-2">
					{events.map((ev) => (
						<div
							key={ev.id}
							className={`bg-bg-surface border p-3 rounded transition-all flex items-start gap-4 ${
								ev.is_void
									? 'border-state-alert/10 opacity-40 line-through'
									: 'border-border-line hover:border-accent-readout/30'
							}`}
						>
							<span className="text-xl shrink-0 mt-0.5">
								{getEventEmoji(ev.event_type)}
							</span>
							<div className="flex-1 text-xs space-y-1">
								<div className="flex items-center justify-between">
									<span className="font-display font-bold uppercase tracking-wider text-accent-readout text-[10px]">
										{ev.event_type}
									</span>
									<span className="font-data text-text-muted text-[10px]">
										{new Date(
											ev.created_at,
										).toLocaleTimeString()}
									</span>
								</div>
								<p className="font-body text-text-primary text-sm">
									{getEventText(ev)}
								</p>
								{ev.is_correction && (
									<span className="text-[10px] text-state-alert font-data block">
										⚠️ Corrected previous error event.
									</span>
								)}
							</div>
						</div>
					))}

					{events.length === 0 && (
						<div className="py-12 text-center text-text-muted border border-dashed border-border-line rounded">
							<Clock className="w-6 h-6 mx-auto mb-2 text-text-muted/40" />
							<p className="font-display font-semibold uppercase text-xs tracking-wider">
								Awaiting kick-off telemetry events
							</p>
							<p className="text-[10px] font-data mt-0.5">
								Timeline updates automatically in real-time.
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Right Col: Map Matrix / BR Table */}
			<div className="space-y-6">
				{isShooter && !isBR && (
					<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Award className="w-4 h-4 text-accent-readout" />
							<h4 className="font-display font-bold text-xs uppercase tracking-wider">
								SERIES MAP MATRIX
							</h4>
						</div>

						<div className="space-y-3 text-xs font-data">
							{matchMaps.map((slot) => (
								<div
									key={slot.id}
									className={`p-3 rounded border flex items-center justify-between ${
										slot.status === 'live'
											? 'bg-accent-signal/10 border-accent-signal/30'
											: 'bg-bg-void border-border-line'
									}`}
								>
									<div>
										<span className="block font-display font-bold uppercase tracking-wider text-[9px] text-text-muted">
											MAP 0{slot.map_number} —{' '}
											{slot.status.toUpperCase()}
										</span>
										<span className="font-body font-semibold text-text-primary">
											{slot.maps?.name ??
												`Map ${slot.map_number}`}
										</span>
										<span className="block text-[10px] text-accent-readout">
											{slot.modes?.name ?? 'Mode'}
										</span>
									</div>

									<div className="text-right">
										{slot.status === 'completed' ? (
											<div className="font-bold text-text-primary text-base">
												{slot.home_score ?? 0} :{' '}
												{slot.away_score ?? 0}
											</div>
										) : slot.status === 'live' ? (
											<div className="font-bold text-accent-signal text-base flex items-center gap-1.5 justify-end">
												<StatusDot
													status="live"
													size="sm"
												/>
												<span>
													{slot.home_score ?? 0} :{' '}
													{slot.away_score ?? 0}
												</span>
											</div>
										) : (
											<span className="text-text-muted italic">
												TBD
											</span>
										)}
									</div>
								</div>
							))}

							{matchMaps.length === 0 && (
								<div className="py-6 text-center text-text-muted border border-dashed border-border-line rounded">
									<p className="font-display font-semibold uppercase text-xs tracking-wider">
										No map results available yet
									</p>
								</div>
							)}
						</div>
					</div>
				)}

				{isBR && (
					<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<ListOrdered className="w-4 h-4 text-accent-signal" />
							<h4 className="font-display font-bold text-xs uppercase tracking-wider">
								PLACEMENT STANDINGS
							</h4>
						</div>

						<div className="space-y-2 text-xs font-data">
							{brResults.map((row) => (
								<div
									key={row.id}
									className="p-2 bg-bg-void border border-border-line rounded flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<span className="w-5 h-5 rounded-full bg-border-line flex items-center justify-center font-bold text-[10px] shrink-0">
											{row.placement}
										</span>
										<span className="font-body font-semibold text-text-primary">
											{row.team?.name ?? 'Team'}
										</span>
									</div>
									<div className="flex items-center gap-3">
										<span className="text-[10px] text-text-muted">
											Kills:{' '}
											<span className="text-text-primary">
												{row.kills}
											</span>
										</span>
										<span className="font-bold text-accent-signal text-sm">
											{row.total_points} pts
										</span>
									</div>
								</div>
							))}

							{brResults.length === 0 && (
								<div className="py-6 text-center text-text-muted border border-dashed border-border-line rounded">
									<p className="font-display font-semibold uppercase text-xs tracking-wider">
										No placement results available yet
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
