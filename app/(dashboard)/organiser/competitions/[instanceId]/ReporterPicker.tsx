'use client';

// "Who reports this match?" — the three choices from the contributor flow:
//   assigned: name a primary contributor (and an optional backup)
//   open:     leave it for any contributor to claim
//   self:     the organiser reports it themselves

export type ReporterMode = 'assigned' | 'open' | 'self';
export type ContributorOption = { id: string; name: string };

export type ReporterValue = {
	mode: ReporterMode;
	primaryId: string;
	backupId: string;
};

const MODES: { id: ReporterMode; title: string; body: string }[] = [
	{ id: 'assigned', title: 'Assign a contributor', body: 'Pick who reports it and who is on standby.' },
	{ id: 'open', title: 'Leave it open to claim', body: 'Shows in contributors’ Open tab. First to claim gets it.' },
	{ id: 'self', title: 'I will report it myself', body: 'You get the match in your own Contributor view.' },
];

export function reporterError(v: ReporterValue): string | null {
	if (v.mode === 'assigned' && !v.primaryId) return 'Choose a primary contributor';
	if (v.mode === 'assigned' && v.backupId && v.backupId === v.primaryId) {
		return 'Backup must be a different person';
	}
	return null;
}

export default function ReporterPicker({
	value,
	onChange,
	contributors,
}: {
	value: ReporterValue;
	onChange: (v: ReporterValue) => void;
	contributors: ContributorOption[];
}) {
	return (
		<div style={{ marginBottom: 14 }}>
			<label style={label}>Who reports this match?</label>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				{MODES.map((m) => {
					const on = value.mode === m.id;
					return (
						<button
							key={m.id}
							type="button"
							onClick={() =>
								onChange({ mode: m.id, primaryId: '', backupId: '' })
							}
							style={{
								textAlign: 'left',
								background: 'var(--color-bg-elevated)',
								color: 'var(--color-text-primary)',
								border: `1px solid ${on ? '#16a34a' : 'var(--color-border-strong)'}`,
								borderRadius: 8,
								padding: '8px 12px',
								cursor: 'pointer',
							}}
						>
							<span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>
								{m.title}
							</span>
							<span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
								{m.body}
							</span>
						</button>
					);
				})}
			</div>

			{value.mode === 'assigned' && (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 10,
						marginTop: 10,
					}}
				>
					<div>
						<label style={label}>Primary</label>
						<select
							value={value.primaryId}
							onChange={(e) => onChange({ ...value, primaryId: e.target.value })}
							style={input}
						>
							<option value="">Select contributor</option>
							{contributors.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label style={label}>Backup (optional)</label>
						<select
							value={value.backupId}
							onChange={(e) => onChange({ ...value, backupId: e.target.value })}
							style={input}
						>
							<option value="">No backup</option>
							{contributors
								.filter((c) => c.id !== value.primaryId)
								.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
						</select>
					</div>
					{contributors.length === 0 && (
						<p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--c-warn)' }}>
							No contributors yet. Invite some from the admin dashboard, or leave
							the match open.
						</p>
					)}
				</div>
			)}
		</div>
	);
}

const label: React.CSSProperties = {
	display: 'block',
	fontSize: 12,
	color: 'var(--color-text-muted)',
	marginBottom: 4,
};

const input: React.CSSProperties = {
	width: '100%',
	background: 'var(--color-bg-elevated)',
	color: 'var(--color-text-primary)',
	border: '1px solid var(--color-border-strong)',
	borderRadius: 6,
	padding: '8px 10px',
	fontSize: 13,
};
