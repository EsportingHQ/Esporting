'use client';

import { useState } from 'react';
import { Modal, modalButton, modalDanger, modalPrimary } from '@/components/ui/Modal';

type TeamRef = { id: string; name: string } | null;
type Step = 'none' | 'cancel' | 'carry' | 'delay';

const field =
	'w-full rounded-lg border border-border-line bg-bg-surface px-3 py-2 text-sm text-text-primary';

// Quiet secondary actions (delay / cancel) and the pop-ups behind them.
export default function CancelFlow({
	status,
	home,
	away,
	hasPlay,
	onDelay,
	onCancel,
	onWalkover,
}: {
	status: string;
	home: TeamRef;
	away: TeamRef;
	hasPlay: boolean;
	onDelay: (reason: string) => Promise<void>;
	onCancel: (reason: string, carryOver: boolean | null) => Promise<void>;
	onWalkover: (winnerId: string, reason: string) => Promise<void>;
}) {
	const [step, setStep] = useState<Step>('none');
	const [kind, setKind] = useState<'later' | 'forfeit'>('later');
	const [reason, setReason] = useState('');
	const [winner, setWinner] = useState('');
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const canForfeit = !!home && !!away;
	const canDelay = status === 'scheduled';

	function close() {
		if (busy) return;
		setStep('none');
		setKind('later');
		setReason('');
		setWinner('');
		setErr(null);
	}

	async function run(fn: () => Promise<void>) {
		setBusy(true);
		setErr(null);
		try {
			await fn();
			setBusy(false);
			setStep('none');
			setKind('later');
			setReason('');
			setWinner('');
		} catch (e) {
			setBusy(false);
			setErr(e instanceof Error ? e.message : 'Something went wrong');
		}
	}

	function continueFromCancel() {
		setErr(null);
		if (!reason.trim()) return setErr('Add a reason first.');
		if (kind === 'forfeit') {
			if (!winner) return setErr('Pick the team that is awarded the win.');
			return void run(() => onWalkover(winner, reason.trim()));
		}
		if (hasPlay) return setStep('carry');
		void run(() => onCancel(reason.trim(), null));
	}

	return (
		<>
			<div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
				{canDelay ? (
					<button type="button" onClick={() => setStep('delay')} className="text-text-muted underline-offset-2 hover:underline">
						Mark delayed
					</button>
				) : null}
				<button type="button" onClick={() => setStep('cancel')} className="text-red-500 underline-offset-2 hover:underline">
					Cancel match
				</button>
			</div>

			<Modal open={step === 'cancel'} title="Why is this match being cancelled?" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<label className="flex items-start gap-2">
						<input type="radio" checked={kind === 'later'} onChange={() => setKind('later')} className="mt-1" />
						<span>
							<span className="font-semibold">Cancel for now</span>
							<span className="block text-xs text-text-muted">The organiser will set a new date.</span>
						</span>
					</label>
					<label className={`flex items-start gap-2 ${canForfeit ? '' : 'opacity-50'}`}>
						<input
							type="radio"
							checked={kind === 'forfeit'}
							onChange={() => setKind('forfeit')}
							disabled={!canForfeit}
							className="mt-1"
						/>
						<span>
							<span className="font-semibold">Cancel for good (walkover / forfeit)</span>
							<span className="block text-xs text-text-muted">One team is awarded the win. This is final.</span>
						</span>
					</label>
					{kind === 'forfeit' ? (
						<select value={winner} onChange={(e) => setWinner(e.target.value)} className={field}>
							<option value="">Who is awarded the win?</option>
							{home ? <option value={home.id}>{home.name}</option> : null}
							{away ? <option value={away.id}>{away.name}</option> : null}
						</select>
					) : null}
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className={field}
						rows={3}
						placeholder="Reason (the organiser will see this)"
					/>
					{err ? <p className="text-xs text-red-500">{err}</p> : null}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={close} disabled={busy} className={modalButton}>
							Back
						</button>
						<button type="button" onClick={continueFromCancel} disabled={busy} className={kind === 'forfeit' ? modalDanger : modalPrimary}>
							{busy ? 'Saving...' : kind === 'forfeit' ? 'Award walkover' : hasPlay ? 'Continue' : 'Cancel match'}
						</button>
					</div>
				</div>
			</Modal>

			<Modal open={step === 'carry'} title="Carry the recorded scores over?" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<p className="text-text-muted">
						Scores were already recorded for this match. If you ask to carry them over, the organiser decides when
						they reschedule it. If not, the match restarts from 0.
					</p>
					{err ? <p className="text-xs text-red-500">{err}</p> : null}
					<div className="flex flex-wrap justify-end gap-2">
						<button type="button" onClick={() => setStep('cancel')} disabled={busy} className={modalButton}>
							Back
						</button>
						<button type="button" onClick={() => run(() => onCancel(reason.trim(), false))} disabled={busy} className={modalButton}>
							Start fresh
						</button>
						<button type="button" onClick={() => run(() => onCancel(reason.trim(), true))} disabled={busy} className={modalPrimary}>
							{busy ? 'Saving...' : 'Ask to carry over'}
						</button>
					</div>
				</div>
			</Modal>

			<Modal open={step === 'delay'} title="Mark this match as delayed" onClose={close} busy={busy}>
				<div className="space-y-3 text-sm">
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className={field}
						rows={3}
						placeholder="Reason (optional)"
					/>
					{err ? <p className="text-xs text-red-500">{err}</p> : null}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={close} disabled={busy} className={modalButton}>
							Back
						</button>
						<button type="button" onClick={() => run(() => onDelay(reason.trim()))} disabled={busy} className={modalPrimary}>
							{busy ? 'Saving...' : 'Mark delayed'}
						</button>
					</div>
				</div>
			</Modal>
		</>
	);
}
