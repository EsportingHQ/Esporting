
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, PlusCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  updated_at: string;
  published_at: string | null;
  comp_instances: { name: string } | { name: string }[] | null;
};

function getCompetitionName(
  comp: { name: string } | { name: string }[] | null,
): string {
  if (!comp) return 'General';
  return Array.isArray(comp) ? (comp[0]?.name ?? 'General') : comp.name;
}

function statusStyles(status: string) {
  switch (status) {
    case 'published':
      return 'bg-state-win/10 text-state-win border border-state-win/30';
    case 'pending_review':
      return 'bg-accent-readout/10 text-accent-readout border border-accent-readout/30';
    case 'rejected':
      return 'bg-state-alert/10 text-state-alert border border-state-alert/30';
    case 'archived':
      return 'bg-bg-void text-text-muted border border-border-line';
    default:
      return 'bg-bg-void text-text-muted border border-border-line';
  }
}

export default async function OrganiserNewsPage() {
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
    (roleData as { roles: { name: string } }[] | null)?.map(
      (r) => r.roles?.name,
    ) ?? [];

  const canAccess =
    roles.includes('super_admin') || roles.includes('organiser');

  if (!canAccess) redirect('/dashboard-redirect');

  const { data: articles } = await supabase
    .from('news_articles')
    .select(`
      id,
      title,
      slug,
      status,
      updated_at,
      published_at,
      comp_instances(name)
    `)
    .eq('author_id', user.id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const rows = (articles ?? []) as unknown as ArticleRow[];

  return (
    <div className="space-y-6 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
            My News Articles
          </h2>
          <p className="text-xs text-text-muted font-data mt-1 uppercase">
            ORGANISER EDITORIAL WORKSPACE
          </p>
        </div>

        <Link
          href="/organiser/news/new"
          className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all inline-flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          New Article
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-surface border border-border-line rounded p-4">
          <p className="text-[10px] font-display uppercase text-text-muted">
            Total Articles
          </p>
          <p className="text-2xl font-data font-black text-text-primary">
            {rows.length}
          </p>
        </div>

        <div className="bg-bg-surface border border-border-line rounded p-4">
          <p className="text-[10px] font-display uppercase text-text-muted">
            Pending Review
          </p>
          <p className="text-2xl font-data font-black text-text-primary">
            {rows.filter((a) => a.status === 'pending_review').length}
          </p>
        </div>

        <div className="bg-bg-surface border border-border-line rounded p-4">
          <p className="text-[10px] font-display uppercase text-text-muted">
            Published
          </p>
          <p className="text-2xl font-data font-black text-text-primary">
            {rows.filter((a) => a.status === 'published').length}
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((article) => (
            <div
              key={article.id}
              className="bg-bg-surface border border-border-line rounded p-5 flex items-start justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-readout shrink-0" />
                  <h3 className="font-display font-black text-base text-text-primary uppercase tracking-wide truncate">
                    {article.title}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-data text-text-muted">
                  <span>{getCompetitionName(article.comp_instances)}</span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${statusStyles(article.status)}`}
                  >
                    {article.status.replace('_', ' ')}
                  </span>

                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(article.updated_at).toLocaleDateString()}
                  </span>

                  {article.published_at && (
                    <span className="flex items-center gap-1 text-state-win">
                      <CheckCircle2 className="w-3 h-3" />
                      Published
                    </span>
                  )}

                  {article.status === 'rejected' && (
                    <span className="flex items-center gap-1 text-state-alert">
                      <AlertCircle className="w-3 h-3" />
                      Needs revision
                    </span>
                  )}
                </div>
              </div>

              <Link
                href={`/organiser/news/${article.id}`}
                className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all whitespace-nowrap"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-line rounded p-12 text-center max-w-xl mx-auto space-y-4">
          <FileText className="w-10 h-10 mx-auto text-text-muted/40" />
          <div className="space-y-1">
            <p className="font-display font-bold text-base text-text-primary uppercase tracking-wide">
              No articles yet
            </p>
            <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
              Create match recaps, tournament announcements, and editorial updates for your competitions.
            </p>
          </div>

          <Link
            href="/organiser/news/new"
            className="inline-flex items-center gap-2 bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create first article
          </Link>
        </div>
      )}
    </div>
  );
}
