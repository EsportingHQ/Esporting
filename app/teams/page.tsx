import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import TeamsClient, { type TeamCard } from './TeamsClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams',
  description: 'Browse esports teams and find the ones that play your game.',
  alternates: { canonical: '/teams' },
};

type Row = {
  id: string;
  name: string;
  slug: string;
  short_code: string | null;
  logo_url: string | null;
  player_game_assignments: { is_active: boolean; game_titles: { name: string } | { name: string }[] | null }[] | null;
};

export default async function TeamsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await supabase
    .from('teams')
    .select('id, name, slug, short_code, logo_url, player_game_assignments(is_active, game_titles(name))')
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(1000);

  const teams: TeamCard[] = ((data ?? []) as unknown as Row[]).map((t) => {
    const games = new Set<string>();
    for (const a of t.player_game_assignments ?? []) {
      if (!a.is_active) continue;
      const g = Array.isArray(a.game_titles) ? a.game_titles[0] : a.game_titles;
      if (g?.name) games.add(g.name);
    }
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      shortCode: t.short_code,
      logoUrl: t.logo_url,
      games: [...games].sort((a, b) => a.localeCompare(b)),
    };
  });

  return <TeamsClient teams={teams} />;
}
