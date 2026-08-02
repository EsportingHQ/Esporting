import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InviteOrganiserClient from './InviteOrganiserClient';

export default async function AdminInvitesPage() {
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
    .is('revoked_at', null)
    .is('comp_instance_id', null);

  const roles =
    (roleData as { roles: { name: string } }[] | null)?.map(
      (r) => r.roles?.name,
    ) ?? [];

  if (!roles.includes('super_admin')) redirect('/dashboard-redirect');

  // Get the organiser role ID first
  const { data: organiserRole } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'organiser')
    .single();

  // Fetch all users with organiser role
  const { data: organiserAssignments } = await supabase
    .from('user_role_assignments')
    .select(
      'user_id, granted_at, profiles!user_role_assignments_user_id_fkey(username, display_name)',
    )
    .eq('role_id', organiserRole?.id ?? 0)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });

  return (
    <InviteOrganiserClient
      existingOrganisers={
        (organiserAssignments ?? []) as unknown as {
          user_id: string;
          granted_at: string;
          profiles: {
            username: string;
            display_name: string | null;
          } | null;
        }[]
      }
    />
  );
}
