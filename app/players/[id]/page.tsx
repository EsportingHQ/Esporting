import { Metadata } from 'next';
import { PlayerDetailClient } from './PlayerDetailClient';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await params;
	const { createClient } = await import('@/lib/supabase/server');
	const { cookies } = await import('next/headers');
	const supabase = await createClient(await cookies());
	const { data: player } = await supabase
		.from('players')
		.select('nickname, handle, bio')
		.eq('id', id)
		.single();

	if (!player) return { title: 'Player Not Found' };

	const name = player.nickname || player.handle || 'Player';

	return {
		title: `${name} - Pro Player Profile`,
		description:
			player.bio ||
			`View esports profile, match history, and stats for ${name} on Esporting.`,
		alternates: {
			canonical: `/players/${id}`,
		},
		openGraph: {
			title: `${name} | Esporting`,
			description:
				player.bio ||
				`View esports profile, match history, and stats for ${name}.`,
			url: `https://esportinghq.com/players/${id}`,
		},
	};
}

export default async function PlayerDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <PlayerDetailClient id={id} />;
}
