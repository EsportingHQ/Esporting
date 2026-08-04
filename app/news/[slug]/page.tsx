'use client';

import { use } from 'react';
import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { Calendar, User, ArrowLeft } from 'lucide-react';
import { useNewsArticle } from '@/hooks/useNewsArticle';

export default function NewsDetailPage({
	params: paramsPromise,
}: {
	params: Promise<{ slug: string }>;
}) {
	const params = use(paramsPromise);
	const slug = params.slug;

	const { article, related, isLoading, notFound, error } =
		useNewsArticle(slug);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-4xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">
						Loading article...
					</p>
				</main>
			</div>
		);
	}

	if (notFound || !article) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-4xl mx-auto px-4 py-12 space-y-4">
					<h1 className="font-display text-2xl font-black uppercase">
						Article not found
					</h1>
					<Link
						href="/news"
						className="text-accent-readout underline"
					>
						Back to news
					</Link>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-bg-void text-text-primary">
				<PublicNav />
				<main className="max-w-4xl mx-auto px-4 py-12">
					<p className="text-sm text-text-muted">{error.message}</p>
				</main>
			</div>
		);
	}

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
							{article.tag}
						</span>
						<h1 className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase leading-tight">
							{article.title}
						</h1>

						<div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-4">
							<span className="flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5" />
								<span>{article.published_at}</span>
							</span>
							<span className="flex items-center gap-1.5">
								<User className="w-3.5 h-3.5" />
								<span>By {article.authorName}</span>
							</span>
						</div>
					</div>

					{/* Body */}
					<div className="text-sm font-body text-text-primary leading-relaxed space-y-4 whitespace-pre-wrap pt-2">
						{article.body}
					</div>
				</article>

				{/* Related Posts */}
				<section className="space-y-4">
					<h3 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
						RELATED BROADCASTS
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{related.map((post) => (
							<Link
								key={post.slug}
								href={`/news/${post.slug}`}
								className="block"
							>
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
