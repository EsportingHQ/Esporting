'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { MatchCard, MatchCardProps } from '@/components/broadcast/match-card';
import { EventBadge } from '@/components/broadcast/event-badge';
import { Trophy, Calendar, Award, ListOrdered, FileText } from 'lucide-react';
import {
	useCompetitionDetail,
	StandingRow,
	BRStandingRow,
} from '@/hooks/useCompetitionDetail';

type CompetitionTab = 'overview' | 'schedule' | 'results' | 'standings';

export default function CompetitionDetailPage({
	params: paramsPromise,
}: {
	params: Promise<{ slug: string }>;
}) {
	// Unwrap params using React.use()
	const params = use(paramsPromise);
	const slug = params.slug;

	const [activeTab, setActiveTab] = useState<CompetitionTab>('overview');

	const {
		competition,
		participants,
		scheduleMatches,
		resultsMatches,
		standings: leagueStandings,
		brStandings,
		isBRFormat,
		isLoading,
		error,
		notFound,
	} = useCompetitionDetail(slug);

	const formatLabel = competition?.format ?? 'league';

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">
						Loading competition...
					</p>
				</main>
			</div>
		);
	}

	if (notFound || !competition) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12 space-y-4">
					<h1 className="font-display text-2xl font-black uppercase">
						Competition not found
					</h1>
					<Link
						href="/competitions"
						className="text-accent-readout underline"
					>
						Back to competitions
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
						Unable to load competition
					</h1>
					<p className="text-sm text-text-muted">{error.message}</p>
				</main>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary">
			<PublicNav />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
				{/* Banner Card / Profile header */}
				<div className="bg-bg-surface border border-border-line rounded p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-data text-accent-readout font-bold tracking-wider uppercase">
								{isBRFormat
									? 'BATTLE ROYALE BRACKET'
									: 'ROUND-ROBIN DIVISION'}
							</span>
							<EventBadge status="ongoing" />
						</div>
						<h1 className="font-display font-black text-3xl tracking-wide uppercase">
							{competition.name}
						</h1>
						<p className="text-xs text-text-muted max-w-xl font-body leading-relaxed">
							{competition.description ??
								'Live competition data from EsportingHQ.'}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4 border-l border-border-line pl-6 shrink-0 text-xs font-data">
						<div>
							<span className="block text-[9px] text-text-muted font-display font-bold uppercase tracking-wider">
								PRIZE POOL
							</span>
							<span className="text-accent-signal font-semibold">
								{competition.prize_pool ?? 'TBD'}
							</span>
						</div>
						<div>
							<span className="block text-[9px] text-text-muted font-display font-bold uppercase tracking-wider">
								COMPETITION FORMAT
							</span>
							<span className="text-text-primary uppercase">
								{formatLabel}
							</span>
						</div>
					</div>
				</div>

				{/* Tab switcher */}
				<div className="flex border-b border-border-line gap-2 font-display font-bold tracking-wider text-xs">
					{(
						[
							{
								id: 'overview',
								label: 'OVERVIEW',
								icon: <FileText className="w-3.5 h-3.5" />,
							},
							{
								id: 'schedule',
								label: 'SCHEDULE',
								icon: <Calendar className="w-3.5 h-3.5" />,
							},
							{
								id: 'results',
								label: 'RESULTS',
								icon: <Award className="w-3.5 h-3.5" />,
							},
							{
								id: 'standings',
								label: 'STANDINGS',
								icon: <ListOrdered className="w-3.5 h-3.5" />,
							},
						] satisfies {
							id: CompetitionTab;
							label: string;
							icon: React.ReactNode;
						}[]
					).map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-2.5 border-b-2 flex items-center gap-1.5 transition-all ${
								activeTab === tab.id
									? 'border-accent-readout text-accent-readout'
									: 'border-transparent text-text-muted hover:text-text-primary'
							}`}
						>
							{tab.icon}
							<span>{tab.label}</span>
						</button>
					))}
				</div>

				{/* Tab Contents */}
				<div className="py-2">
					{/* Tab 1: Overview */}
					{activeTab === 'overview' && (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="md:col-span-2 bg-bg-surface border border-border-line rounded p-6 space-y-4">
								<h3 className="font-display font-bold text-lg uppercase tracking-wider text-accent-readout">
									About the Competition
								</h3>
								<p className="text-xs text-text-muted leading-relaxed font-body">
									Welcome to the flagship competitive arena of
									Esporting. Matches are conducted live and
									broadcast directly on the platform
									dashboard. All stats, scores, and event
									telemetry update in real-time.
								</p>
								<div className="grid grid-cols-2 gap-4 pt-4 text-xs font-body">
									<div className="bg-bg-void border border-border-line p-3 rounded">
										<span className="text-[10px] text-text-muted font-display font-bold uppercase block mb-1">
											Start Date
										</span>
										<span className="font-data">
											{competition.starts_at
												? new Date(
														competition.starts_at,
													).toLocaleDateString()
												: 'TBD'}
										</span>
									</div>
									<div className="bg-bg-void border border-border-line p-3 rounded">
										<span className="text-[10px] text-text-muted font-display font-bold uppercase block mb-1">
											Organizer ID
										</span>
										<span className="font-data text-accent-readout">
											{competition.organiserName ||
												'EsportingHQ'}
										</span>
									</div>
								</div>
							</div>

							<div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
								<div className="flex items-center gap-2 border-b border-border-line pb-2">
									<Trophy className="w-4 h-4 text-accent-signal" />
									<h4 className="font-display font-bold text-xs uppercase tracking-wider">
										Participating Teams
									</h4>
								</div>
								<div className="grid grid-cols-2 gap-2 text-xs font-body">
									{participants.map((team) => (
										<div
											key={team.id}
											className="bg-bg-void border border-border-line px-3 py-1.5 rounded flex items-center justify-between"
										>
											<span className="font-medium">
												{team.name}
											</span>
											<span className="text-[9px] font-data text-text-muted">
												{team.shortCode}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Tab 2: Schedule */}
					{activeTab === 'schedule' && (
						<div className="space-y-4">
							<h3 className="font-display font-bold text-sm uppercase tracking-wider text-text-muted">
								UPCOMING FIXTURES
							</h3>
							<div className="grid grid-cols-1 gap-4">
								{scheduleMatches.map((match) => (
									<Link
										key={match.id}
										href={`/competitions/${slug}/matches/${match.id}`}
									>
										<MatchCard {...match} />
									</Link>
								))}
							</div>
						</div>
					)}

					{/* Tab 3: Results */}
					{activeTab === 'results' && (
						<div className="space-y-4">
							<h3 className="font-display font-bold text-sm uppercase tracking-wider text-text-muted">
								PAST MATCH RESULTS
							</h3>
							<div className="grid grid-cols-1 gap-4">
								{resultsMatches.map((match) => (
									<Link
										key={match.id}
										href={`/competitions/${slug}/matches/${match.id}`}
									>
										<MatchCard {...match} />
									</Link>
								))}
							</div>
						</div>
					)}

					{/* Tab 4: Standings */}
					{activeTab === 'standings' && (
						<div className="bg-bg-surface border border-border-line rounded overflow-hidden">
							{isBRFormat ? (
								/* Battle Royale Points Standings Table */
								<table className="w-full text-left border-collapse text-xs">
									<thead>
										<tr className="bg-bg-void border-b border-border-line font-display font-bold text-text-muted uppercase tracking-wider">
											<th className="py-3 px-4 w-12 text-center">
												Rank
											</th>
											<th className="py-3 px-4">
												Squad Name
											</th>
											<th className="py-3 px-4 w-20 text-center">
												Tag
											</th>
											<th className="py-3 px-4 w-24 text-center">
												Total Kills
											</th>
											<th className="py-3 px-4 w-24 text-center">
												Place Pts
											</th>
											<th className="py-3 px-4 w-24 text-center">
												Kill Pts
											</th>
											<th className="py-3 px-4 w-28 text-center text-accent-signal">
												Total Pts
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border-line font-data">
										{brStandings.map((row) => (
											<tr
												key={row.shortCode}
												className="hover:bg-bg-void/40 transition-colors"
											>
												<td className="py-3 px-4 text-center font-bold">
													{row.rank}
												</td>
												<td className="py-3 px-4 font-body font-medium text-text-primary">
													{row.name}
												</td>
												<td className="py-3 px-4 text-center text-text-muted">
													{row.shortCode}
												</td>
												<td className="py-3 px-4 text-center">
													{row.kills}
												</td>
												<td className="py-3 px-4 text-center">
													{row.placementPts}
												</td>
												<td className="py-3 px-4 text-center">
													{row.killPts}
												</td>
												<td className="py-3 px-4 text-center font-bold text-accent-signal">
													{row.totalPts}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								/* H2H Football/League Standings Table */
								<table className="w-full text-left border-collapse text-xs">
									<thead>
										<tr className="bg-bg-void border-b border-border-line font-display font-bold text-text-muted uppercase tracking-wider text-[11px]">
											<th className="py-3 px-4 w-12 text-center">
												Rank
											</th>
											<th className="py-3 px-4">
												Squad Name
											</th>
											<th className="py-3 px-4 w-20 text-center">
												Tag
											</th>
											<th className="py-3 px-4 w-16 text-center">
												PL
											</th>
											<th className="py-3 px-4 w-16 text-center">
												W
											</th>
											<th className="py-3 px-4 w-16 text-center">
												D
											</th>
											<th className="py-3 px-4 w-16 text-center">
												L
											</th>
											<th className="py-3 px-4 w-16 text-center">
												GD
											</th>
											<th className="py-3 px-4 w-20 text-center text-accent-signal">
												PTS
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-border-line font-data">
										{leagueStandings.map((row) => (
											<tr
												key={row.shortCode}
												className="hover:bg-bg-void/40 transition-colors"
											>
												<td className="py-3 px-4 text-center font-bold">
													{row.rank}
												</td>
												<td className="py-3 px-4 font-body font-medium text-text-primary">
													{row.name}
												</td>
												<td className="py-3 px-4 text-center text-text-muted">
													{row.shortCode}
												</td>
												<td className="py-3 px-4 text-center">
													{row.played}
												</td>
												<td className="py-3 px-4 text-center">
													{row.won}
												</td>
												<td className="py-3 px-4 text-center">
													{row.drawn ?? 0}
												</td>
												<td className="py-3 px-4 text-center">
													{row.lost}
												</td>
												<td className="py-3 px-4 text-center">
													{row.gd ?? 0}
												</td>
												<td className="py-3 px-4 text-center font-bold text-accent-signal">
													{row.pts}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
