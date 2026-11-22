'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PublicNav } from '@/components/layout/public-nav';
import { BroadcastTicker } from '@/components/broadcast/broadcast-ticker';
import { MatchCard } from '@/components/broadcast/match-card';
import { MatchCardSkeleton } from '@/components/broadcast/MatchCardSkeleton';
import { LeagueSection } from '@/components/broadcast/LeagueSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { GameIcon } from '@/components/ui/GameIcon';
import { GAME_PROFILES } from '@/lib/games';
import { ScoreToast } from '@/components/ui/ScoreToast';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import { DateBar } from '@/components/feed/DateBar';
import { useFavorites } from '@/hooks/useFavorites';
import { useNewsArticles } from '@/hooks/useNewsArticles';
import { 
  Calendar, 
  Newspaper, 
  ArrowRight, 
  Star, 
  Zap, 
  ChevronDown, 
} from 'lucide-react';


export default function HomeClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const gameParam = searchParams.get('game') || 'all';

	const [day, setDay] = useState<Date>(() => {
		const n = new Date();
		return new Date(n.getFullYear(), n.getMonth(), n.getDate());
	});
	const [liveOnly, setLiveOnly] = useState(false);
	const {
		tickerMatches,
		groups,
		matchDays,
		liveCount,
		isLoading,
		toasts,
		dismissToast,
	} = useLiveFeed(day);
	const { favorites } = useFavorites();
	const { articles: newsItems } = useNewsArticles();

	const [gameFilter, setGameFilter] = useState<string>('all');
	const [moreOpen, setMoreOpen] = useState(false);
	const moreDropdownRef = useRef<HTMLDivElement>(null);

	const primaryGames = GAME_PROFILES.slice(0, 8); // ALL + the 7 launch titles
	const moreGames = GAME_PROFILES.slice(8); // empty until more titles are added

	// Active effective game filter (searchParam takes precedence if set, otherwise tab filter)
	const activeGame = gameParam !== 'all' ? gameParam : gameFilter;
	const isMoreSelected = moreGames.some((g) => g.id === activeGame || g.slug === activeGame);

	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
				setMoreOpen(false);
			}
		};
		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	}, []);

	// Filter groups and matches
	const filteredGroups = groups
		.map((group) => {
			const matches = group.matches.filter((match) => {
				if (liveOnly && match.status !== 'live') return false;

				if (activeGame !== 'all') {
					// Category links (?game=football | shooter | br) still work
					if (activeGame === 'football' && match.gameType !== 'football') return false;
					if (activeGame === 'shooter' && match.gameType !== 'shooter') return false;
					if (activeGame === 'br' && match.gameType !== 'br') return false;

					// A specific game chip: match on the game title name
					const profile = GAME_PROFILES.find(
						(g) => g.id === activeGame || g.slug === activeGame,
					);
					if (profile?.matches) {
						const titleLower = (match.gameTitle || '').toLowerCase();
						if (!profile.matches(titleLower)) return false;
					}
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
					{/* Headline + calendar */}
					<div className="space-y-4">
						<h1 className="font-display font-black text-2xl sm:text-3xl text-text-primary tracking-tight leading-tight">
							Live Esports Scores,{' '}
							<span className="text-accent-primary">Every Game</span>
						</h1>

						<DateBar
							selected={day}
							onSelect={(d) => {
								setDay(d);
								setLiveOnly(false);
							}}
							matchDays={matchDays}
							liveCount={liveCount}
							liveOnly={liveOnly}
							onToggleLive={() => {
								if (!liveOnly) {
									const n = new Date();
									setDay(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
								}
								setLiveOnly(!liveOnly);
							}}
						/>

						{/* Game filter row */}
						<div className="flex items-center justify-between gap-4 glass-strong border border-text-primary/[0.08] p-3 rounded-2xl shadow-lg backdrop-blur-xl">
							{/* Game pills: ALL + launch titles, with a MORE dropdown for any extras */}
							<div className="w-full md:w-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none text-xs font-display font-semibold">
								{primaryGames.map((game) => {
									const isSelected = activeGame === game.id || activeGame === game.slug;

									return (
										<button
											key={game.id}
											onClick={() => {
												setGameFilter(game.slug);
												if (gameParam !== 'all') {
													const params = new URLSearchParams(searchParams.toString());
													params.delete('game');
													router.replace(params.toString() ? `/feed?${params.toString()}` : '/feed', { scroll: false });
												}
											}}
											className={`min-h-[36px] px-3 sm:px-3.5 rounded-xl border transition-all shrink-0 flex items-center justify-center gap-1.5 ${
												isSelected
													? 'bg-accent-primary/20 text-accent-primary border-accent-primary/40 shadow-[0_0_12px_rgba(255,31,109,0.15)] font-bold'
													: 'bg-text-primary/[0.02] border-text-primary/[0.06] text-text-muted hover:text-text-primary hover:bg-text-primary/[0.05]'
											}`}
										>
											<GameIcon game={game} className="w-4 h-4 opacity-90" />
											<span>{game.shortName}</span>
										</button>
									);
								})}

								{/* MORE Dropdown (only when there are extra titles) */}
								{moreGames.length > 0 && (
								<div ref={moreDropdownRef} className="relative shrink-0">
									<button
										type="button"
										onClick={() => setMoreOpen(!moreOpen)}
										className={`min-h-[36px] px-3 sm:px-3.5 rounded-xl border transition-all flex items-center justify-center gap-1 ${
											isMoreSelected
												? 'bg-accent-primary/20 text-accent-primary border-accent-primary/40 shadow-[0_0_12px_rgba(255,31,109,0.15)] font-bold'
												: 'bg-text-primary/[0.02] border-text-primary/[0.06] text-text-muted hover:text-text-primary hover:bg-text-primary/[0.05]'
										}`}
									>
										<span>MORE</span>
										<ChevronDown
											className={`w-3.5 h-3.5 transition-transform duration-200 ${
												moreOpen ? 'rotate-180' : ''
											}`}
										/>
									</button>

									{moreOpen && (
										<div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-text-primary/[0.1] bg-bg-surface/95 backdrop-blur-2xl shadow-2xl py-1.5 z-50">
											{moreGames.map((game) => {
												const isSelected = activeGame === game.id || activeGame === game.slug;
												return (
													<button
														key={game.id}
														type="button"
														onClick={() => {
															setGameFilter(game.slug);
															setMoreOpen(false);
															if (gameParam !== 'all') {
																const params = new URLSearchParams(searchParams.toString());
																params.delete('game');
																router.replace(params.toString() ? `/feed?${params.toString()}` : '/feed', { scroll: false });
															}
														}}
														className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors text-left ${
															isSelected
																? 'bg-accent-primary/15 text-accent-primary font-bold'
																: 'text-text-muted hover:text-text-primary hover:bg-bg-elevated/70'
														}`}
													>
														<span>{game.name}</span>
														<span className="text-[10px] text-text-muted/70 font-data">
															{game.shortName}
														</span>
													</button>
												);
											})}
										</div>
									)}
								</div>
								)}
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
							title="No matches on this day"
							description="Pick another date from the calendar, or reset the filters."
							actionLabel="Reset filters"
							onAction={() => {
								setLiveOnly(false);
								setGameFilter('all');
							}}
						/>
					)}
				</section>

				{/* Right Sidebar Column - Hidden on Mobile */}
				<section className="hidden lg:block space-y-6">
					{/* Favorites Quick List */}
					{favorites.length > 0 && (
						<div className="glass rounded-3xl border border-text-primary/[0.08] p-5 space-y-4 shadow-xl">
							<div className="flex items-center gap-2.5 border-b border-text-primary/[0.08] pb-3">
								<Star className="w-4 h-4 text-accent-favorite fill-accent-favorite" />
								<h3 className="font-display font-bold text-sm tracking-wide text-text-primary">
									Starred Favorites
								</h3>
							</div>

							<div className="space-y-2 text-xs font-body">
								{favorites.map((fav) => (
									<div
										key={`${fav.type}-${fav.id}`}
										className="p-3 bg-text-primary/[0.03] border border-text-primary/[0.06] rounded-xl flex items-center justify-between hover:border-accent-primary/30 transition-colors"
									>
										<span className="font-semibold text-text-primary truncate">
											{fav.name}
										</span>
										<span className="text-[10px] font-data text-text-muted uppercase bg-text-primary/[0.05] px-2 py-0.5 rounded-full border border-text-primary/[0.05]">
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
					<div className="glass rounded-3xl border border-text-primary/[0.08] p-6 space-y-5 shadow-xl">
						<div className="flex items-center gap-2.5 border-b border-text-primary/[0.08] pb-3">
							<div className="p-1.5 rounded-lg bg-accent-primary/10 text-accent-glow">
								<Newspaper className="w-4 h-4" />
							</div>
							<h3 className="font-display font-bold text-base text-text-primary">
								Community Bulletin
							</h3>
						</div>

						<div className="divide-y divide-text-primary/[0.06]">
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
										<h4 className="font-display font-bold text-sm text-text-primary group-hover:text-accent-glow transition-colors leading-snug">
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
							className="flex items-center justify-center gap-2 w-full py-2.5 btn-glass text-xs font-display font-bold tracking-wider text-text-primary rounded-xl"
						>
							<span>VIEW ALL BULLETIN POSTS</span>
							<ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
				</section>
			</main>

			{/* Modern Glass Footer */}
			<footer className="glass-strong border-t border-text-primary/[0.08] py-8 relative z-20 select-none text-xs text-text-muted mt-auto">
				<div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-2 font-display font-bold text-text-primary text-sm">
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
