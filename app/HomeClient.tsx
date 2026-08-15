'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { BroadcastTicker } from '@/components/broadcast/broadcast-ticker';
import { MatchCard } from '@/components/broadcast/match-card';
import { MatchCardSkeleton } from '@/components/broadcast/MatchCardSkeleton';
import { LeagueSection } from '@/components/broadcast/LeagueSection';
import { StatusDot } from '@/components/broadcast/StatusDot';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreToast } from '@/components/ui/ScoreToast';
import { DateSwitcher } from '@/components/matches/DateSwitcher';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import { useFavorites } from '@/hooks/useFavorites';
import { useNewsArticles } from '@/hooks/useNewsArticles';
import { Calendar, Newspaper, ArrowRight, Star } from 'lucide-react';

type StatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

export default function HomeClient() {
	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

	const [gameFilter, setGameFilter] = useState<string>('all');

	const [selectedDate, setSelectedDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);

	const {
		tickerMatches,
		groups,
		liveCount,
		isLoading,
		toasts,
		dismissToast,
	} = useLiveFeed(selectedDate);

	const { favorites } = useFavorites();
	const { articles: newsItems } = useNewsArticles();

	// Filter groups and matches
	const filteredGroups = groups
		.map((group) => {
			// Filter matches within group
			const matches = group.matches.filter((match) => {
				// Status filter
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

				// Game category filter
				if (
					gameFilter !== 'all' &&
					group.gameTitle.toLowerCase() !== gameFilter
				) {
					return false;
				}

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

	const gameTabs = [
		{ id: 'all', label: 'ALL' },
		...Array.from(
			new Map(
				groups
					.flatMap((g) => g.matches)
					.map((m) => [
						m.gameTitle.toLowerCase(),
						m.gameTitle === 'Counter-Strike 2'
							? 'CS2'
							: m.gameTitle,
					]),
			).entries(),
		).map(([id, label]) => ({ id, label })),
	];
	const statusTabs: { id: StatusFilter; label: string }[] = [
		{ id: 'all', label: 'ALL' },
		{ id: 'live', label: `LIVE (${liveCount})` },
		{ id: 'upcoming', label: 'UPCOMING' },
		{ id: 'finished', label: 'FINISHED' },
	];

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary">
			<PublicNav />
			<BroadcastTicker matches={tickerMatches} />

			{/* Live Toasts Overlay */}
			<ScoreToast toasts={toasts} onDismiss={dismissToast} />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Main Feed Column (2 cols wide on desktop) */}
				<section className="lg:col-span-2 space-y-6">
					{/* Header & Status Filter Bar */}
					<div className="space-y-4">
						<div className="flex flex-col gap-4 border-b border-border-line pb-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
								<div className="flex items-center gap-3">
									<Calendar className="w-5 h-5 text-accent-readout" />
									<h1 className="font-display font-bold text-xl uppercase tracking-wider">
										LIVE MATCH FEED & SCHEDULE
									</h1>
								</div>

								<div className="flex items-center gap-2">
									<span className="text-[10px] font-data text-text-muted flex items-center gap-1.5 bg-bg-surface px-2.5 py-1 rounded border border-border-line">
										<StatusDot status="live" size="sm" />
										<span className="font-semibold text-accent-signal">
											{liveCount} LIVE NOW
										</span>
									</span>
								</div>
							</div>

							<div className="w-full">
								<DateSwitcher
									value={selectedDate}
									onChange={setSelectedDate}
								/>
							</div>
						</div>

						{/* Filter Controls Row */}
						<div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface border border-border-line p-3 rounded">
							{/* Status Filter Tabs */}
							<div className="flex border border-border-line rounded overflow-hidden text-xs font-display font-bold">
								{statusTabs.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setStatusFilter(tab.id)}
										className={`px-3 py-1.5 uppercase transition-colors ${
											statusFilter === tab.id
												? 'bg-accent-readout text-bg-void font-extrabold'
												: 'bg-bg-void hover:bg-bg-void/50 text-text-muted hover:text-text-primary'
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>

							{/* Game Category Pills */}
							<div className="flex flex-wrap items-center gap-1 text-[11px] font-display font-bold">
								{gameTabs.map((tab) => (
									<button
										key={tab.id}
										onClick={() => setGameFilter(tab.id)}
										className={`px-3 py-1.5 rounded uppercase border transition-colors ${
											gameFilter === tab.id
												? 'bg-accent-readout/20 text-accent-readout border-accent-readout/40'
												: 'bg-bg-void border-border-line text-text-muted hover:text-text-primary'
										}`}
									>
										{tab.label}
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
											id={match.id}
											gameType={match.gameType}
											gameTitle={match.gameTitle}
											status={match.status}
											timeLabel={match.timeLabel}
											homeScore={match.homeScore}
											awayScore={match.awayScore}
											homeMapsWon={match.homeMapsWon}
											awayMapsWon={match.awayMapsWon}
											bestOf={match.bestOf}
											href={`/competitions/${group.slug}/matches/${match.id}`}
											homeTeam={{
												id: match.homeTeam.id,
												name: match.homeTeam.name,
												shortCode:
													match.homeTeam.shortCode,
												logoUrl:
													match.homeTeam.logoUrl ??
													null,
											}}
											awayTeam={{
												id: match.awayTeam.id,
												name: match.awayTeam.name,
												shortCode:
													match.awayTeam.shortCode,
												logoUrl:
													match.awayTeam.logoUrl ??
													null,
											}}
										/>
									))}
								</LeagueSection>
							))}
						</div>
					) : (
						<EmptyState
							icon={Calendar}
							title="NO MATCHES FOUND"
							description="No live, upcoming, or finished matches match your selected filters."
							actionLabel="RESET FILTERS"
							onAction={() => {
								setStatusFilter('all');
								setGameFilter('all');
							}}
						/>
					)}
				</section>

				{/* Right Sidebar Column */}
				<section className="space-y-6">
					{/* Favorites Quick List */}
					{favorites.length > 0 && (
						<div className="bg-bg-surface border border-border-line rounded p-4 space-y-3">
							<div className="flex items-center gap-2 border-b border-border-line pb-2">
								<Star className="w-4 h-4 text-accent-favorite fill-accent-favorite" />
								<h3 className="font-display font-bold text-xs tracking-wider uppercase">
									YOUR STARRED FAVORITES
								</h3>
							</div>

							<div className="space-y-1.5 text-xs font-body">
								{favorites.map((fav) => (
									<div
										key={`${fav.type}-${fav.id}`}
										className="p-2 bg-bg-void border border-border-line rounded flex items-center justify-between"
									>
										<span className="font-semibold truncate">
											{fav.name}
										</span>
										<span className="text-[9px] font-data text-text-muted uppercase bg-bg-surface px-1.5 rounded">
											{fav.type}
										</span>
									</div>
								))}
							</div>

							<Link
								href="/favorites"
								className="block text-center text-[10px] font-display font-bold text-accent-readout hover:underline pt-1"
							>
								GO TO FAVORITES FEED →
							</Link>
						</div>
					)}

					{/* Broadcast Bulletin */}
					<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
						<div className="flex items-center gap-2 border-b border-border-line pb-2">
							<Newspaper className="w-4 h-4 text-accent-readout" />
							<h3 className="font-display font-bold text-sm tracking-wider uppercase">
								BROADCAST BULLETIN
							</h3>
						</div>

						<div className="divide-y divide-border-line">
							{newsItems.map((item) => (
								<article
									key={item.id}
									className="py-3 first:pt-0 last:pb-0 space-y-2"
								>
									<div className="flex items-center justify-between text-[9px] font-data">
										<span className="text-accent-readout font-bold tracking-wider">
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
										<h4 className="font-display font-bold text-sm text-text-primary group-hover:text-accent-readout transition-colors leading-tight">
											{item.title}
										</h4>
									</Link>
									<p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
										{item.excerpt ??
											'No summary available.'}
									</p>
								</article>
							))}
						</div>

						<Link
							href="/news"
							className="flex items-center justify-center gap-2 w-full py-2 bg-bg-void hover:bg-bg-void/50 border border-border-line hover:border-accent-readout/40 rounded font-display text-xs font-semibold tracking-wider text-text-muted hover:text-text-primary transition-all focus-ring"
						>
							<span>VIEW ALL BULLETIN POSTS</span>
							<ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
				</section>
			</main>

			{/* Broadcast Footer */}
			<footer className="bg-bg-surface border-t border-border-line py-4 select-none text-[10px] text-text-muted">
				<div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
					<span className="font-data">
						© 2026 ESPORTINGHQ. ALL SYSTEM BROADCASTS LIVE.
					</span>
					<div className="flex items-center gap-4 font-display font-semibold tracking-wider">
						<span className="flex items-center gap-1.5">
							<StatusDot status="completed" size="sm" />
							<span>NETWORK STATUS: NOMINAL</span>
						</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
