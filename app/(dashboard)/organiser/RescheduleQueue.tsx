'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import MatchTimeEditor from './competitions/[instanceId]/MatchTimeEditor';
import type { RescheduleItem } from './rescheduleQueue';

// Shown on the organiser dashboard: cancelled matches that need a new date.
export default function RescheduleQueue({ items, showCompetition = true }: { items: RescheduleItem[]; showCompetition?: boolean }) {
	if (items.length === 0) return null;
	return (
		<section
			aria-label="Matches needing a new date"
			className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3"
		>
			<div className="flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
				<h3 className="font-display text-sm font-bold uppercase tracking-wider text-text-primary">
					Needs rescheduling ({items.length})
				</h3>
			</div>
			<p className="text-xs text-text-muted">
				These matches were cancelled. Pick a new date and time and the same match goes back on the schedule, so
				its result still decides who moves on in the bracket.
			</p>
			<div className="space-y-3">
				{items.map((m) => (
					<div key={m.id} className="rounded border border-border-line bg-bg-surface p-3 text-xs space-y-2">
						<div className="flex flex-wrap items-baseline justify-between gap-2">
							<span className="font-display text-sm font-black uppercase tracking-wider text-text-primary">
								{m.home} vs {m.away}
							</span>
							<span className="font-data text-text-muted">{m.game}</span>
						</div>
						<p className="text-text-muted">
							{[
								showCompetition ? m.competitionName : null,
								m.stage,
								m.round ? `Round ${m.round}` : null,
								m.originalAt ? `Was ${new Date(m.originalAt).toLocaleString()}` : null,
							]
								.filter(Boolean)
								.join(' · ')}
						</p>
						{m.reason ? <p className="text-text-primary">Reason: {m.reason}</p> : null}
						<MatchTimeEditor matchId={m.id} scheduledAt={null} disabled={false} status="cancelled" />
						{showCompetition ? (
							<Link
								href={`/organiser/competitions/${m.competitionId}`}
								className="inline-block text-[11px] font-semibold text-accent-primary"
							>
								Open competition
							</Link>
						) : null}
					</div>
				))}
			</div>
		</section>
	);
}
