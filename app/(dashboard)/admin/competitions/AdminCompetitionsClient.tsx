'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from 'lucide-react';

export type CompRow = {
	id: string;
	name: string;
	slug: string;
	status: string;
	format: string;
	starts_at: string | null;
	organiser: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null;
	comp_registrations: { id: string }[] | null;
	matches: { status: string }[] | null;
};

const STATUS_STYLE: Record<string, string> = {
	ongoing: 'bg-state-win/10 text-state-win border-state-win/30',
	registration: 'bg-accent-readout/10 text-accent-readout border-accent-readout/30',
	draft: 'bg-bg-void text-text-muted border-border-line',
	completed: 'bg-bg-void text-text-muted border-border-line',
	cancelled: 'bg-state-loss/10 text-state-loss border-state-loss/30',
};

function organiserName(o: CompRow['organiser']): string {
	const p = Array.isArray(o) ? o[0] : o;
	return p ? (p.display_name ?? p.username) : 'Admin';
}

export default function AdminCompetitionsClient({ competitions }: { competitions: CompRow[] }) {
	const supabase = createClient();
	const [rows, setRows] = useState(competitions);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete(c: CompRow) {
		setError(null);
		if ((c.matches ?? []).some((m) => m.status === 'live')) {
			setError(`"${c.name}" has a live match. End it before deleting the competition.`);
			setConfirmId(null);
			return;
		}
		// Soft delete: the competition and its matches disappear from every page but stay in the database.
		const { error: delError } = await supabase
			.from('comp_instances')
			.update({ deleted_at: new Date().toISOString(), status: 'cancelled' })
			.eq('id', c.id);
		if (delError) {
			setError(delError.message);
			return;
		}
		setRows((prev) => prev.filter((r) => r.id !== c.id));
		setConfirmId(null);
	}

	return (
		<div className="space-y-6 font-body">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
						Competitions
					</h2>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						Every competition, whoever set it up
					</p>
				</div>
				<Link
					href="/organiser/competitions/new"
					className="flex items-center gap-2 bg-accent-primary text-white text-xs font-display font-bold uppercase tracking-wider px-4 py-2.5 rounded shrink-0"
				>
					<Plus className="w-4 h-4" /> New competition
				</Link>
			</div>

			{error && (
				<div className="bg-state-loss/10 border border-state-loss/30 text-state-loss px-4 py-3 rounded text-xs">
					{error}
				</div>
			)}

			{rows.length === 0 ? (
				<div className="bg-bg-surface border border-border-line rounded p-12 text-center text-sm text-text-muted">
					No competitions yet. Create the first one.
				</div>
			) : (
				<div className="space-y-3">
					{rows.map((c) => (
						<div key={c.id} className="bg-bg-surface border border-border-line rounded p-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<h3 className="font-display font-bold text-base text-text-primary uppercase tracking-wide truncate">
											{c.name}
										</h3>
										<span
											className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider border ${STATUS_STYLE[c.status] ?? STATUS_STYLE.draft}`}
										>
											{c.status}
										</span>
									</div>
									<p className="text-xs text-text-muted font-data mt-1">
										{c.format} · {c.comp_registrations?.length ?? 0} teams ·{' '}
										{c.matches?.length ?? 0} matches · by {organiserName(c.organiser)}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Link
										href={`/organiser/competitions/${c.id}`}
										className="text-xs font-display font-bold uppercase tracking-wider px-3 py-2 rounded border border-border-line text-text-primary hover:border-accent-readout/40"
									>
										Manage
									</Link>
									{confirmId === c.id ? (
										<>
											<button
												type="button"
												onClick={() => handleDelete(c)}
												className="text-xs font-display font-bold uppercase tracking-wider px-3 py-2 rounded bg-state-loss text-white"
											>
												Yes, delete
											</button>
											<button
												type="button"
												onClick={() => setConfirmId(null)}
												className="text-xs px-3 py-2 text-text-muted"
											>
												Cancel
											</button>
										</>
									) : (
										<button
											type="button"
											aria-label={`Delete ${c.name}`}
											onClick={() => setConfirmId(c.id)}
											className="p-2 rounded border border-border-line text-text-muted hover:text-state-loss hover:border-state-loss/40"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
