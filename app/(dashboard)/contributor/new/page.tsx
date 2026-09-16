import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InviteContributorClient from './InviteContributorClient';

type RoleRow = {
	roles: { name: string } | { name: string }[] | null;
	comp_instance_id: string | null;
};

type CompetitionOption = {
	id: string;
	name: string;
};

type ContributorAssignment = {
	user_id: string;
	granted_at: string;
	comp_instance_id: string | null;
	profiles: {
		username: string;
		display_name: string | null;
	} | null;
};

function roleNames(row: RoleRow): string[] {
	if (!row.roles) return [];
	return Array.isArray(row.roles)
		? row.roles.map((role) => role.name)
		: [row.roles.name];
}

export default async function InviteContributorPage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) redirect('/login');

	const { data: roleData } = await supabase
		.from('user_role_assignments')
		.select('comp_instance_id, roles(name)')
		.eq('user_id', user.id)
		.is('revoked_at', null);

	const roleRows = (roleData ?? []) as unknown as RoleRow[];
	const roles = roleRows.flatMap(roleNames);
	const isAdmin = roles.includes('super_admin');
	const isOrganiser = roles.includes('organiser');

	if (!isAdmin && !isOrganiser) redirect('/dashboard-redirect');

	const { data: competitionsRaw } = isAdmin
		? await supabase
				.from('comp_instances')
				.select('id, name')
				.is('deleted_at', null)
				.order('created_at', { ascending: false })
		: await supabase
				.from('comp_instances')
				.select('id, name')
				.eq('organiser_id', user.id)
				.is('deleted_at', null)
				.order('created_at', { ascending: false });

	const competitions = (competitionsRaw ?? []) as CompetitionOption[];
	const organiserCompetitionIds = competitions.map((competition) => competition.id);

	const { data: contributorRole } = await supabase
		.from('roles')
		.select('id')
		.eq('name', 'contributor')
		.single();

	let contributorQuery = supabase
		.from('user_role_assignments')
		.select(
			'user_id, granted_at, comp_instance_id, profiles!user_role_assignments_user_id_fkey(username, display_name)',
		)
		.eq('role_id', contributorRole?.id ?? 0)
		.is('revoked_at', null)
		.order('granted_at', { ascending: false });

	if (!isAdmin) {
		if (organiserCompetitionIds.length === 0) {
			contributorQuery = contributorQuery.eq('comp_instance_id', '00000000-0000-0000-0000-000000000000');
		} else {
			contributorQuery = contributorQuery.in('comp_instance_id', organiserCompetitionIds);
		}
	}

	const { data: contributorAssignments } = await contributorQuery;
	const scopeNames = new Map(competitions.map((competition) => [competition.id, competition.name]));
	const existingContributors = (
		(contributorAssignments ?? []) as unknown as ContributorAssignment[]
	).map((contributor) => ({
		...contributor,
		scope_name: contributor.comp_instance_id
			? scopeNames.get(contributor.comp_instance_id) ?? 'Competition contributor'
			: 'Global contributor',
	}));

	return (
		<InviteContributorClient
			isAdmin={isAdmin}
			competitions={competitions}
			existingContributors={existingContributors}
		/>
	);
}
