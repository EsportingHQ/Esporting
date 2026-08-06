import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Clock, ArrowRight, Tag } from 'lucide-react';

type ArticleRow = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	published_at: string | null;
	source_type: string | null;
	comp_instances: { name: string } | { name: string }[] | null;
	game_titles: { name: string } | { name: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null;
	return value ?? null;
}

export default async function NewsPage() {
	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const { data, error } = await supabase
		.from('news_articles')
		.select(
			'id, title, slug, excerpt, published_at, source_type, comp_instances(name), game_titles(name)',
		)
		.eq('status', 'published')
		.is('deleted_at', null)
		.order('published_at', { ascending: false });

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

	const articles = ((data ?? []) as ArticleRow[]).map((article) => {
		const competition = first(article.comp_instances)?.name ?? null;
		const game = first(article.game_titles)?.name ?? null;

		return {
			id: article.id,
			title: article.title,
			slug: article.slug,
			excerpt: article.excerpt,
			published_at: article.published_at,
			source_type: article.source_type,
			competition,
			game,
		};
	});

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary">
			<PublicNav />

			<main className="max-w-7xl w-full mx-auto px-4 py-8 flex-1 space-y-6">
				<div className="border-b border-border-line pb-4">
					<h1 className="font-display font-black text-3xl tracking-wider uppercase">
						BROADCAST BULLETIN
					</h1>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						OFFICIAL UPDATES, PRESS RELEASES, AND MATCH RECAPS
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
					{articles.map((article) => (
						<article
							key={article.id}
							className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-6 flex flex-col justify-between transition-all"
						>
							<div className="space-y-3">
								<div className="flex flex-wrap items-center gap-2 text-[10px] font-data text-text-muted">
									{article.competition && (
										<span className="px-2 py-0.5 rounded bg-accent-readout/10 border border-accent-readout/30 text-accent-readout uppercase tracking-wider font-bold">
											{article.competition}
										</span>
									)}

									{article.game && (
										<span className="px-2 py-0.5 rounded bg-bg-void border border-border-line uppercase tracking-wider font-bold">
											{article.game}
										</span>
									)}

									<span className="ml-auto flex items-center gap-1">
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

				{articles.length === 0 && (
					<div className="border border-dashed border-border-line rounded p-10 text-center text-text-muted">
						<Tag className="w-5 h-5 mx-auto mb-2" />
						<p className="font-display font-bold uppercase text-xs tracking-wider">
							No published news yet
						</p>
					</div>
				)}
			</main>
		</div>
	);
}
