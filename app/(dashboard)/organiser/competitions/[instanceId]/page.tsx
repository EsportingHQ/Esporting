import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import CompetitionDetailClient, {
	Registration,
} from './CompetitionDetailClient';

type PageProps = {
	params: Promise<{ instanceId: string }>;
};

export default async function OrganiserCompetitionDetailPage({
	params,
}: PageProps) {
	const { instanceId } = await params;
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

	const isAdmin = roles.includes('super_admin');
	const isOrganiser = roles.includes('organiser');
	if (!isAdmin && !isOrganiser) redirect('/dashboard-redirect');

	// Fetch the competition
	const { data: instance } = await supabase
		.from('comp_instances')
		.select(
			`
    id, name, slug, edition_label, format, status, prize_pool, description,
    organiser_id, comp_series(name)
  `,
		)
		.eq('id', instanceId)
		.is('deleted_at', null)
		.single();

	if (!instance) notFound();

	// Organisers can only manage their own competitions
	if (isOrganiser && !isAdmin && instance.organiser_id !== user.id) {
		redirect('/organiser');
	}

	// Fetch games covered
	const { data: gameTitlesRaw } = await supabase
		.from('comp_game_titles')
		.select('game_titles(id, name, slug, game_types(slug))')
		.eq('comp_instance_id', instanceId);

	const gameTitles = (gameTitlesRaw ?? []) as unknown as {
		game_titles: {
			id: string;
			name: string;
			slug: string;
			game_types: { slug: string } | null;
		} | null;
	}[];

	// Fetch stages
	const { data: stages } = await supabase
		.from('comp_stages')
		.select('id, name, stage_type, stage_order, best_of, game_title_id')
		.eq('comp_instance_id', instanceId)
		.order('stage_order');

	// Fetch registered teams
	const { data: registrations } = await supabase
		.from('comp_registrations')
		.select(
			'id, status, registered_at, teams(id, name, short_code, country)',
		)
		.eq('comp_instance_id', instanceId)
		.order('registered_at', { ascending: false });

	// Fetch all teams
	const { data: allTeams } = await supabase
		.from('teams')
		.select('id, name')
		.is('deleted_at', null)
		.order('name');

	// Fetch matches for this competition
	const { data: matches } = await supabase
		.from('matches')
		.select(
			`
      id, status, scheduled_at, match_format,
      game_titles(name),
      home_team:teams!matches_team_home_id_fkey(name),
      away_team:teams!matches_team_away_id_fkey(name)
    `,
		)
		.eq('comp_instance_id', instanceId)
		.order('scheduled_at', { ascending: true, nullsFirst: false });

	return (
		<CompetitionDetailClient
			instance={instance}
			gameTitles={gameTitles ?? []}
			stages={stages ?? []}
			registrations={(registrations ?? []) as unknown as Registration[]}
			allTeams={allTeams ?? []}
			matches={matches ?? []}
		/>
	);
}
