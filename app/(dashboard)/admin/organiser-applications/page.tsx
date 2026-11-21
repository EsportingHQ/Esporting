import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ApplicationsClient, { type Application } from './ApplicationsClient';

export default async function OrganiserApplicationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase.rpc('list_organiser_applications');
  if (error) redirect('/dashboard-redirect');

  return <ApplicationsClient applications={(data ?? []) as Application[]} />;
}
