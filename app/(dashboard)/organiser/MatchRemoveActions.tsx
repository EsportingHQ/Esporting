'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Modal, modalButton, modalDanger, modalPrimary } from '@/components/ui/Modal';

type Dialog = 'none' | 'permanent' | 'confirm' | 'walkover';

const field = 'w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary';

// Quiet links next to a match: award a walkover, or cancel it for good.
// Cancelling for good asks twice, so a stray click cannot remove a match.
export default function MatchRemoveActions({
	matchId,
	label,
	walkover,
}: {
	matchId: string;
	label: string;
	walkover?: { homeId: string | null; homeName: string; awayId: string | null; awayName: string };
}) {
	const router = useRouter();
	const [supabase] = useState(() => createClient());
	const [dialog, setDialog] = useState<Dialog>('none');
	const [reason, setReason] = useState('');
	const [winner, setWinner] = useState('');
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	function close() {
		if (busy) return;
		setDialog('none');
		setReason('');
		setWinner('');
		setErr(null);
	}

	async function cancelForGood() {
		setBusy(true);
		setErr(null);
		const { error } = await supabase.rpc('cancel_match_permanently', { p_match: matchId, p_reason: reason.trim() || null });
		setBusy(false);
		if (error) return setErr(error.message);
		setDialog('none');
		router.refresh();
	}

	async function awardWalkover() {
		if (!winner) return setErr('Pick the team that is awarded the win.');
		if (!reason.trim()) return setErr('Add a reason for the walkover.');
		setBusy(true);
		setErr(null);
		const { error } = await supabase.rpc('declare_walkover', { p_match: matchId, p_winner: winner, p_reason: reason.trim() });
		setBusy(false);
		if (error) return setErr(error.message);
		setDialog('none');
		router.refresh();
	}

	const canWalkover = !!walkover && !!walkover.homeId && !!walkover.awayId;

	return (
		<>
			<div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
				{canWalkover ? (
					<button type="button" onClick={() => setDialog('walkover')} className="text-text-muted underline-offset-2 hover:underline">
						Award walkover
					</button>
				) : null}
				<button type="button" onClick={() => setDialog('permanent')} className="text-red-500 underline-offset-2 hover:underline">
					Cancel permanently
				</button>
			</div>

			<Modal open={dialog === 'permanent'} title="Cancel this match permanently?" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<p className="text-text-muted">
						{label} will be removed from the schedule and the live feed for good. Use this for duplicates or mistakes.
					</p>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className={field}
						rows={2}
						placeholder="Reason (optional)"
					/>
					<div className="flex justify-end gap-2">
						<button type="button" onClick={close} className={modalButton}>
							Keep match
						</button>
						<button type="button" onClick={() => setDialog('confirm')} className={modalDanger}>
							Cancel permanently
						</button>
					</div>
				</div>
			</Modal>

			<Modal open={dialog === 'confirm'} title="Are you sure?" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<p className="text-text-muted">
						This will permanently cancel <span className="font-semibold text-text-primary">{label}</span>. It cannot be
						undone from here.
					</p>
					{err ? <p className="text-xs text-red-500">{err}</p> : null}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={() => setDialog('permanent')} disabled={busy} className={modalButton}>
							Go back
						</button>
						<button type="button" onClick={cancelForGood} disabled={busy} className={modalDanger}>
							{busy ? 'Cancelling...' : 'Yes, cancel permanently'}
						</button>
					</div>
				</div>
			</Modal>

			<Modal open={dialog === 'walkover'} title="Award a walkover" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<p className="text-text-muted">One team is awarded the win. In a bracket, the winner moves on.</p>
					<select value={winner} onChange={(e) => setWinner(e.target.value)} className={field}>
						<option value="">Who is awarded the win?</option>
						{walkover?.homeId ? <option value={walkover.homeId}>{walkover.homeName}</option> : null}
						{walkover?.awayId ? <option value={walkover.awayId}>{walkover.awayName}</option> : null}
					</select>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className={field}
						rows={2}
						placeholder="Reason (for example: no-show)"
					/>
					{err ? <p className="text-xs text-red-500">{err}</p> : null}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={close} disabled={busy} className={modalButton}>
							Back
						</button>
						<button type="button" onClick={awardWalkover} disabled={busy} className={modalPrimary}>
							{busy ? 'Saving...' : 'Award walkover'}
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
