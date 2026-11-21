import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardRedirectPage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect('/login');
	}

	const { data: roleData } = await supabase
		.from('user_role_assignments')
		.select('roles(name)')
		.eq('user_id', user.id)
		.is('revoked_at', null);

	const roles =
		(roleData as { roles: { name: string } }[] | null)?.map(
			(r) => r.roles?.name,
		) ?? [];

	if (roles.includes('super_admin')) {
		redirect('/admin');
	}

	if (roles.includes('organiser')) {
		redirect('/organiser');
	}

	if (roles.includes('contributor')) {
		redirect('/contributor');
	}

	// Signed in with no role yet: send people who said they run tournaments
	// straight to the organiser application, everyone else to their account page.
	if (user.user_metadata?.wants_organiser === true) {
		redirect('/apply-organiser');
	}
	redirect('/account');
}
