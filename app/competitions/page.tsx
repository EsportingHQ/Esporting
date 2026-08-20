'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { SearchInput } from '@/components/ui/SearchInput';
import { FavoriteStar } from '@/components/broadcast/FavoriteStar';
import { StatusDot } from '@/components/broadcast/StatusDot';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCompetitions } from '@/hooks/useCompetitions';
import { combineCompetitionName } from '@/lib/competitionName';
import {
	Trophy,
	Calendar,
	Users,
	CheckCircle2,
	PlayCircle,
	PlusCircle,
} from 'lucide-react';

export default function CompetitionsPage() {
	const { competitions, isLoading, error } = useCompetitions();

	const [searchQuery, setSearchQuery] = useState('');
	const [selectedStatus, setSelectedStatus] = useState('all');

	const filteredComps = competitions.filter((comp) => {
		const matchesSearch =
			!searchQuery ||
			comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			comp.gameTitles.some((t) =>
				t.name.toLowerCase().includes(searchQuery.toLowerCase()),
			);

		const matchesStatus =
			selectedStatus === 'all' || comp.status === selectedStatus;

		return matchesSearch && matchesStatus;
	});

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'ongoing':
				return <PlayCircle className="w-4 h-4 text-accent-signal" />;
			case 'registration':
				return <PlusCircle className="w-4 h-4 text-accent-readout" />;
			case 'completed':
				return <CheckCircle2 className="w-4 h-4 text-state-win" />;
			default:
				return <Calendar className="w-4 h-4 text-text-muted" />;
		}
	};

	const getFormatLabel = (format: string) => {
		switch (format) {
			case 'league':
				return 'Round Robin League';
			case 'ranking':
				return 'Point Ranking (BR)';
			case 'knockout':
				return 'Single Elimination Bracket';
			case 'group+knockout':
				return 'Group Stage + Knockout';
			default:
				return 'Tournament';
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">
						Loading competitions...
					</p>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">{error.message}</p>
				</main>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary">
			<PublicNav />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
				<div className="border-b border-border-line pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="font-display font-black text-3xl tracking-wider uppercase">
							COMPETITION REGISTRY
						</h1>
						<p className="text-xs text-text-muted font-data mt-1">
							BROWSE ALL LEAGUES, TOURNAMENTS, AND EVENT SERIES
						</p>
					</div>

					<div className="w-full md:w-80">
						<SearchInput
							value={searchQuery}
							onChange={setSearchQuery}
							placeholder="SEARCH COMPETITIONS OR GAMES..."
						/>
					</div>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-4 flex flex-wrap items-center gap-6 text-xs select-none">
					<div className="flex items-center gap-2">
						<span className="text-text-muted">Status:</span>
						<div className="flex border border-border-line rounded overflow-hidden">
							{[
								'all',
								'ongoing',
								'registration',
								'completed',
							].map((status) => (
								<button
									key={status}
									onClick={() => setSelectedStatus(status)}
									className={`px-3 py-1 font-display font-bold tracking-wider uppercase transition-colors ${
										selectedStatus === status
											? 'bg-accent-readout text-bg-void'
											: 'bg-bg-void hover:bg-bg-void/50 text-text-muted hover:text-text-primary'
									}`}
								>
									{status}
								</button>
							))}
						</div>
					</div>

					<span className="ml-auto text-[10px] font-data text-text-muted">
						SHOWING {filteredComps.length} OF {competitions.length}{' '}
						COMPETITIONS
					</span>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{filteredComps.map((comp) => (
						<Link
							key={comp.id}
							href={`/competitions/${comp.slug}`}
							className="bg-bg-surface border border-border-line hover:border-accent-readout/40 rounded p-6 flex flex-col justify-between transition-all group hover:shadow-lg"
						>
							<div className="space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<FavoriteStar
											entityType="competition"
											entityId={comp.id}
											entityName={comp.name}
											size="sm"
										/>
										<span className="text-[10px] font-data text-accent-readout font-bold tracking-wide uppercase">
											{getFormatLabel(comp.format)}
										</span>
									</div>

									<div className="flex items-center gap-2">
										{comp.liveMatchesCount > 0 ? (
											<span className="text-[9px] font-data text-accent-signal flex items-center gap-1.5 bg-accent-signal/10 px-2 py-0.5 rounded border border-accent-signal/30 font-semibold">
												<StatusDot
													status="live"
													size="sm"
												/>
												<span>
													{comp.liveMatchesCount} LIVE
												</span>
											</span>
										) : null}

										<div className="flex items-center gap-1.5 text-xs">
											{getStatusIcon(comp.status)}
											<span className="font-display font-bold tracking-wider uppercase text-[10px] text-text-muted">
												{comp.status}
											</span>
										</div>
									</div>
								</div>

								<h2 className="font-display font-black text-xl text-text-primary group-hover:text-accent-readout transition-colors leading-tight uppercase">
									{combineCompetitionName(
										comp.seriesName,
										comp.name,
									)}
								</h2>

								<div className="flex flex-wrap gap-1.5 pt-1">
									{comp.gameTitles.map((title) => (
										<span
											key={title.slug}
											className="px-2 py-0.5 bg-bg-void border border-border-line text-[9px] font-display font-bold text-text-muted tracking-wider uppercase rounded-sm"
										>
											{title.name}
										</span>
									))}
								</div>
							</div>

							<div className="grid grid-cols-3 gap-2 border-t border-border-line mt-6 pt-4 text-xs font-data">
								<div>
									<span className="block text-[9px] text-text-muted uppercase font-display font-bold tracking-wider">
										Prize Pool
									</span>
									<span className="text-accent-signal font-semibold">
										{comp.prizePool ?? 'TBD'}
									</span>
								</div>
								<div>
									<span className="block text-[9px] text-text-muted uppercase font-display font-bold tracking-wider">
										Rosters
									</span>
									<span className="text-text-primary flex items-center gap-1">
										<Users className="w-3.5 h-3.5 text-text-muted" />
										<span>{comp.teamCount} Teams</span>
									</span>
								</div>
								<div>
									<span className="block text-[9px] text-text-muted uppercase font-display font-bold tracking-wider">
										Launched
									</span>
									<span className="text-text-muted text-[11px]">
										{comp.startDate
											? new Date(
													comp.startDate,
												).toLocaleDateString()
											: 'TBD'}
									</span>
								</div>
							</div>
						</Link>
					))}

					{filteredComps.length === 0 && (
						<div className="col-span-full">
							<EmptyState
								icon={Trophy}
								title="NO COMPETITIONS MATCH FILTERS"
								description="Try clearing your search query or adjusting the status filter."
								actionLabel="CLEAR ALL FILTERS"
								onAction={() => {
									setSearchQuery('');
									setSelectedStatus('all');
								}}
							/>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
