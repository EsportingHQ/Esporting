'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Row = {
	id: string;
	action: 'in' | 'out';
	created_at: string;
	players: { gamertag: string } | { gamertag: string }[] | null;
	teams: { name: string } | { name: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

// Who was swapped out or brought in, and when. Visible to organisers and the match's contributor.
export default function RosterHistory({
	instanceId,
	matchId,
	title = 'Roster change history',
}: {
	instanceId?: string;
	matchId?: string;
	title?: string;
}) {
	const [rows, setRows] = useState<Row[] | null>(null);

	useEffect(() => {
		let cancelled = false;
		const supabase = createClient();
		let q = supabase
			.from('match_roster_changes')
			.select('id, action, created_at, players(gamertag), teams(name)')
			.order('created_at', { ascending: false })
			.limit(100);
		if (matchId) q = q.eq('match_id', matchId);
		else if (instanceId) q = q.eq('comp_instance_id', instanceId);
		q.then(({ data }) => {
			if (!cancelled) setRows((data ?? []) as unknown as Row[]);
		});
		return () => {
			cancelled = true;
		};
	}, [instanceId, matchId]);

	return (
		<div className="space-y-2">
			<h4 className="font-display text-xs font-bold uppercase tracking-wider text-text-muted">{title}</h4>
			{rows === null ? (
				<p className="text-xs text-text-muted">Loading...</p>
			) : rows.length === 0 ? (
				<p className="text-xs text-text-muted">No roster changes yet.</p>
			) : (
				<ul className="divide-y divide-border-line rounded border border-border-line text-xs">
					{rows.map((r) => (
						<li key={r.id} className="flex items-center gap-3 px-3 py-2">
							<span
								className={`w-10 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-bold uppercase ${
									r.action === 'out' ? 'bg-red-500/10 text-red-500' : 'bg-state-win/10 text-state-win'
								}`}
							>
								{r.action}
							</span>
							<span className="font-semibold text-text-primary">{one(r.players)?.gamertag ?? 'Player'}</span>
							<span className="text-text-muted">{one(r.teams)?.name ?? ''}</span>
							<span className="ml-auto shrink-0 font-data text-text-muted">
								{new Date(r.created_at).toLocaleString([], {
									day: 'numeric',
									month: 'short',
									hour: '2-digit',
									minute: '2-digit',
									hourCycle: 'h23',
								})}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
