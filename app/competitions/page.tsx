'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { SearchInput } from '@/components/ui/SearchInput';
import { FavoriteStar } from '@/components/broadcast/FavoriteStar';
import { StatusDot } from '@/components/broadcast/StatusDot';
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy, Calendar, Users, Filter, CheckCircle2, PlayCircle, PlusCircle, Sparkles } from 'lucide-react';

interface Competition {
  id: string;
  name: string;
  slug: string;
  format: 'league' | 'knockout' | 'ranking' | 'group+knockout';
  status: 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
  gameTitles: string[];
  prizePool: string;
  startDate: string;
  teamCount: number;
  liveMatchesCount?: number;
}

export default function CompetitionsPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [competitions] = useState<Competition[]>([
    {
      id: 'c1',
      name: 'UI eSports League Season 1',
      slug: 'ui-esports-league',
      format: 'league',
      status: 'ongoing',
      gameTitles: ['FC 26', 'CODM Multiplayer'],
      prizePool: '₦500,000',
      startDate: 'July 1, 2026',
      teamCount: 16,
      liveMatchesCount: 2,
    },
    {
      id: 'c2',
      name: 'CODM Battle Royale Arena',
      slug: 'codm-br-arena',
      format: 'ranking',
      status: 'ongoing',
      gameTitles: ['CODM Battle Royale'],
      prizePool: '₦200,000 + Trophy',
      startDate: 'July 5, 2026',
      teamCount: 20,
      liveMatchesCount: 1,
    },
    {
      id: 'c3',
      name: 'PUBG Mobile Showdown',
      slug: 'pubg-mobile-showdown',
      format: 'ranking',
      status: 'registration',
      gameTitles: ['PUBG Battle Royale'],
      prizePool: '₦350,000',
      startDate: 'July 25, 2026',
      teamCount: 12,
      liveMatchesCount: 0,
    },
    {
      id: 'c4',
      name: 'FC Mobile Cup',
      slug: 'fc-mobile-cup',
      format: 'knockout',
      status: 'completed',
      gameTitles: ['FC Mobile'],
      prizePool: 'Trophy Only',
      startDate: 'June 10, 2026',
      teamCount: 8,
      liveMatchesCount: 0,
    },
  ]);

  // Search & Filter Logic
  const filteredComps = competitions.filter((comp) => {
    const matchesSearch =
      !searchQuery ||
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.gameTitles.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGame =
      selectedGame === 'all' ||
      (selectedGame === 'fc26' && comp.gameTitles.some((t) => t.includes('FC 26'))) ||
      (selectedGame === 'codm' && comp.gameTitles.some((t) => t.includes('CODM'))) ||
      (selectedGame === 'pubg' && comp.gameTitles.some((t) => t.includes('PUBG')));

    const matchesStatus = selectedStatus === 'all' || comp.status === selectedStatus;

    return matchesSearch && matchesGame && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ongoing':
        return <PlayCircle className="w-4 h-4 text-accent-live" />;
      case 'registration':
        return <PlusCircle className="w-4 h-4 text-accent-glow" />;
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
      default:
        return 'Tournament';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="gradient-mesh pointer-events-none" aria-hidden="true">
        <div className="mesh-orb" />
      </div>

      <PublicNav />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8 relative z-10">
        {/* Header Title */}
        <div className="border-b border-white/[0.08] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-glow text-xs font-display font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>TOURNAMENT DIRECTORY</span>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Competition Registry
            </h1>
            <p className="text-sm text-text-muted font-body">
              Browse all verified leagues, knockout brackets, and battle royale circuits.
            </p>
          </div>

          <div className="w-full md:w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search competitions or games..."
            />
          </div>
        </div>

        {/* Filter Console Panel */}
        <div className="glass-strong border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-5 text-xs select-none shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-2 text-white font-display font-bold">
            <Filter className="w-4 h-4 text-accent-glow" />
            <span>Filter By:</span>
          </div>

          {/* Game title pills */}
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Game:</span>
            <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-hidden">
              {[
                { id: 'all', label: 'All' },
                { id: 'fc26', label: 'FC 26' },
                { id: 'codm', label: 'CODM' },
                { id: 'pubg', label: 'PUBG' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGame(g.id)}
                  className={`px-3 py-1 font-display font-semibold rounded-lg transition-all ${
                    selectedGame === g.id
                      ? 'bg-accent-primary text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Status:</span>
            <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] overflow-hidden">
              {[
                { id: 'all', label: 'All' },
                { id: 'ongoing', label: 'Ongoing' },
                { id: 'registration', label: 'Open' },
                { id: 'completed', label: 'Ended' },
              ].map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`px-3 py-1 font-display font-semibold rounded-lg transition-all ${
                    selectedStatus === status.id
                      ? 'bg-accent-primary text-white font-bold shadow-[0_0_12px_rgba(217,70,239,0.3)]'
                      : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <span className="ml-auto text-xs font-data text-text-muted">
            {filteredComps.length} of {competitions.length} competitions
          </span>
        </div>

        {/* Competitions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredComps.map((comp) => (
            <div
              key={comp.id}
              className="glass glass-hover rounded-3xl border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 group hover:border-accent-primary/40 hover:shadow-[0_15px_40px_rgba(217,70,239,0.12)] hover:-translate-y-1"
            >
              <div className="space-y-4">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <FavoriteStar
                      entityType="competition"
                      entityId={comp.id}
                      entityName={comp.name}
                      size="sm"
                    />
                    <span className="text-[11px] font-display text-accent-glow font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-accent-primary/10 border border-accent-primary/20">
                      {getFormatLabel(comp.format)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {comp.liveMatchesCount && comp.liveMatchesCount > 0 ? (
                      <span className="text-[10px] font-data text-accent-live flex items-center gap-1.5 bg-accent-live/15 px-2.5 py-0.5 rounded-full border border-accent-live/30 font-bold">
                        <StatusDot status="live" size="sm" />
                        <span>{comp.liveMatchesCount} LIVE</span>
                      </span>
                    ) : null}

                    <div className="flex items-center gap-1.5 text-xs">
                      {getStatusIcon(comp.status)}
                      <span className="font-display font-semibold uppercase text-[11px] text-text-muted">
                        {comp.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <Link href={`/competitions/${comp.slug}`}>
                  <h2 className="font-display font-bold text-xl text-white group-hover:text-accent-glow transition-colors leading-snug">
                    {comp.name}
                  </h2>
                </Link>

                {/* Game tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {comp.gameTitles.map((title) => (
                    <span
                      key={title}
                      className="px-2.5 py-0.5 bg-white/[0.04] border border-white/[0.08] text-[10px] font-display font-semibold text-text-muted tracking-wider uppercase rounded-full"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats Footer Row */}
              <div className="grid grid-cols-3 gap-3 border-t border-white/[0.08] mt-6 pt-4 text-xs font-body">
                <div>
                  <span className="block text-[10px] text-text-muted font-display font-bold uppercase tracking-wider">
                    Prize Pool
                  </span>
                  <span className="text-accent-glow font-bold font-data text-sm">{comp.prizePool}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted font-display font-bold uppercase tracking-wider">
                    Rosters
                  </span>
                  <span className="text-white flex items-center gap-1 font-medium font-data text-sm">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    <span>{comp.teamCount} Teams</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted font-display font-bold uppercase tracking-wider">
                    Date
                  </span>
                  <span className="text-text-muted text-xs font-data">{comp.startDate}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredComps.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                icon={Trophy}
                title="No competitions match filters"
                description="Try clearing your search query or adjusting your status and game filters."
                actionLabel="Clear all filters"
                onAction={() => {
                  setSearchQuery('');
                  setSelectedGame('all');
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
