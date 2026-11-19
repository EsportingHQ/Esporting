import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminCompetitionsClient, { type CompRow } from './AdminCompetitionsClient';

export default async function AdminCompetitionsPage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/login');

	const { data: roleData } = await supabase
		.from('user_role_assignments')
		.select('roles(name)')
		.eq('user_id', user.id)
		.is('revoked_at', null);
	const roles =
		(roleData as { roles: { name: string } }[] | null)?.map((r) => r.roles?.name) ?? [];
	if (!roles.includes('super_admin')) redirect('/dashboard-redirect');

	// Every competition, whoever created it
	const { data } = await supabase
		.from('comp_instances')
		.select(
			`id, name, slug, status, format, starts_at, organiser_id,
			 organiser:profiles!comp_instances_organiser_id_fkey(display_name, username),
			 comp_registrations(id),
			 matches(status)`,
		)
		.is('deleted_at', null)
		.order('created_at', { ascending: false });

	return <AdminCompetitionsClient competitions={(data ?? []) as unknown as CompRow[]} />;
}
