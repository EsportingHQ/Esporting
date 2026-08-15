import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getUpcomingMatches(date?: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const start = date
    ? new Date(`${date}T00:00:00Z`)
    : new Date();

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const { data, error } = await supabase
    .from('matches')
    .select(`
        id,
        scheduled_at,
        status,
        home_maps_won,
        away_maps_won,
        competition:comp_instances(name, slug),
        game_title:game_titles(name, slug),
        team_home:teams!matches_team_home_id_fkey(name, slug, short_code),
        team_away:teams!matches_team_away_id_fkey(name, slug, short_code)
    `)
    .is('deleted_at', null)
    .gte('scheduled_at', start.toISOString())
    .lt('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) throw error;

  return data ?? [];
}