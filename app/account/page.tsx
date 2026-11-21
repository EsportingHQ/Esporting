import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/lib/actions/auth';

export default async function AccountPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: apps } = await supabase
    .from('organiser_applications')
    .select('status, org_name, review_note')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const app = apps?.[0] ?? null;

  const name = (user.user_metadata?.display_name as string | undefined) ?? user.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-void py-10">
      <div className="w-full max-w-md px-4 space-y-6">
        <div>
          <h1 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
            Welcome, {name}
          </h1>
          <p className="text-xs text-text-muted font-body mt-1">{user.email}</p>
        </div>

        <div className="bg-bg-surface border border-border-line rounded p-5 space-y-3">
          <p className="font-display font-bold text-xs uppercase tracking-wider text-text-muted">
            Tournament Organiser
          </p>
          {app?.status === 'pending' && (
            <p className="text-xs text-text-primary leading-relaxed">
              Your application for <strong>{app.org_name}</strong> is waiting for Esporting to review it.
              You can update it any time before then.
            </p>
          )}
          {app?.status === 'rejected' && (
            <p className="text-xs text-text-primary leading-relaxed">
              Your last application was not approved.{app.review_note ? ` Note: ${app.review_note}` : ''}
            </p>
          )}
          {!app && (
            <p className="text-xs text-text-muted leading-relaxed">
              Run tournaments? Apply to become a Verified Tournament Organiser. Esporting reviews every
              application before you can create competitions.
            </p>
          )}
          <Link
            href="/apply-organiser"
            className="inline-block bg-accent-readout text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2 rounded"
          >
            {app?.status === 'pending' ? 'View or update application' : 'Apply as organiser'}
          </Link>
        </div>

        <div className="flex items-center justify-between text-xs">
          <Link href="/feed" className="text-accent-readout">Live scores</Link>
          <Link href="/competitions" className="text-accent-readout">Competitions</Link>
          <form action={logout}>
            <button type="submit" className="text-text-muted hover:text-text-primary">Sign out</button>
          </form>
        </div>
      </div>
    </div>
  );
}
