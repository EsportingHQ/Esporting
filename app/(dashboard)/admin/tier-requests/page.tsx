import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TierRequestsClient, { type TierRequestRow, type OrganiserTierRow } from './TierRequestsClient';

export default async function TierRequestsPage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/login');

	const [{ data: requests, error }, { data: organisers }] = await Promise.all([
		supabase.rpc('list_tier_requests'),
		supabase.rpc('list_organiser_tiers'),
	]);
	if (error) redirect('/dashboard-redirect');

	return (
		<TierRequestsClient
			requests={(requests ?? []) as TierRequestRow[]}
			organisers={(organisers ?? []) as OrganiserTierRow[]}
		/>
	);
}
