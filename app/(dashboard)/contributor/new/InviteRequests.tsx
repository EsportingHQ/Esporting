'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export type InviteRequest = {
	id: string;
	email: string;
	display_name: string | null;
	status: 'pending' | 'approved' | 'rejected';
	review_note: string | null;
	created_at: string;
	competition: string;
	requested_by_name: string;
};

export default function InviteRequests({
	requests,
	isAdmin,
}: {
	requests: InviteRequest[];
	isAdmin: boolean;
}) {
	const router = useRouter();
	const [supabase] = useState(() => createClient());
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [ok, setOk] = useState<string | null>(null);

	if (requests.length === 0) return null;

	async function approve(id: string) {
		setBusy(id);
		setError(null);
		setOk(null);
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-contributor`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${session?.access_token}`,
				apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ request_id: id }),
		});
		const data = await res.json();
		setBusy(null);
		if (!res.ok) return setError(data.error ?? 'Could not approve');
		setOk(data.message ?? 'Approved');
		router.refresh();
	}

	async function reject(id: string) {
		setBusy(id);
		setError(null);
		const { error: e } = await supabase.rpc('reject_contributor_request', { p_id: id });
		setBusy(null);
		if (e) return setError(e.message);
		router.refresh();
	}

	return (
		<div className="max-w-xl space-y-3 font-body mt-8">
			<h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">
				{isAdmin ? 'Contributor requests from organisers' : 'Your contributor requests'}
			</h3>
			{error && <p className="text-xs text-state-loss">{error}</p>}
			{ok && <p className="text-xs text-state-win">{ok}</p>}
			{requests.map((r) => (
				<div key={r.id} className="bg-bg-surface border border-border-line rounded p-3 text-xs flex flex-wrap items-center justify-between gap-2">
					<div className="min-w-0">
						<p className="font-semibold text-text-primary truncate">{r.display_name ? `${r.display_name} · ` : ''}{r.email}</p>
						<p className="text-text-muted truncate">
							{r.competition}
							{isAdmin ? ` · requested by ${r.requested_by_name}` : ''}
						</p>
					</div>
					{r.status === 'pending' && isAdmin ? (
						<div className="flex gap-2">
							<button disabled={busy === r.id} onClick={() => approve(r.id)} className="px-3 py-1.5 rounded bg-accent-primary text-white font-display font-bold uppercase tracking-wider disabled:opacity-50">
								Approve
							</button>
							<button disabled={busy === r.id} onClick={() => reject(r.id)} className="px-3 py-1.5 rounded border border-border-line text-text-muted font-display font-bold uppercase tracking-wider disabled:opacity-50">
								Reject
							</button>
						</div>
					) : (
						<span
							className={`font-display font-bold uppercase tracking-wider ${
								r.status === 'approved' ? 'text-state-win' : r.status === 'rejected' ? 'text-state-loss' : 'text-state-alert'
							}`}
						>
							{r.status === 'pending' ? 'Waiting for Esporting' : r.status}
						</span>
					)}
				</div>
			))}
		</div>
	);
}
