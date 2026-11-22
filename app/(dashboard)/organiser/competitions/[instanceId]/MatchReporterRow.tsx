'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ReporterPicker, {
	reporterError,
	type ContributorOption,
	type ReporterValue,
} from './ReporterPicker';

export type ReporterMatch = {
	id: string;
	status: string;
	contrib_id?: string | null;
	backup_contrib_id?: string | null;
	assignment_mode?: string | null;
	needs_cover?: boolean | null;
	contrib_confirmed_at?: string | null;
};

export function reporterLabel(
	m: ReporterMatch,
	contributors: ContributorOption[],
): { text: string; cls: string } {
	const name = (id?: string | null) => contributors.find((c) => c.id === id)?.name ?? null;
	if (m.assignment_mode === 'self') return { text: 'You report this match', cls: 'text-sky-400' };
	if (m.contrib_id) {
		const backup = name(m.backup_contrib_id);
		return {
			text: `${name(m.contrib_id) ?? 'A contributor'} (${m.contrib_confirmed_at ? 'confirmed' : 'waiting to confirm'})${backup ? ` · backup ${backup}` : ''}`,
			cls: m.contrib_confirmed_at ? 'text-green-400' : 'text-amber-400',
		};
	}
	if (m.needs_cover) return { text: 'Needs cover — contributor dropped out', cls: 'text-red-400' };
	if (m.assignment_mode === 'open') return { text: 'Open to claim', cls: 'text-sky-400' };
	return { text: 'No contributor yet', cls: 'text-amber-400' };
}

export default function MatchReporterRow({
	match,
	contributors,
}: {
	match: ReporterMatch;
	contributors: ContributorOption[];
}) {
	const router = useRouter();
	const [supabase] = useState(() => createClient());
	const [open, setOpen] = useState(false);
	const [value, setValue] = useState<ReporterValue>({
		mode: (match.assignment_mode as ReporterValue['mode']) ?? 'assigned',
		primaryId: match.assignment_mode === 'assigned' ? (match.contrib_id ?? '') : '',
		backupId: match.backup_contrib_id ?? '',
	});
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const label = reporterLabel(match, contributors);
	const canChange = match.status === 'scheduled' || match.status === 'delayed';

	async function save() {
		setError(null);
		const problem = reporterError(value);
		if (problem) return setError(problem);
		setSaving(true);
		const { error: rpcError } = await supabase.rpc('assign_match_reporting', {
			p_match_id: match.id,
			p_mode: value.mode,
			p_primary: value.mode === 'assigned' ? value.primaryId : null,
			p_backup: value.mode === 'assigned' && value.backupId ? value.backupId : null,
		});
		setSaving(false);
		if (rpcError) return setError(rpcError.message);
		setOpen(false);
		router.refresh();
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<span className={`text-xs font-semibold ${label.cls}`}>{label.text}</span>
				{canChange && (
					<button
						type="button"
						onClick={() => setOpen(!open)}
						className="px-3 py-1 rounded border border-border-line text-[11px] font-display font-bold uppercase tracking-wider hover:border-accent-primary/50"
					>
						{open ? 'Close' : 'Who reports?'}
					</button>
				)}
			</div>
			{open && (
				<div className="space-y-3 pt-1">
					<ReporterPicker value={value} onChange={setValue} contributors={contributors} />
					{error && <p className="text-xs text-red-400">{error}</p>}
					<button
						type="button"
						disabled={saving}
						onClick={save}
						className="px-4 py-2 rounded bg-accent-primary text-white text-xs font-display font-black uppercase tracking-wider disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			)}
		</div>
	);
}
