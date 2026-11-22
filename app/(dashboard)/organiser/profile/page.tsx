import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileClient, { type TierRequest } from './ProfileClient';

export default async function OrganiserProfilePage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/login');

	const [{ data: profile }, { data: op }, { data: requests }, { count: liveCount }] =
		await Promise.all([
			supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle(),
			supabase.from('organiser_profiles').select('tier, org_name').eq('user_id', user.id).maybeSingle(),
			supabase
				.from('tier_upgrade_requests')
				.select('id, requested_tier, status, review_note, created_at')
				.eq('user_id', user.id)
				.order('created_at', { ascending: false })
				.limit(5),
			supabase
				.from('comp_instances')
				.select('id', { count: 'exact', head: true })
				.eq('organiser_id', user.id)
				.is('deleted_at', null)
				.in('status', ['registration', 'ongoing']),
		]);

	return (
		<ProfileClient
			name={profile?.display_name ?? profile?.username ?? user.email ?? 'Organiser'}
			email={user.email ?? ''}
			tier={(op?.tier as 'trial' | 'community' | 'business' | undefined) ?? 'community'}
			orgName={op?.org_name ?? ''}
			liveCount={liveCount ?? 0}
			requests={(requests ?? []) as TierRequest[]}
		/>
	);
}
