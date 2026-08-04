'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { Clock, ArrowRight, Tag } from 'lucide-react';
import { useNewsArticles } from '@/hooks/useNewsArticles';

export default function NewsPage() {
	const [selectedTag, setSelectedTag] = useState<string>('all');

	const { articles, isLoading, error } = useNewsArticles();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-7xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">Loading news...</p>
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

	const tags = ['all', ...new Set(articles.map((a) => a.tag))];

	const filteredArticles =
		selectedTag === 'all'
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
										<span>
											{article.published_at
												? new Date(
														article.published_at,
													).toLocaleDateString()
												: 'Draft'}
										</span>
									</span>
								</div>
								<Link
									href={`/news/${article.slug}`}
									className="block group"
								>
									<h3 className="font-display font-black text-xl hover:text-accent-readout transition-colors leading-snug uppercase">
										{article.title}
									</h3>
								</Link>
								<p className="text-xs text-text-muted leading-relaxed font-body">
									{article.excerpt ?? 'No summary available.'}
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
