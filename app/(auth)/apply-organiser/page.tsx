import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ApplyForm from './ApplyForm';

export default async function ApplyOrganiserPage() {
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
  if (roles.includes('organiser') || roles.includes('super_admin')) {
    redirect('/dashboard-redirect');
  }

  const { data: apps } = await supabase
    .from('organiser_applications')
    .select('id, status, org_name, games, experience, links, review_note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const latest = apps?.[0] ?? null;
  const pending = latest?.status === 'pending';

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void py-10">
      <div className="w-full max-w-lg px-4 space-y-6">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
            Apply as Tournament Organiser
          </h1>
          <p className="text-xs text-text-muted font-body mt-2 leading-relaxed">
            Esporting checks every organiser before they can create and run
            competitions. Tell us who you are. Most applications are reviewed
            within a few days.
          </p>
        </div>

        {pending && (
          <div className="bg-bg-surface border border-state-alert/30 rounded p-4 text-xs text-text-primary font-body">
            Your application for <strong>{latest.org_name}</strong> is waiting for
            review. You can update it below until it is reviewed.
          </div>
        )}
        {latest?.status === 'rejected' && (
          <div className="bg-bg-surface border border-state-loss/30 rounded p-4 text-xs text-text-primary font-body">
            Your last application was not approved.
            {latest.review_note ? ` Note from Esporting: ${latest.review_note}` : ''} You
            can apply again below.
          </div>
        )}

        <ApplyForm
          initial={
            pending
              ? {
                  org_name: latest.org_name,
                  games: latest.games ?? [],
                  experience: latest.experience ?? '',
                  links: latest.links ?? '',
                }
              : null
          }
        />

        <p className="text-center text-xs text-text-muted/60">
          <Link href="/" className="text-accent-readout">Back to Esporting</Link>
        </p>
      </div>
    </div>
  );
}
