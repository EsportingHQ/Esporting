'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { BroadcastTicker, TickerMatch } from '@/components/broadcast/broadcast-ticker';
import { MatchCard, MatchCardProps } from '@/components/broadcast/match-card';
import { TallyLight } from '@/components/broadcast/tally-light';
import { ArrowRight, Newspaper, Calendar, Award } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  summary: string;
  tag: string;
}

export default function HomeClient() {
  // Live ticker matches state
  const [tickerMatches, setTickerMatches] = useState<TickerMatch[]>([
    { id: '1', gameCode: 'FC26', homeTeam: 'KUTI', awayTeam: 'BELLO', homeScore: 2, awayScore: 1, status: 'live' },
    { id: '2', gameCode: 'CODM-MP', homeTeam: 'SUPRA', awayTeam: 'VENOM', homeScore: 1, awayScore: 2, status: 'live' },
    { id: '3', gameCode: 'PUBG', homeTeam: 'REBEL', awayTeam: 'APEX', homeScore: 45, awayScore: 38, status: 'live' },
    { id: '4', gameCode: 'FC26', homeTeam: 'NEXUS', awayTeam: 'ECHO', homeScore: 0, awayScore: 0, status: 'scheduled', timeLabel: '18:00' },
  ]);

  // Today's schedule matches
  const [scheduleMatches, setScheduleMatches] = useState<MatchCardProps[]>([
    {
      id: '1',
      gameType: 'football',
      gameTitle: 'FC 26 — Group Stage Stage 1',
      homeTeam: { name: 'Team Kuti', shortCode: 'KUTI' },
      awayTeam: { name: 'Team Bello', shortCode: 'BELLO' },
      homeScore: 2,
      awayScore: 1,
      status: 'live',
      timeLabel: 'LIVE NOW',
    },
    {
      id: '2',
      gameType: 'shooter',
      gameTitle: 'CODM Multiplayer — Quarter Finals',
      homeTeam: { name: 'Supra Gaming', shortCode: 'SUPRA' },
      awayTeam: { name: 'Venom Esports', shortCode: 'VENOM' },
      homeScore: 1,
      awayScore: 2,
      homeMapsWon: 1,
      awayMapsWon: 2,
      bestOf: 5,
      status: 'live',
      timeLabel: 'MAP 4',
    },
    {
      id: '4',
      gameType: 'football',
      gameTitle: 'FC 26 — Group Stage Stage 1',
      homeTeam: { name: 'Nexus Club', shortCode: 'NEXUS' },
      awayTeam: { name: 'Echo Esports', shortCode: 'ECHO' },
      homeScore: 0,
      awayScore: 0,
      status: 'scheduled',
      timeLabel: 'Starts in 10m',
    },
  ]);

  // Recent results (completed matches)
  const [recentResults] = useState<MatchCardProps[]>([
    {
      id: '10',
      gameType: 'football',
      gameTitle: 'FC 26 — Group Stage Stage 1',
      homeTeam: { name: 'Hyper Strikers', shortCode: 'HYP' },
      awayTeam: { name: 'Titan Force', shortCode: 'TTN' },
      homeScore: 3,
      awayScore: 0,
      status: 'completed',
      timeLabel: 'Finished yesterday',
    },
    {
      id: '11',
      gameType: 'shooter',
      gameTitle: 'CODM Multiplayer — Qualifiers',
      homeTeam: { name: 'Ares Clan', shortCode: 'ARS' },
      awayTeam: { name: 'Odin Elite', shortCode: 'ODN' },
      homeScore: 3,
      awayScore: 1,
      homeMapsWon: 3,
      awayMapsWon: 1,
      bestOf: 5,
      status: 'completed',
      timeLabel: 'Finished yesterday',
    },
    {
      id: '12',
      gameType: 'football',
      gameTitle: 'FC Mobile — Cup Round 1',
      homeTeam: { name: 'Eagles Soccer', shortCode: 'EAG' },
      awayTeam: { name: 'Falcons FC', shortCode: 'FLC' },
      homeScore: 1,
      awayScore: 2,
      status: 'completed',
      timeLabel: 'Finished 2 days ago',
    },
  ]);

  // Mock latest news
  const [news] = useState<NewsItem[]>([
    {
      id: 'n1',
      title: 'UI eSports League Season 1 prize pool announced',
      slug: 'ui-esports-league-prize-pool',
      published_at: '2 hours ago',
      summary: 'Organisers reveal a ₦500,000 prize pool and exclusive physical trophy for the champions.',
      tag: 'LEAGUE',
    },
    {
      id: 'n2',
      title: 'CODM Mobile battle royale map rotation changes',
      slug: 'codm-br-map-rotation',
      published_at: '5 hours ago',
      summary: 'Isolated and Isolated Night are officially added to the official competitive schedule.',
      tag: 'CODM MOBILE',
    },
    {
      id: 'n3',
      title: 'Team Kuti clinches crucial victory in FC 26 group opener',
      slug: 'team-kuti-victory-fc-26',
      published_at: '1 day ago',
      summary: 'Kuti beats Bello in a dramatic 2-1 head-to-head match to secure initial group points.',
      tag: 'MATCH RECAP',
    },
  ]);

  // Simulate realtime updates to scores
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate live ticker updates
      setTickerMatches((prev) =>
        prev.map((match) => {
          if (match.status === 'live') {
            const isHomeScore = Math.random() > 0.5;
            const inc = match.gameCode === 'PUBG' ? Math.floor(Math.random() * 4) + 1 : 1;
            const shouldScore = Math.random() > 0.7; // 30% chance to score
            if (shouldScore) {
              return {
                ...match,
                homeScore: isHomeScore ? match.homeScore + inc : match.homeScore,
                awayScore: !isHomeScore ? match.awayScore + inc : match.awayScore,
              };
            }
          }
          return match;
        })
      );

      // Simulate match card updates for the live matches
      setScheduleMatches((prev) =>
        prev.map((match) => {
          if (match.status === 'live') {
            const shouldScore = Math.random() > 0.7;
            if (shouldScore) {
              const isHome = Math.random() > 0.5;
              if (match.gameType === 'football') {
                return {
                  ...match,
                  homeScore: isHome ? match.homeScore + 1 : match.homeScore,
                  awayScore: !isHome ? match.awayScore + 1 : match.awayScore,
                };
              } else if (match.gameType === 'shooter') {
                // If it is a shooter, we update map scores or map wins
                const mapScoreHome = match.homeScore + (isHome ? 15 : 0);
                const mapScoreAway = match.awayScore + (!isHome ? 15 : 0);
                // If map score exceeds 150, map ends, increment map wins
                if (mapScoreHome >= 150) {
                  return {
                    ...match,
                    homeScore: 0,
                    awayScore: 0,
                    homeMapsWon: (match.homeMapsWon || 0) + 1,
                  };
                } else if (mapScoreAway >= 150) {
                  return {
                    ...match,
                    homeScore: 0,
                    awayScore: 0,
                    awayMapsWon: (match.awayMapsWon || 0) + 1,
                  };
                } else {
                  return {
                    ...match,
                    homeScore: mapScoreHome,
                    awayScore: mapScoreAway,
                  };
                }
              }
            }
          }
          return match;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />
      <BroadcastTicker matches={tickerMatches} />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left columns - matches list */}
        <section className="lg:col-span-2 space-y-8">
          {/* Today's schedule / Live section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border-line pb-2">
              <Calendar className="w-5 h-5 text-accent-readout" />
              <h2 className="font-display font-bold text-xl uppercase tracking-wider">
                TODAY'S BROADCAST SCHEDULE
              </h2>
              <span className="ml-auto text-[10px] font-data text-text-muted flex items-center gap-1.5 bg-bg-surface px-2 py-0.5 rounded border border-border-line">
                <TallyLight size="sm" />
                <span>UPDATES LIVE</span>
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {scheduleMatches.map((m) => (
                <Link key={m.id} href={`/competitions/ui-esports-league/matches/${m.id}`}>
                  <MatchCard {...m} />
                </Link>
              ))}
            </div>
          </div>

          {/* Recent results section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-border-line pb-2">
              <Award className="w-5 h-5 text-state-win" />
              <h2 className="font-display font-bold text-xl uppercase tracking-wider">
                RECENT RESULTS
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {recentResults.map((m) => (
                <Link key={m.id} href={`/competitions/ui-esports-league/matches/${m.id}`}>
                  <MatchCard {...m} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Right column - sidebar bulletin */}
        <section className="space-y-6">
          <div className="bg-bg-surface border border-border-line rounded p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-border-line pb-2">
              <Newspaper className="w-4 h-4 text-accent-readout" />
              <h3 className="font-display font-bold text-sm tracking-wider uppercase">
                BROADCAST BULLETIN
              </h3>
            </div>

            <div className="divide-y divide-border-line">
              {news.map((item) => (
                <article key={item.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-data">
                    <span className="text-accent-readout font-bold tracking-wider">
                      {item.tag}
                    </span>
                    <span className="text-text-muted">{item.published_at}</span>
                  </div>
                  <Link href={`/news/${item.slug}`} className="block group">
                    <h4 className="font-display font-bold text-sm text-text-primary group-hover:text-accent-readout transition-colors leading-tight">
                      {item.title}
                    </h4>
                  </Link>
                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </article>
              ))}
            </div>

            <Link
              href="/news"
              className="flex items-center justify-center gap-2 w-full py-2 bg-bg-void hover:bg-bg-void/50 border border-border-line hover:border-accent-readout/40 rounded font-display text-xs font-semibold tracking-wider text-text-muted hover:text-text-primary transition-all mt-2"
            >
              <span>VIEW ALL BULLETIN POSTS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Broadcast lower third style footer */}
      <footer className="bg-bg-surface border-t border-border-line py-4 select-none text-[10px] text-text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-data">© 2026 ESPORTINGHQ. ALL SYSTEM BROADCASTS LIVE.</span>
          <div className="flex items-center gap-4 font-display font-semibold tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-state-win"></span>
              <span>NETWORK STATUS: NOMINAL</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
