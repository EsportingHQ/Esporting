'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { TierBadge, TIER_INFO, type OrganiserTier } from '@/components/organiser/TierBadge';

export type TierRequest = {
	id: string;
	requested_tier: 'community' | 'business';
	status: 'pending' | 'approved' | 'rejected';
	review_note: string | null;
	created_at: string;
};

const ORDER: OrganiserTier[] = ['trial', 'community', 'business'];
const field =
	'w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary';

export default function ProfileClient({
	name,
	email,
	tier,
	orgName,
	liveCount,
	requests,
}: {
	name: string;
	email: string;
	tier: OrganiserTier;
	orgName: string;
	liveCount: number;
	requests: TierRequest[];
}) {
	const router = useRouter();
	const [supabase] = useState(() => createClient());
	const options = ORDER.filter((t) => ORDER.indexOf(t) > ORDER.indexOf(tier)) as ('community' | 'business')[];
	const [target, setTarget] = useState<'community' | 'business'>(options[0] ?? 'business');
	const [org, setOrg] = useState(orgName);
	const [regNo, setRegNo] = useState('');
	const [evidence, setEvidence] = useState('');
	const [busy, setBusy] = useState(false);
	const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
	const pending = requests.find((r) => r.status === 'pending');
	const lastReviewed = requests.find((r) => r.status !== 'pending');

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setBusy(true);
		setMsg(null);
		const { error } = await supabase.rpc('request_tier_upgrade', {
			p_tier: target,
			p_org_name: org,
			p_registration_no: regNo,
			p_evidence: evidence,
		});
		setBusy(false);
		if (error) return setMsg({ text: error.message, ok: false });
		setMsg({ text: 'Request sent. Esporting will review it.', ok: true });
		router.refresh();
	}

	return (
		<div className="space-y-8 font-body max-w-3xl">
			<div className="flex items-center gap-4">
				<div className="w-16 h-16 rounded-2xl bg-accent-primary/15 border border-accent-primary/30 flex items-center justify-center font-display font-black text-2xl text-accent-glow">
					{name.slice(0, 1).toUpperCase()}
				</div>
				<div className="space-y-1 min-w-0">
					<h2 className="font-display font-black text-2xl tracking-wide text-text-primary truncate">{name}</h2>
					<p className="text-xs text-text-muted truncate">
						{orgName ? `${orgName} · ` : ''}
						{email}
					</p>
					<TierBadge tier={tier} />
				</div>
			</div>

			{/* Tier ladder */}
			<div className="space-y-3">
				<h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">Organiser levels</h3>
				<div className="grid sm:grid-cols-3 gap-3">
					{ORDER.map((t) => {
						const current = t === tier;
						const reached = ORDER.indexOf(t) <= ORDER.indexOf(tier);
						return (
							<div
								key={t}
								className={`rounded-xl border p-4 space-y-2 ${
									current ? 'border-accent-primary bg-accent-primary/[0.06]' : 'border-border-line bg-bg-surface'
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-display font-bold text-sm text-text-primary">{TIER_INFO[t].label}</span>
									{reached && <Check className="w-4 h-4 text-accent-cyan" />}
								</div>
								<p className="text-xs text-text-muted leading-relaxed">{TIER_INFO[t].blurb}</p>
								{current && (
									<span className="text-[10px] font-display font-bold uppercase tracking-wider text-accent-glow">
										You are here
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{tier === 'trial' && (
				<div className="bg-bg-surface border border-border-line rounded-xl p-4 text-xs space-y-1">
					<p className="font-display font-bold uppercase tracking-wider text-text-muted">Your trial limits</p>
					<p className="text-text-primary">
						Live tournaments: {liveCount} of 1 · Teams per tournament: up to 8
					</p>
					<p className="text-text-muted">Esporting looks at your first tournament after it ends before upgrading you.</p>
				</div>
			)}

			{/* Upgrade request */}
			{options.length > 0 && (
				<div className="space-y-3">
					<h3 className="font-display font-bold text-xs uppercase tracking-widest text-text-muted">Ask for an upgrade</h3>
					{pending ? (
						<div className="bg-state-alert/10 border border-state-alert/30 text-state-alert rounded-xl p-4 text-xs">
							Your request for {TIER_INFO[pending.requested_tier].label} is waiting for review.
						</div>
					) : (
						<form onSubmit={submit} className="bg-bg-surface border border-border-line rounded-xl p-5 space-y-4">
							{lastReviewed?.status === 'rejected' && (
								<p className="text-xs text-state-loss">
									Your last request was not approved{lastReviewed.review_note ? `: ${lastReviewed.review_note}` : '.'}
								</p>
							)}
							<div className="flex gap-2">
								{options.map((o) => (
									<button
										key={o}
										type="button"
										onClick={() => setTarget(o)}
										className={`px-4 py-2 rounded-lg border text-xs font-display font-bold ${
											target === o
												? 'bg-accent-primary text-white border-accent-primary'
												: 'border-border-line text-text-muted'
										}`}
									>
										{TIER_INFO[o].label}
									</button>
								))}
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-display font-bold uppercase tracking-wider text-text-muted">
									Organisation name
								</label>
								<input value={org} onChange={(e) => setOrg(e.target.value)} className={field} />
							</div>
							{target === 'business' && (
								<div className="space-y-1">
									<label className="text-[10px] font-display font-bold uppercase tracking-wider text-text-muted">
										CAC registration number
									</label>
									<input value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. RC1234567" className={field} />
								</div>
							)}
							<div className="space-y-1">
								<label className="text-[10px] font-display font-bold uppercase tracking-wider text-text-muted">
									{target === 'business'
										? 'Website, socials and anything that proves the business'
										: 'Where we can see your community: socials, past events, school or club details'}
								</label>
								<textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={4} className={field} />
							</div>
							{msg && <p className={`text-xs ${msg.ok ? 'text-state-win' : 'text-state-loss'}`}>{msg.text}</p>}
							<button
								disabled={busy}
								className="px-5 py-2.5 rounded-lg bg-accent-primary text-white font-display font-black text-xs uppercase tracking-wider disabled:opacity-50"
							>
								{busy ? 'Sending...' : 'Send request'}
							</button>
						</form>
					)}
				</div>
			)}
		</div>
	);
}
