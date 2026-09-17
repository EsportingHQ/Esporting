import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Clock, ArrowRight, Tag, Newspaper } from 'lucide-react';

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
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
			{/* Ambient background glow */}
			<div className="gradient-mesh pointer-events-none" aria-hidden="true">
				<div className="mesh-orb" />
			</div>

			<PublicNav />

			<main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8 relative z-10">
				<div className="border-b border-white/[0.08] pb-6">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/25 text-accent-glow text-xs font-display font-semibold mb-2">
						<Newspaper className="w-3.5 h-3.5" />
						<span>NEWS & MEDIA</span>
					</div>
					<h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
						Community Bulletin
					</h1>
					<p className="text-sm text-text-muted font-body mt-1">
						Official league updates, tournament press releases, and match analysis.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
					{articles.map((article) => (
						<article
							key={article.id}
							className="glass glass-hover rounded-3xl border border-white/[0.08] p-7 flex flex-col justify-between transition-all duration-300 group hover:border-accent-primary/40 hover:shadow-[0_15px_40px_rgba(217,70,239,0.12)] hover:-translate-y-1"
						>
							<div className="space-y-4">
								<div className="flex flex-wrap items-center gap-2 text-xs font-data text-text-muted">
									{article.competition && (
										<span className="px-2.5 py-0.5 rounded-full bg-accent-primary/15 border border-accent-primary/25 text-accent-glow uppercase tracking-wider font-bold text-[10px]">
											{article.competition}
										</span>
									)}

									{article.game && (
										<span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] uppercase tracking-wider font-semibold text-[10px] text-text-muted">
											{article.game}
										</span>
									)}

									<span className="ml-auto flex items-center gap-1.5 text-xs text-text-muted">
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
									<h3 className="font-display font-bold text-xl text-white group-hover:text-accent-glow transition-colors leading-snug">
										{article.title}
									</h3>
								</Link>

								<p className="text-sm text-text-muted leading-relaxed font-body">
									{article.excerpt ?? 'No summary available.'}
								</p>
							</div>

							<div className="border-t border-white/[0.08] mt-6 pt-4">
								<Link
									href={`/news/${article.slug}`}
									className="inline-flex items-center gap-2 text-xs font-display font-bold text-accent-glow hover:text-white uppercase tracking-wider group-hover:translate-x-1 transition-all"
								>
									<span>READ ARTICLE</span>
									<ArrowRight className="w-3.5 h-3.5" />
								</Link>
							</div>
						</article>
					))}
				</div>

				{articles.length === 0 && (
					<div className="glass border border-dashed border-white/[0.1] rounded-3xl p-12 text-center text-text-muted">
						<Tag className="w-6 h-6 mx-auto mb-2 text-accent-glow" />
						<p className="font-display font-bold text-sm tracking-wide text-white">
							No published bulletin posts yet
						</p>
						<p className="text-xs text-text-muted mt-1">
							Check back soon for tournament recaps and announcements.
						</p>
					</div>
				)}
			</main>
		</div>
	);
}
