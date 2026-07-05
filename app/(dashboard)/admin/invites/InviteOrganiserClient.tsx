'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type OrganiserRow = {
	user_id: string;
	granted_at: string;
	profiles: { username: string; display_name: string | null } | null;
};

type Props = {
	existingOrganisers: OrganiserRow[];
};

export default function InviteOrganiserClient({ existingOrganisers }: Props) {
	const supabase = createClient();

	const [email, setEmail] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [organisation, setOrganisation] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	async function handleInvite() {
		setError(null);
		setSuccess(null);

		if (!email) {
			setError('Email is required');
			return;
		}

		setLoading(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session?.access_token)
				throw new Error('Session expired, please log in again');

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-organiser`,
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${session.access_token}`,
						apikey: process.env
							.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						email,
						display_name: displayName || null,
						organisation: organisation || null,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Failed to send invite');

			setSuccess(`Invite sent to ${email}`);
			setEmail('');
			setDisplayName('');
			setOrganisation('');
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Something went wrong',
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={{ maxWidth: 600 }}>
			<h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
				Invite Organiser
			</h2>

			{error && (
				<div
					style={{
						background: '#7f1d1d33',
						border: '1px solid #7f1d1d',
						color: '#fca5a5',
						padding: 10,
						borderRadius: 8,
						marginBottom: 16,
						fontSize: 13,
					}}
				>
					{error}
				</div>
			)}
			{success && (
				<div
					style={{
						background: '#16653433',
						border: '1px solid #166534',
						color: '#86efac',
						padding: 10,
						borderRadius: 8,
						marginBottom: 16,
						fontSize: 13,
					}}
				>
					{success}
				</div>
			)}

			<div
				style={{
					background: '#111',
					borderRadius: 10,
					padding: 20,
					marginBottom: 32,
				}}
			>
				<Field label="Email">
					<input
						type="email"
						placeholder="organiser@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						style={inputStyle}
					/>
				</Field>
				<Field label="Display Name (optional)">
					<input
						placeholder="e.g. Gbolahan Adekunle"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						style={inputStyle}
					/>
				</Field>
				<Field label="Organisation (optional)">
					<input
						placeholder="e.g. UI eSports Club"
						value={organisation}
						onChange={(e) => setOrganisation(e.target.value)}
						style={inputStyle}
					/>
				</Field>
				<button
					disabled={loading}
					onClick={handleInvite}
					style={{
						background: '#16a34a',
						color: '#fff',
						border: 'none',
						borderRadius: 8,
						padding: '10px 20px',
						fontSize: 13,
						fontWeight: 600,
						cursor: 'pointer',
						marginTop: 8,
					}}
				>
					{loading ? 'Sending...' : 'Send Invite'}
				</button>
			</div>

			<h3
				style={{
					fontSize: 14,
					fontWeight: 700,
					marginBottom: 12,
					color: '#aaa',
					textTransform: 'uppercase',
				}}
			>
				Current Organisers
			</h3>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{existingOrganisers.length === 0 && (
					<p style={{ color: '#666', fontSize: 13 }}>
						No organisers invited yet.
					</p>
				)}
				{existingOrganisers.map((org) => (
					<div
						key={org.user_id}
						style={{
							background: '#111',
							borderRadius: 8,
							padding: 12,
							display: 'flex',
							justifyContent: 'space-between',
							fontSize: 13,
						}}
					>
						<span>
							{org.profiles?.display_name ??
								org.profiles?.username ??
								'Unknown'}
						</span>
						<span style={{ color: '#666' }}>
							{new Date(org.granted_at).toLocaleDateString()}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div style={{ marginBottom: 14 }}>
			<label
				style={{
					display: 'block',
					fontSize: 13,
					fontWeight: 600,
					color: '#aaa',
					marginBottom: 6,
				}}
			>
				{label}
			</label>
			{children}
		</div>
	);
}

const inputStyle: React.CSSProperties = {
	width: '100%',
	background: '#1a1a1a',
	color: '#fff',
	border: '1px solid #333',
	borderRadius: 8,
	padding: '10px 12px',
	fontSize: 13,
};
