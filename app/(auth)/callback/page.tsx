'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
	const router = useRouter();
	const [needsPassword, setNeedsPassword] = useState(false);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [roles, setRoles] = useState<string[]>([]);

	const redirectByRole = useCallback(
		(userRoles: string[]) => {
			if (userRoles.includes('super_admin')) {
				router.push('/admin');
			} else if (userRoles.includes('organiser')) {
				router.push('/organiser');
			} else if (userRoles.includes('contributor')) {
				router.push('/contributor');
			} else {
				router.push('/');
			}
		},
		[router],
	);

	useEffect(() => {
		const supabase = createClient();

		async function handleCallback() {
			const hash = window.location.hash.substring(1); // remove leading '#'
			const params = new URLSearchParams(hash);

			const accessToken = params.get('access_token');
			const refreshToken = params.get('refresh_token');
			const isInvite = hash.includes('type=invite');

			if (!accessToken || !refreshToken) {
				// No token in URL — nothing to do, maybe already logged in
				return;
			}

			const { data, error: setSessionError } =
				await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});

			if (setSessionError || !data.session) {
				setError('This invite link is invalid or has expired.');
				return;
			}

			const { data: roleData } = await supabase
				.from('user_role_assignments')
				.select('roles(name)')
				.eq('user_id', data.session.user.id)
				.is('revoked_at', null);

			const userRoles =
				(roleData as { roles: { name: string } }[] | null)?.map(
					(r) => r.roles?.name,
				) ?? [];

			setRoles(userRoles as string[]);

			if (isInvite) {
				setNeedsPassword(true);
				return;
			}

			redirectByRole(userRoles as string[]);
		}

		handleCallback();
	}, [redirectByRole]);

	async function handleSetPassword() {
		setError(null);

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}
		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		setLoading(true);
		try {
			const supabase = createClient();
			const { error: updateError } = await supabase.auth.updateUser({
				password,
			});
			if (updateError) throw updateError;

			redirectByRole(roles);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to set password',
			);
		} finally {
			setLoading(false);
		}
	}

	if (needsPassword) {
		return (
			<div
				style={{
					minHeight: '100vh',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					background: '#0a0a0a',
				}}
			>
				<div style={{ width: '100%', maxWidth: 380 }}>
					<h1
						style={{
							fontSize: 22,
							fontWeight: 700,
							color: '#fff',
							marginBottom: 6,
						}}
					>
						Welcome to Esporting
					</h1>
					<p
						style={{
							fontSize: 13,
							color: '#888',
							marginBottom: 24,
						}}
					>
						Set a password to finish creating your account.
					</p>

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

					<div style={{ marginBottom: 12 }}>
						<label
							style={{
								display: 'block',
								fontSize: 13,
								color: '#aaa',
								marginBottom: 6,
							}}
						>
							Password
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							style={inputStyle}
							placeholder="At least 8 characters"
						/>
					</div>

					<div style={{ marginBottom: 20 }}>
						<label
							style={{
								display: 'block',
								fontSize: 13,
								color: '#aaa',
								marginBottom: 6,
							}}
						>
							Confirm Password
						</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							style={inputStyle}
						/>
					</div>

					<button
						disabled={loading}
						onClick={handleSetPassword}
						style={{
							width: '100%',
							background: '#16a34a',
							color: '#fff',
							border: 'none',
							borderRadius: 8,
							padding: '12px 0',
							fontSize: 14,
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						{loading ? 'Setting up...' : 'Set Password & Continue'}
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '100vh',
				background: '#0a0a0a',
				color: '#888',
			}}
		>
			<p>Setting up your account...</p>
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
