'use client';

import { use } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { MatchCard } from '@/components/broadcast/match-card';
import { Shield, Users, Award, Trophy } from 'lucide-react';
import { useTeamDetail } from '@/hooks/useTeamDetail';

export default function TeamDetailPage({
	params: paramsPromise,
}: {
	params: Promise<{ slug: string }>;
}) {
	const params = use(paramsPromise);
	const slug = params.slug;

	const {
		team,
		roster,
		activeComps,
		lastResults,
		isLoading,
		notFound,
		error,
	} = useTeamDetail(slug);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">Loading team...</p>
				</main>
			</div>
		);
	}

	if (notFound || !team) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12 space-y-4">
					<h1 className="font-display text-2xl font-black uppercase">
						Team not found
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
						Unable to load team
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
				{/* Profile Card / Header (Left side / Span 2 columns) */}
				<section className="lg:col-span-2 space-y-8">
					<div className="bg-bg-surface border border-border-line rounded p-6 flex items-start gap-6">
						<div className="w-16 h-16 bg-bg-void border border-border-line rounded flex items-center justify-center font-display font-black text-2xl text-text-muted shrink-0 shadow-inner">
							{team.shortCode ||
								team.name.slice(0, 3).toUpperCase()}
						</div>
						<div className="space-y-2">
							<h1 className="font-display font-black text-3xl tracking-wider uppercase leading-tight">
								{team.name}
							</h1>
							<div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted pt-1">
								<span className="flex items-center gap-1">
									<Shield className="w-3.5 h-3.5" />
									<span>REGIONAL CLUB</span>
								</span>
								<span className="flex items-center gap-1">
									<Users className="w-3.5 h-3.5" />
									<span>{roster.length} ACTIVE PLAYERS</span>
								</span>
							</div>
						</div>
					</div>

					{/* Roster list */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Users className="w-4 h-4 text-accent-readout" />
							<h3 className="font-display font-bold text-base uppercase tracking-wider">
								TEAM ROSTER & ASSIGNMENTS
							</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{roster.map((player) => (
								<Link
									key={player.id}
									href={`/players/${player.id}`}
								>
									<div className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-4 flex items-center justify-between transition-all">
										<div>
											<span className="block font-display font-black text-base text-text-primary uppercase">
												{player.name}
											</span>
											<span className="text-[10px] text-text-muted font-data uppercase">
												{player.role}
											</span>
										</div>
										<span className="px-2 py-0.5 bg-bg-void border border-border-line text-[9px] font-display font-bold text-accent-readout tracking-wider uppercase rounded-sm">
											{player.game}
										</span>
									</div>
								</Link>
							))}
						</div>
					</div>

					{/* Recent results list */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Award className="w-4 h-4 text-state-win" />
							<h3 className="font-display font-bold text-base uppercase tracking-wider">
								HISTORICAL PERFORMANCE
							</h3>
						</div>

						<div className="space-y-4">
							{lastResults.map((match) => (
								<MatchCard key={match.id} {...match} />
							))}
						</div>
					</div>
				</section>

				{/* Sidebar right: Active competitions */}
				<section className="space-y-6">
					<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Trophy className="w-4 h-4 text-accent-signal" />
							<h3 className="font-display font-bold text-sm tracking-wider uppercase">
								ACTIVE CAMPAIGNS
							</h3>
						</div>

						<div className="space-y-2">
							{activeComps.map((comp) => (
								<Link
									key={comp.slug}
									href={`/competitions/${comp.slug}`}
								>
									<div className="p-3 bg-bg-void hover:bg-bg-void/50 border border-border-line rounded flex items-center justify-between text-xs transition-colors">
										<div>
											<span className="block font-display font-bold text-text-primary uppercase">
												{comp.name}
											</span>
											<span className="text-[9px] font-data text-accent-signal uppercase tracking-wider flex items-center gap-1 mt-0.5">
												<span className="w-1 h-1 rounded-full bg-accent-signal animate-pulse"></span>
												<span>{comp.status}</span>
											</span>
										</div>
										<span className="text-text-muted hover:text-text-primary font-display font-semibold uppercase text-[10px] tracking-wider shrink-0 pl-4">
											VIEW HUB →
										</span>
									</div>
								</Link>
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
