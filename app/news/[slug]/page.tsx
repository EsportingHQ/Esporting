'use client';

import { use } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { Newspaper, Calendar, User, ArrowLeft, Clock } from 'lucide-react';

interface RelatedPost {
  title: string;
  slug: string;
  tag: string;
}

export default function NewsDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string }>;
}) {
  const params = use(paramsPromise);
  const slug = params.slug;

  const articleTitle = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const mockArticle = {
    title: articleTitle,
    published_at: 'July 10, 2026',
    author: 'Broadcast Desk',
    tag: 'ANNOUNCEMENT',
    content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.`,
  };

  const relatedPosts: RelatedPost[] = [
    { title: 'CODM Mobile battle royale map changes', slug: 'codm-br-map-rotation', tag: 'CODM MOBILE' },
    { title: 'Team Kuti clinches crucial victory in FC 26 group opener', slug: 'team-kuti-victory-fc-26', tag: 'MATCH RECAP' },
    { title: 'Titan Force announces new player signings', slug: 'titan-force-new-signings', tag: 'ROSTERS' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        {/* Back Link */}
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-accent-readout hover:underline uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO BULLETIN DESK</span>
        </Link>

        {/* Article Container */}
        <article className="bg-bg-surface border border-border-line rounded p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <span className="px-2 py-0.5 bg-accent-readout/10 border border-accent-readout/30 text-[9px] font-display font-bold text-accent-readout tracking-wider uppercase rounded-sm inline-block">
              {mockArticle.tag}
            </span>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase leading-tight">
              {mockArticle.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{mockArticle.published_at}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>By {mockArticle.author}</span>
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="text-sm font-body text-text-primary leading-relaxed space-y-4 whitespace-pre-wrap pt-2">
            {mockArticle.content}
          </div>
        </article>

        {/* Related Posts */}
        <section className="space-y-4">
          <h3 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
            RELATED BROADCASTS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedPosts.map((post) => (
              <Link key={post.slug} href={`/news/${post.slug}`} className="block">
                <div className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-4 h-full flex flex-col justify-between transition-all">
                  <div className="space-y-2">
                    <span className="text-[9px] font-data text-accent-readout font-bold tracking-wide uppercase">
                      {post.tag}
                    </span>
                    <h4 className="font-display font-bold text-sm text-text-primary line-clamp-2 uppercase leading-tight">
                      {post.title}
                    </h4>
                  </div>
                  <span className="text-[10px] font-display font-bold text-text-muted hover:text-text-primary uppercase tracking-wider mt-4 block">
                    READ POST →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
