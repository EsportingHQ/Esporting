import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import CompetitionsClient, { type Competition } from './CompetitionsClient';

// Always read fresh: a tournament shows up as soon as its organiser opens registration.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Competitions & Tournaments',
  description:
    'Browse active and upcoming esports competitions, tournament brackets, and live standings across FIFA, Call of Duty, and top competitive games.',
  alternates: {
    canonical: '/competitions',
  },
  openGraph: {
    title: 'Competitions & Tournaments | Esporting',
    description:
      'Browse active and upcoming esports competitions, tournament brackets, and live standings.',
    url: 'https://esportinghq.com/competitions',
  },
};

type Row = {
  id: string;
  name: string;
  slug: string;
  format: Competition['format'];
  status: Competition['status'];
  prize_pool: string | null;
  starts_at: string | null;
  comp_game_titles: { game_titles: { name: string } | { name: string }[] | null }[] | null;
  comp_registrations: { id: string }[] | null;
  matches: { status: string }[] | null;
};

export default async function CompetitionsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Row-level security already hides draft competitions from the public, so this
  // returns exactly what organisers and admins have opened up.
  const { data } = await supabase
    .from('comp_instances')
    .select(
      `id, name, slug, format, status, prize_pool, starts_at,
       comp_game_titles(game_titles(name)),
       comp_registrations(id),
       matches(status)`,
    )
    .is('deleted_at', null)
    .neq('status', 'draft')
    .order('starts_at', { ascending: false, nullsFirst: false });

  const competitions: Competition[] = ((data ?? []) as unknown as Row[]).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    format: c.format,
    status: c.status,
    gameTitles: (c.comp_game_titles ?? []).flatMap((g) => {
      const t = g.game_titles;
      return t ? (Array.isArray(t) ? t : [t]).map((x) => x.name) : [];
    }),
    prizePool: c.prize_pool ?? '',
    startDate: c.starts_at
      ? new Date(c.starts_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Date to be announced',
    teamCount: c.comp_registrations?.length ?? 0,
    liveMatchesCount: (c.matches ?? []).filter((m) => m.status === 'live').length,
  }));

  return <CompetitionsClient competitions={competitions} />;
}
