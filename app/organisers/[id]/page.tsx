import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PublicNav } from '@/components/layout/public-nav';
import { TierBadge } from '@/components/organiser/TierBadge';
import { shortGameName } from '@/lib/games';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  banner_url: string | null;
  region: string | null;
  prize_pool: string | null;
  starts_at: string | null;
  comp_game_titles: { game_titles: { name: string } | { name: string }[] | null }[] | null;
};

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = createClient(await cookies());
  const { data: profile } = await supabase
    .from('organiser_profiles')
    .select('org_name, tier')
    .eq('user_id', id)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await supabase
    .from('comp_instances')
    .select('id, name, slug, status, banner_url, region, prize_pool, starts_at, comp_game_titles(game_titles(name))')
    .eq('organiser_id', id)
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('starts_at', { ascending: false, nullsFirst: false });
  return { profile, comps: (data ?? []) as unknown as Row[] };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const found = await load((await params).id);
  const name = found?.profile.org_name || 'Organiser';
  return { title: `${name} · Tournaments`, description: `Tournaments run by ${name} on EsportingHQ.` };
}

function games(row: Row): string[] {
  const out = new Set<string>();
  for (const g of row.comp_game_titles ?? []) {
    const t = Array.isArray(g.game_titles) ? g.game_titles[0] : g.game_titles;
    if (t?.name) out.add(shortGameName(t.name));
  }
  return [...out];
}

function Card({ c }: { c: Row }) {
  return (
    <Link
      href={`/competitions/${c.slug}`}
      className="block bg-bg-surface border border-border-line rounded-lg p-4 hover:border-accent-readout/60 transition-colors"
    >
      <div className="flex items-start gap-3">
        {c.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.banner_url} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover bg-bg-void border border-border-line shrink-0" />
        ) : (
          <span className="w-12 h-12 rounded-lg bg-bg-void border border-border-line flex items-center justify-center font-display font-black text-text-muted shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-base text-text-primary truncate">{c.name}</h3>
          <p className="text-[11px] text-text-muted truncate">
            {[c.region, c.starts_at ? new Date(c.starts_at).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {games(c).map((g) => (
              <span key={g} className="px-2 py-0.5 bg-text-primary/[0.04] border border-text-primary/[0.08] text-[10px] font-display font-semibold text-text-muted tracking-wider uppercase rounded-full">
                {g}
              </span>
            ))}
          </div>
        </div>
        {c.status === 'registration' && (
          <span className="shrink-0 text-[10px] font-display font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-state-win/10 text-state-win border border-state-win/30">
            Registration open
          </span>
        )}
      </div>
      {c.prize_pool && <p className="mt-3 text-xs text-accent-glow font-data font-bold">Prize pool {c.prize_pool}</p>}
    </Link>
  );
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
        {title} ({rows.length})
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <Card key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}

export default async function OrganiserPage({ params }: { params: Promise<{ id: string }> }) {
  const found = await load((await params).id);
  if (!found) notFound();
  const { profile, comps } = found;

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />
      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        <header className="space-y-2">
          <p className="text-[10px] font-data text-accent-readout font-bold tracking-wider uppercase">Tournament organiser</p>
          <h1 className="font-display font-black text-3xl tracking-wide uppercase">{profile.org_name || 'Organiser'}</h1>
          <div className="flex items-center gap-2">
            <TierBadge tier={profile.tier} />
            <span className="text-xs text-text-muted">{comps.length} tournament{comps.length === 1 ? '' : 's'} on EsportingHQ</span>
          </div>
        </header>

        <Section title="Open for registration" rows={comps.filter((c) => c.status === 'registration')} />
        <Section title="Live now" rows={comps.filter((c) => c.status === 'ongoing')} />
        <Section title="Completed" rows={comps.filter((c) => c.status === 'completed')} />
        {comps.length === 0 && <p className="text-sm text-text-muted">No public tournaments yet.</p>}
      </main>
    </div>
  );
}
