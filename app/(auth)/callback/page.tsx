'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
	const router = useRouter();

	useEffect(() => {
		const supabase = createClient();

		supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_IN' && session) {
				const { data: roleData } = await supabase
					.from('user_role_assignments')
					.select('roles(name)')
					.eq('user_id', session.user.id)
					.is('revoked_at', null)
					.is('comp_instance_id', null);

				const roles =
					(roleData as { roles: { name: string } }[] | null)?.map(
						(r) => r.roles?.name,
					) ?? [];

				if (roles.includes('super_admin')) {
					router.push('/admin');
				} else if (roles.includes('organiser')) {
					router.push('/organiser');
				} else if (roles.includes('contributor')) {
					router.push('/contributor');
				} else {
					router.push('/');
				}
			}
		});
	}, [router]);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<p>Setting up your account...</p>
		</div>
	);
}
