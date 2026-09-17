'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { BroadcastTicker } from '@/components/broadcast/broadcast-ticker';
import { MatchCard } from '@/components/broadcast/match-card';
import { MatchCardSkeleton } from '@/components/broadcast/MatchCardSkeleton';
import { LeagueSection } from '@/components/broadcast/LeagueSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreToast } from '@/components/ui/ScoreToast';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import { useFavorites } from '@/hooks/useFavorites';
import { useNewsArticles } from '@/hooks/useNewsArticles';
import { Calendar, Newspaper, ArrowRight, Star, Flame, Zap } from 'lucide-react';

type StatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

export default function HomeClient() {
	const {
		tickerMatches,
		groups,
		liveCount,
		isLoading,
		toasts,
		dismissToast,
	} = useLiveFeed();
	const { favorites } = useFavorites();
	const { articles: newsItems } = useNewsArticles();

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
	const [gameFilter, setGameFilter] = useState<string>('all');

	// Filter groups and matches
	const filteredGroups = groups
		.map((group) => {
			const matches = group.matches.filter((match) => {
				if (statusFilter === 'live' && match.status !== 'live')
					return false;
				if (
					statusFilter === 'upcoming' &&
					match.status !== 'scheduled' &&
					match.status !== 'delayed'
				)
					return false;
				if (
					statusFilter === 'finished' &&
					match.status !== 'completed' &&
					match.status !== 'cancelled' &&
					match.status !== 'walkover'
				)
					return false;

				if (gameFilter === 'football' && match.gameType !== 'football')
					return false;
				if (gameFilter === 'shooter' && match.gameType !== 'shooter')
					return false;
				if (gameFilter === 'br' && match.gameType !== 'br')
					return false;

				return true;
			});

			const liveCountInGroup = matches.filter(
				(m) => m.status === 'live',
			).length;

			return {
				...group,
				matches,
				liveCount: liveCountInGroup,
			};
		})
		.filter((group) => group.matches.length > 0);

	// Pin starred competitions to top
	const starredCompIds = favorites
		.filter((f) => f.type === 'competition')
		.map((f) => f.id);
	const sortedGroups = [...filteredGroups].sort((a, b) => {
		const aStarred = starredCompIds.includes(a.id);
		const bStarred = starredCompIds.includes(b.id);
		if (aStarred && !bStarred) return -1;
		if (!aStarred && bStarred) return 1;
		return b.liveCount - a.liveCount;
	});

	const statusTabs: { id: StatusFilter; label: string; count?: number }[] = [
		{ id: 'all', label: 'All Matches' },
		{ id: 'live', label: 'Live Now', count: liveCount },
		{ id: 'upcoming', label: 'Upcoming' },
		{ id: 'finished', label: 'Finished' },
	];

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
			{/* Ambient background glow */}
			<div className="gradient-mesh pointer-events-none" aria-hidden="true">
				<div className="mesh-orb" />
			</div>

			<PublicNav />
			<BroadcastTicker matches={tickerMatches} />

			{/* Live Toasts Overlay */}
			<ScoreToast toasts={toasts} onDismiss={dismissToast} />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
				{/* Main Feed Column (2 cols wide on desktop) */}
				<section className="lg:col-span-2 space-y-6">
					{/* Header & Status Filter Bar */}
					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
							<div className="flex items-center gap-3">
								<div className="w-9 h-9 rounded-xl bg-accent-primary/15 border border-accent-primary/25 flex items-center justify-center text-accent-glow">
									<Calendar className="w-5 h-5" />
								</div>
								<div>
									<h1 className="font-display font-black text-2xl text-white tracking-tight">
										Live Matches & Schedule
									</h1>
									<p className="text-xs text-text-muted">Real-time head-to-head esports tracking</p>
								</div>
							</div>

							<div className="flex items-center gap-2">
								<span className="text-xs font-display font-semibold text-white flex items-center gap-2 glass px-3.5 py-1.5 rounded-full border border-white/[0.1] shadow-sm">
									<span className="relative flex h-2 w-2">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-live opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-accent-live" />
									</span>
									<span className="font-bold text-accent-live">
										{liveCount} LIVE NOW
									</span>
								</span>
							</div>
						</div>

						{/* Filter Controls Row */}
						<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-strong border border-white/[0.08] p-3 rounded-2xl shadow-lg backdrop-blur-xl">
							{/* Status Filter Tabs */}
							<div className="w-full md:w-auto flex overflow-x-auto scrollbar-none bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] text-xs font-display font-semibold">
								{statusTabs.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setStatusFilter(tab.id)}
										className={`min-h-[38px] px-4 rounded-lg transition-all shrink-0 flex items-center justify-center gap-1.5 ${
											statusFilter === tab.id
												? 'bg-accent-primary text-white font-bold shadow-[0_0_15px_rgba(217,70,239,0.3)]'
												: 'text-text-muted hover:text-white hover:bg-white/[0.04]'
										}`}
									>
										<span>{tab.label}</span>
										{tab.count !== undefined && tab.count > 0 && (
											<span className={`px-1.5 py-0.5 text-[10px] font-data rounded-full ${
												statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-accent-live/20 text-accent-live font-bold'
											}`}>
												{tab.count}
											</span>
										)}
									</button>
								))}
							</div>

							{/* Game Category Pills */}
							<div className="w-full md:w-auto flex items-center gap-2 overflow-x-auto scrollbar-none text-xs font-display font-semibold">
								{[
									{ id: 'all', label: 'All Games' },
									{ id: 'football', label: 'Football' },
									{ id: 'shooter', label: 'Shooters' },
									{ id: 'br', label: 'Battle Royale' },
								].map((cat) => (
									<button
										key={cat.id}
										onClick={() => setGameFilter(cat.id)}
										className={`min-h-[36px] px-3.5 rounded-xl border transition-all shrink-0 flex items-center justify-center ${
											gameFilter === cat.id
												? 'bg-accent-primary/20 text-white border-accent-primary/40 shadow-[0_0_12px_rgba(217,70,239,0.15)] font-bold'
												: 'bg-white/[0.02] border-white/[0.06] text-text-muted hover:text-white hover:bg-white/[0.05]'
										}`}
									>
										{cat.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Matches List (Grouped by League) */}
					{isLoading ? (
						<div className="space-y-4">
							<MatchCardSkeleton count={3} />
						</div>
					) : sortedGroups.length > 0 ? (
						<div className="space-y-6">
							{sortedGroups.map((group) => (
								<LeagueSection
									key={group.id}
									competitionId={group.id}
									competitionName={group.name}
									competitionSlug={group.slug}
									gameTitle={group.gameTitle}
									liveCount={group.liveCount}
									totalCount={group.matches.length}
								>
									{group.matches.map((match) => (
										<MatchCard
											key={match.id}
											{...match}
											href={`/competitions/${group.slug}/matches/${match.id}`}
										/>
									))}
								</LeagueSection>
							))}
						</div>
					) : (
						<EmptyState
							icon={Calendar}
							title="No matches found"
							description="No live, upcoming, or finished matches match your selected filters."
							actionLabel="Reset filters"
							onAction={() => {
								setStatusFilter('all');
								setGameFilter('all');
							}}
						/>
					)}
				</section>

				{/* Right Sidebar Column - Hidden on Mobile */}
				<section className="hidden lg:block space-y-6">
					{/* Favorites Quick List */}
					{favorites.length > 0 && (
						<div className="glass rounded-3xl border border-white/[0.08] p-5 space-y-4 shadow-xl">
							<div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
								<Star className="w-4 h-4 text-accent-favorite fill-accent-favorite" />
								<h3 className="font-display font-bold text-sm tracking-wide text-white">
									Starred Favorites
								</h3>
							</div>

							<div className="space-y-2 text-xs font-body">
								{favorites.map((fav) => (
									<div
										key={`${fav.type}-${fav.id}`}
										className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl flex items-center justify-between hover:border-accent-primary/30 transition-colors"
									>
										<span className="font-semibold text-white truncate">
											{fav.name}
										</span>
										<span className="text-[10px] font-data text-text-muted uppercase bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/[0.05]">
											{fav.type}
										</span>
									</div>
								))}
							</div>

							<Link
								href="/favorites"
								className="block text-center text-xs font-display font-semibold text-accent-glow hover:underline pt-1"
							>
								View all favorites →
							</Link>
						</div>
					)}

					{/* Broadcast Bulletin */}
					<div className="glass rounded-3xl border border-white/[0.08] p-6 space-y-5 shadow-xl">
						<div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-3">
							<div className="p-1.5 rounded-lg bg-accent-primary/10 text-accent-glow">
								<Newspaper className="w-4 h-4" />
							</div>
							<h3 className="font-display font-bold text-base text-white">
								Community Bulletin
							</h3>
						</div>

						<div className="divide-y divide-white/[0.06]">
							{newsItems.map((item) => (
								<article
									key={item.id}
									className="py-3.5 first:pt-0 last:pb-0 space-y-2"
								>
									<div className="flex items-center justify-between text-[10px] font-data">
										<span className="text-accent-glow font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20">
											{item.tag}
										</span>
										<span className="text-text-muted">
											{item.published_at
												? new Date(
														item.published_at,
													).toLocaleDateString()
												: 'Draft'}
										</span>
									</div>
									<Link
										href={`/news/${item.slug}`}
										className="block group"
									>
										<h4 className="font-display font-bold text-sm text-white group-hover:text-accent-glow transition-colors leading-snug">
											{item.title}
										</h4>
									</Link>
									<p className="text-xs text-text-muted line-clamp-2 leading-relaxed font-body">
										{item.excerpt ??
											'No summary available.'}
									</p>
								</article>
							))}
						</div>

						<Link
							href="/news"
							className="flex items-center justify-center gap-2 w-full py-2.5 btn-glass text-xs font-display font-bold tracking-wider text-white rounded-xl"
						>
							<span>VIEW ALL BULLETIN POSTS</span>
							<ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
				</section>
			</main>

			{/* Modern Glass Footer */}
			<footer className="glass-strong border-t border-white/[0.08] py-8 relative z-20 select-none text-xs text-text-muted mt-auto">
				<div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-2 font-display font-bold text-white text-sm">
						<Zap className="w-4 h-4 text-accent-primary" />
						<span>ESPORTINGHQ</span>
						<span className="text-xs text-text-muted font-normal">© {new Date().getFullYear()}</span>
					</div>
					<div className="flex items-center gap-2 font-display text-xs">
						<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-state-win/10 border border-state-win/20 text-state-win font-semibold">
							<span className="w-1.5 h-1.5 rounded-full bg-state-win animate-pulse" />
							Telemetry Feed Nominal
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
