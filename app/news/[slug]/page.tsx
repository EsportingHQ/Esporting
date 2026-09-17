import Link from 'next/link';
import { PublicNav } from '@/components/layout/public-nav';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Calendar, User, ArrowLeft, ArrowRight } from 'lucide-react';

type ArticleRow = {
	id: string;
	title: string;
	slug: string;
	body: string;
	excerpt: string | null;
	published_at: string | null;
	source_type: string | null;
	profiles:
		| { display_name: string | null }
		| { display_name: string | null }[]
		| null;
	comp_instances: { name: string } | { name: string }[] | null;
	game_titles: { name: string } | { name: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null;
	return value ?? null;
}

export default async function NewsDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const { data, error } = await supabase
		.from('news_articles')
		.select(
			'id, title, slug, body, excerpt, published_at, source_type, profiles(display_name), comp_instances(name), game_titles(name)',
		)
		.eq('slug', slug)
		.eq('status', 'published')
		.is('deleted_at', null)
		.single();

	if (error || !data) notFound();

	const article = data as ArticleRow;

	const authorName =
		first(article.profiles)?.display_name ?? 'EsportingHQ Editorial';
	const competition = first(article.comp_instances)?.name ?? null;
	const game = first(article.game_titles)?.name ?? null;

	const { data: relatedData } = await supabase
		.from('news_articles')
		.select('id, title, slug')
		.eq('status', 'published')
		.is('deleted_at', null)
		.neq('id', article.id)
		.order('published_at', { ascending: false })
		.limit(3);

	return (
		<div className="flex-1 flex flex-col bg-bg-void text-text-primary min-h-screen relative overflow-x-hidden">
			{/* Ambient background glow */}
			<div className="gradient-mesh pointer-events-none" aria-hidden="true">
				<div className="mesh-orb" />
			</div>

			<PublicNav />

			<main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-8 relative z-10">
				<Link
					href="/news"
					className="inline-flex items-center gap-2 text-xs font-display font-bold text-accent-glow hover:text-white uppercase tracking-wider transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					<span>BACK TO BULLETIN DESK</span>
				</Link>

				<article className="glass-strong border border-white/[0.08] rounded-3xl p-6 sm:p-10 space-y-6 shadow-2xl backdrop-blur-2xl">
					<div className="space-y-4">
						<div className="flex flex-wrap gap-2">
							{competition && (
								<span className="px-3 py-1 bg-accent-primary/15 border border-accent-primary/25 text-xs font-display font-bold text-accent-glow tracking-wider uppercase rounded-full">
									{competition}
								</span>
							)}

							{game && (
								<span className="px-3 py-1 bg-white/[0.04] border border-white/[0.08] text-xs font-display font-semibold text-text-muted tracking-wider uppercase rounded-full">
									{game}
								</span>
							)}
						</div>

						<h1 className="font-display font-black text-2xl sm:text-4xl text-white tracking-tight leading-snug">
							{article.title}
						</h1>

						<div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted border-t border-white/[0.08] pt-4">
							<span className="flex items-center gap-1.5">
								<Calendar className="w-4 h-4 text-accent-glow" />
								<span>
									{article.published_at
										? new Date(
												article.published_at,
											).toLocaleDateString()
										: 'Draft'}
								</span>
							</span>

							<span className="flex items-center gap-1.5">
								<User className="w-4 h-4 text-text-muted" />
								<span>By {authorName}</span>
							</span>
						</div>
					</div>

					<div className="text-sm sm:text-base font-body text-text-primary leading-relaxed space-y-4 whitespace-pre-wrap pt-2">
						{article.body}
					</div>
				</article>

				<section className="space-y-4 pt-4">
					<h3 className="font-display font-bold text-sm uppercase tracking-wider text-text-muted">
						Related Articles
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						{(relatedData ?? []).map((post) => (
							<Link
								key={post.id}
								href={`/news/${post.slug}`}
								className="block group"
							>
								<div className="glass glass-hover border border-white/[0.08] rounded-2xl p-5 h-full flex flex-col justify-between transition-all group-hover:border-accent-primary/40">
									<div className="space-y-2">
										<h4 className="font-display font-bold text-sm text-white group-hover:text-accent-glow transition-colors line-clamp-2 leading-snug">
											{post.title}
										</h4>
									</div>

									<span className="text-xs font-display font-semibold text-accent-glow flex items-center gap-1 mt-4">
										<span>Read Post</span>
										<ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
