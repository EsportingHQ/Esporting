import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import InviteContributorClient from './InviteContributorClient';
import InviteRequests, { type InviteRequest } from './InviteRequests';

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

	const { data: reqRaw } = await supabase
		.from('contributor_invite_requests')
		.select('id, email, display_name, status, review_note, created_at, comp_instances(name), profiles!contributor_invite_requests_requested_by_fkey(display_name, username)')
		.order('created_at', { ascending: false })
		.limit(50);
	const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
	const requests: InviteRequest[] = ((reqRaw ?? []) as unknown as {
		id: string; email: string; display_name: string | null; status: InviteRequest['status'];
		review_note: string | null; created_at: string;
		comp_instances: { name: string } | { name: string }[] | null;
		profiles: { display_name: string | null; username: string } | { display_name: string | null; username: string }[] | null;
	}[]).map((r) => ({
		id: r.id, email: r.email, display_name: r.display_name, status: r.status,
		review_note: r.review_note, created_at: r.created_at,
		competition: one(r.comp_instances)?.name ?? 'Tournament',
		requested_by_name: one(r.profiles)?.display_name ?? one(r.profiles)?.username ?? 'Organiser',
	}));

	return (
		<>
			<InviteContributorClient
				isAdmin={isAdmin}
				competitions={competitions}
				existingContributors={existingContributors}
			/>
			<InviteRequests requests={requests} isAdmin={isAdmin} />
		</>
	);
}
