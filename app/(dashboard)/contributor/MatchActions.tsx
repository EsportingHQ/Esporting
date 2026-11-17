'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Action = 'confirm' | 'release' | 'claim';

const RPC: Record<Action, string> = {
	confirm: 'confirm_match',
	release: 'release_match',
	claim: 'claim_match',
};

const DONE_MESSAGE: Record<Action, string> = {
	confirm: 'Confirmed.',
	release: 'Released. It is now open for someone else to cover.',
	claim: 'Claimed. It is now in your Mine tab.',
};

export default function MatchActions({
	matchId,
	canConfirm,
	canRelease,
	canClaim,
	claimLabel,
	roomHref,
	roomLabel,
	roomDisabledReason,
}: {
	matchId: string;
	canConfirm: boolean;
	canRelease: boolean;
	canClaim: boolean;
	claimLabel: string;
	/** Link to the match room, when this person may open it. */
	roomHref: string | null;
	roomLabel: string;
	/** Why the match room is not open yet, shown as a disabled button. */
	roomDisabledReason: string | null;
}) {
	const router = useRouter();
	const supabase = createClient();
	const [busy, setBusy] = useState<Action | null>(null);
	const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

	async function run(action: Action) {
		setBusy(action);
		setMessage(null);
		const { error } = await supabase.rpc(RPC[action], { p_match_id: matchId });
		setBusy(null);
		if (error) {
			setMessage({ text: error.message, ok: false });
			return;
		}
		setMessage({ text: DONE_MESSAGE[action], ok: true });
		router.refresh();
	}

	const primary =
		'flex-1 min-h-[40px] px-3 rounded text-xs font-display font-bold uppercase tracking-wider text-center flex items-center justify-center';

	return (
		<div className="mt-3 pt-3 border-t border-border-line space-y-2">
			<div className="flex gap-2">
				{canConfirm && (
					<button
						type="button"
						disabled={busy !== null}
						onClick={() => run('confirm')}
						className={`${primary} bg-accent-primary text-white disabled:opacity-50`}
					>
						{busy === 'confirm' ? 'Saving...' : 'Confirm I will cover this'}
					</button>
				)}
				{canClaim && (
					<button
						type="button"
						disabled={busy !== null}
						onClick={() => run('claim')}
						className={`${primary} bg-accent-primary text-white disabled:opacity-50`}
					>
						{busy === 'claim' ? 'Claiming...' : claimLabel}
					</button>
				)}
				{roomHref && (
					<Link
						href={roomHref}
						className={`${primary} bg-accent-readout/90 text-bg-void`}
					>
						{roomLabel}
					</Link>
				)}
				{!roomHref && roomDisabledReason && (
					<span
						aria-disabled="true"
						className={`${primary} bg-bg-void text-text-muted border border-border-line normal-case font-body font-normal`}
					>
						{roomDisabledReason}
					</span>
				)}
				{canRelease && (
					<button
						type="button"
						disabled={busy !== null}
						onClick={() => run('release')}
						className={`${primary} flex-none bg-bg-void text-text-muted border border-border-line disabled:opacity-50`}
					>
						{busy === 'release' ? '...' : "Can't make it"}
					</button>
				)}
			</div>
			{message && (
				<p className={`text-xs ${message.ok ? 'text-state-win' : 'text-state-loss'}`}>
					{message.text}
				</p>
			)}
		</div>
	);
}
