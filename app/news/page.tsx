'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { Newspaper, Clock, ArrowRight, Tag } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  published_at: string;
  summary: string;
  tag: string;
  image_url: string | null;
}

export default function NewsPage() {
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const [articles] = useState<Article[]>([
    {
      id: 'n1',
      title: 'UI eSports League Season 1 prize pool announced',
      slug: 'ui-esports-league-prize-pool',
      published_at: 'July 10, 2026',
      summary: 'Organisers reveal a ₦500,000 prize pool and exclusive physical trophy for the champions of the inaugural season.',
      tag: 'LEAGUE',
      image_url: null,
    },
    {
      id: 'n2',
      title: 'CODM Mobile battle royale map rotation changes',
      slug: 'codm-br-map-rotation',
      published_at: 'July 9, 2026',
      summary: 'Isolated and Isolated Night are officially added to the official competitive schedule for all registered squads.',
      tag: 'CODM MOBILE',
      image_url: null,
    },
    {
      id: 'n3',
      title: 'Team Kuti clinches crucial victory in FC 26 group opener',
      slug: 'team-kuti-victory-fc-26',
      published_at: 'July 8, 2026',
      summary: 'Kuti beats Bello in a dramatic 2-1 head-to-head match to secure initial group points and head the leaderboard.',
      tag: 'MATCH RECAP',
      image_url: null,
    },
    {
      id: 'n4',
      title: 'Titan Force announces new player signings',
      slug: 'titan-force-new-signings',
      published_at: 'July 5, 2026',
      summary: 'Titan Force shakes up its roster ahead of the playoffs by registering two new starter players in the CODM MP division.',
      tag: 'ROSTERS',
      image_url: null,
    },
  ]);

  const tags = ['all', 'LEAGUE', 'CODM MOBILE', 'MATCH RECAP', 'ROSTERS'];

  const filteredArticles = selectedTag === 'all'
    ? articles
    : articles.filter((a) => a.tag === selectedTag);

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      <main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Header */}
        <div className="border-b border-border-line pb-4">
          <h1 className="font-display font-black text-3xl tracking-wider uppercase">
            BROADCAST BULLETIN
          </h1>
          <p className="text-xs text-text-muted font-data mt-1">
            OFFICIAL UPDATES, PRESS RELEASES, AND MATCH RECAPS
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <div className="flex items-center gap-1.5 text-text-muted mr-2 font-display font-bold uppercase">
            <Tag className="w-3.5 h-3.5" />
            <span>Category Filters:</span>
          </div>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 font-display font-bold tracking-wider uppercase rounded transition-colors ${
                selectedTag === tag
                  ? 'bg-accent-readout text-bg-void'
                  : 'bg-bg-surface hover:bg-bg-surface/50 border border-border-line text-text-muted hover:text-text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Articles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-6 flex flex-col justify-between transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-data text-text-muted">
                  <span className="text-accent-readout font-bold uppercase tracking-wider">
                    {article.tag}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{article.published_at}</span>
                  </span>
                </div>
                <Link href={`/news/${article.slug}`} className="block group">
                  <h3 className="font-display font-black text-xl hover:text-accent-readout transition-colors leading-snug uppercase">
                    {article.title}
                  </h3>
                </Link>
                <p className="text-xs text-text-muted leading-relaxed font-body">
                  {article.summary}
                </p>
              </div>

              <div className="border-t border-border-line mt-6 pt-4">
                <Link
                  href={`/news/${article.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-accent-readout hover:text-accent-readout/80 uppercase tracking-wider"
                >
                  <span>READ FULL BULLETIN POST</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
