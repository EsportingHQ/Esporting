'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TierBadge } from '@/components/organiser/TierBadge';

export type TierRequestRow = {
	id: string;
	user_id: string;
	display_name: string | null;
	requested_tier: string;
	current_tier: string | null;
	org_name: string | null;
	registration_no: string | null;
	evidence: string | null;
	status: 'pending' | 'approved' | 'rejected';
	review_note: string | null;
	created_at: string;
};
export type OrganiserTierRow = {
	user_id: string;
	display_name: string | null;
	org_name: string | null;
	tier: string;
	live_count: number;
};

export default function TierRequestsClient({
	requests,
	organisers,
}: {
	requests: TierRequestRow[];
	organisers: OrganiserTierRow[];
}) {
	const router = useRouter();
	const [supabase] = useState(() => createClient());
	const [busy, setBusy] = useState<string | null>(null);
	const [notes, setNotes] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const pending = requests.filter((r) => r.status === 'pending');
	const done = requests.filter((r) => r.status !== 'pending');

	async function review(id: string, approve: boolean) {
		setBusy(id);
		setError(null);
		const { error: e } = await supabase.rpc('review_tier_request', {
			p_id: id,
			p_approve: approve,
			p_note: notes[id]?.trim() || null,
		});
		setBusy(null);
		if (e) return setError(e.message);
		router.refresh();
	}

	async function setTier(userId: string, tier: string) {
		setBusy(userId);
		setError(null);
		const { error: e } = await supabase.rpc('set_organiser_tier', { p_user: userId, p_tier: tier });
		setBusy(null);
		if (e) return setError(e.message);
		router.refresh();
	}

	return (
		<div className="space-y-8 font-body">
			<div>
				<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">Organiser Tiers</h2>
				<p className="text-xs text-text-muted font-data mt-1 uppercase">
					Upgrade requests ({pending.length} waiting) and every organiser&apos;s level
				</p>
			</div>

			{error && (
				<div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded px-4 py-3 text-xs">{error}</div>
			)}

			<div className="space-y-3">
				{pending.length === 0 && <p className="text-xs text-text-muted italic">No upgrade requests waiting.</p>}
				{pending.map((r) => (
					<div key={r.id} className="bg-bg-surface border border-border-line rounded p-4 space-y-3 text-xs">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="font-display font-black text-sm text-text-primary">{r.display_name ?? 'Organiser'}</span>
							<span className="flex items-center gap-2">
								<TierBadge tier={r.current_tier} /> <span className="text-text-muted">→</span> <TierBadge tier={r.requested_tier} />
							</span>
						</div>
						{r.org_name && <p className="text-text-primary">Organisation: {r.org_name}</p>}
						{r.registration_no && <p className="text-text-primary">CAC number: {r.registration_no}</p>}
						{r.evidence && <p className="text-text-muted whitespace-pre-wrap">{r.evidence}</p>}
						<input
							placeholder="Note to the organiser (optional)"
							value={notes[r.id] ?? ''}
							onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
							className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-xs"
						/>
						<div className="flex gap-2">
							<button
								disabled={busy === r.id}
								onClick={() => review(r.id, true)}
								className="px-4 py-2 rounded bg-accent-primary text-white font-display font-bold uppercase tracking-wider disabled:opacity-50"
							>
								Approve
							</button>
							<button
								disabled={busy === r.id}
								onClick={() => review(r.id, false)}
								className="px-4 py-2 rounded border border-border-line text-text-muted font-display font-bold uppercase tracking-wider disabled:opacity-50"
							>
								Reject
							</button>
						</div>
					</div>
				))}
			</div>

			<div className="space-y-3">
				<h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">All organisers</h3>
				{organisers.map((o) => (
					<div key={o.user_id} className="bg-bg-surface border border-border-line rounded p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
						<div className="min-w-0">
							<p className="font-semibold text-text-primary truncate">{o.display_name ?? 'Organiser'}</p>
							<p className="text-text-muted truncate">
								{o.org_name ?? 'No organisation name'} · {o.live_count} live
							</p>
						</div>
						<select
							value={o.tier}
							disabled={busy === o.user_id}
							onChange={(e) => setTier(o.user_id, e.target.value)}
							className="bg-bg-void border border-border-line rounded px-2 py-1.5"
						>
							<option value="trial">Trial</option>
							<option value="community">Community</option>
							<option value="business">Verified Business</option>
						</select>
					</div>
				))}
			</div>

			{done.length > 0 && (
				<div className="space-y-2">
					<h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">Reviewed</h3>
					{done.map((r) => (
						<p key={r.id} className="text-xs text-text-muted">
							{r.display_name ?? 'Organiser'} · {r.requested_tier} · {r.status}
							{r.review_note ? ` · ${r.review_note}` : ''}
						</p>
					))}
				</div>
			)}
		</div>
	);
}
