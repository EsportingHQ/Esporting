import { Metadata } from 'next';
import { TeamDetailClient } from './TeamDetailClient';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const { createClient } = await import('@/lib/supabase/server');
	const { cookies } = await import('next/headers');
	const supabase = await createClient(await cookies());
	const { data: team } = await supabase
		.from('teams')
		.select('name, description')
		.eq('slug', slug)
		.single();

	if (!team) return { title: 'Team Not Found' };

	return {
		title: `${team.name} Esports Team`,
		description:
			team.description ||
			`View matches, roster, and live results for ${team.name} on Esporting.`,
		alternates: {
			canonical: `/teams/${slug}`,
		},
		openGraph: {
			title: `${team.name} | Esporting`,
			description:
				team.description ||
				`View matches, roster, and live results for ${team.name}.`,
			url: `https://esportinghq.com/teams/${slug}`,
		},
	};
}

export default async function TeamDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	return <TeamDetailClient slug={slug} />;
}
