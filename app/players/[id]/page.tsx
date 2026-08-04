'use client';

import { use } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { MatchCard } from '@/components/broadcast/match-card';
import { Shield, Award, Play, Flame } from 'lucide-react';
import { usePlayerDetail } from '@/hooks/usePlayerDetail';

export default function PlayerDetailPage({
	params: paramsPromise,
}: {
	params: Promise<{ id: string }>;
}) {
	const params = use(paramsPromise);
	const id = params.id;

	const { player, recentMatches, isLoading, notFound, error } =
		usePlayerDetail(id);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">Loading player...</p>
				</main>
			</div>
		);
	}

	if (notFound || !player) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12 space-y-4">
					<h1 className="font-display text-2xl font-black uppercase">
						Player not found
					</h1>
					<Link
						href="/teams"
						className="text-accent-readout underline"
					>
						Back to teams
					</Link>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12 space-y-2">
					<h1 className="font-display text-2xl font-black uppercase">
						Unable to load player
					</h1>
					<p className="text-sm text-text-muted">{error.message}</p>
				</main>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary">
			<PublicNav />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Profile Card / Info */}
				<section className="lg:col-span-2 space-y-8">
					<div className="bg-bg-surface border border-border-line rounded p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
						<div className="w-20 h-20 rounded bg-bg-void border border-border-line flex items-center justify-center font-display font-black text-3xl text-accent-readout shrink-0 shadow-inner">
							{player.displayName.substring(0, 2).toUpperCase()}
						</div>

						<div className="space-y-3 text-center sm:text-left">
							<div>
								<h1 className="font-display font-black text-2xl tracking-wider uppercase leading-tight">
									{player.displayName}
								</h1>
								<span className="text-xs font-data text-accent-readout">
									@{player.username}
								</span>
							</div>

							<p className="text-xs text-text-muted max-w-lg leading-relaxed font-body">
								{player.bio}
							</p>

							<div className="pt-2">
								<span className="text-[10px] text-text-muted font-display font-bold uppercase block mb-1">
									CURRENT SQUAD
								</span>
								{player.teamSlug ? (
									<Link
										href={`/teams/${player.teamSlug}`}
										className="inline-flex items-center gap-2 bg-bg-void hover:bg-bg-void/50 border border-border-line px-3 py-1.5 rounded transition-colors text-xs font-body"
									>
										<Shield className="w-4 h-4 text-text-muted" />
										<span className="font-medium text-text-primary uppercase">
											{player.teamName ?? 'Unassigned'}
										</span>
									</Link>
								) : (
									<div className="inline-flex items-center gap-2 bg-bg-void border border-border-line px-3 py-1.5 rounded text-xs font-body text-text-muted">
										<Shield className="w-4 h-4" />
										<span>Unassigned</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Stats matrix */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						{player.stats.map((stat) => (
							<div
								key={stat.label}
								className="bg-bg-surface border border-border-line p-4 rounded text-center"
							>
								<span className="block text-[9px] text-text-muted font-display font-bold uppercase tracking-wider mb-1">
									{stat.label}
								</span>
								<span className="font-data font-bold text-xl text-text-primary">
									{stat.value}
								</span>
							</div>
						))}
					</div>

					{/* Recent matches history */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Award className="w-4 h-4 text-accent-readout" />
							<h3 className="font-display font-bold text-base uppercase tracking-wider">
								RECENT MATCH ASSIGNMENTS
							</h3>
						</div>

						<div className="space-y-4">
							{recentMatches.map((match) => (
								<MatchCard key={match.id} {...match} />
							))}
						</div>
					</div>
				</section>

				{/* Sidebar right: Game assignments */}
				<section className="space-y-6">
					<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Flame className="w-4 h-4 text-accent-signal" />
							<h3 className="font-display font-bold text-sm tracking-wider uppercase">
								GAME DISCIPLINE
							</h3>
						</div>

						<div className="space-y-3 font-body">
							<div className="p-3 bg-bg-void border border-border-line rounded flex items-center justify-between text-xs">
								<div>
									<span className="block font-display font-bold text-text-primary">
										FC 26
									</span>
									<span className="text-[10px] text-text-muted">
										Competitive Head-to-Head
									</span>
								</div>
								<Play className="w-4 h-4 text-accent-readout shrink-0 ml-2" />
							</div>
							<div className="p-3 bg-bg-void border border-border-line rounded flex items-center justify-between text-xs">
								<div>
									<span className="block font-display font-bold text-text-primary">
										FC Mobile
									</span>
									<span className="text-[10px] text-text-muted">
										Touch-screen Competitive
									</span>
								</div>
								<Play className="w-4 h-4 text-accent-readout shrink-0 ml-2" />
							</div>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
