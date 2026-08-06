import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Globe } from 'lucide-react';

type PageProps = {
	params: Promise<{ id: string }>;
};

async function publishArticle(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');

	const id = String(formData.get('id'));

	const { error } = await supabase
		.from('news_articles')
		.update({
			status: 'published',
			published_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

async function rejectArticle(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');

	const id = String(formData.get('id'));

	const { error } = await supabase
		.from('news_articles')
		.update({
			status: 'rejected',
			updated_at: new Date().toISOString(),
		})
		.eq('id', id);

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

export default async function AdminReviewArticlePage({ params }: PageProps) {
	const { id } = await params;

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');

	const { data: roleData } = await supabase
		.from('user_role_assignments')
		.select('roles(name)')
		.eq('user_id', user.id)
		.is('revoked_at', null);

	const roles =
		(roleData as { roles: { name: string } }[] | null)?.map(
			(r) => r.roles?.name,
		) ?? [];

	if (!roles.includes('super_admin')) redirect('/dashboard-redirect');

	const { data: article } = await supabase
		.from('news_articles')
		.select(
			`
      *,
      comp_instances(name),
      game_titles(name)
    `,
		)
		.eq('id', id)
		.is('deleted_at', null)
		.single();

	if (!article) notFound();

	return (
		<div className="max-w-4xl space-y-6 font-body">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
						Review Article
					</h2>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						EDITORIAL MODERATION DESK
					</p>
				</div>

				<Link
					href="/admin/news"
					className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all"
				>
					Back to Queue
				</Link>
			</div>

			<div className="bg-bg-surface border border-border-line rounded p-6 space-y-5">
				<div className="space-y-3">
					<div className="flex flex-wrap items-center gap-2 text-xs font-data text-text-muted">
						<span className="px-2 py-0.5 rounded-full border border-border-line uppercase tracking-wider">
							{article.status.replace('_', ' ')}
						</span>

						<span className="px-2 py-0.5 rounded-full border border-border-line uppercase tracking-wider">
							{article.source_type}
						</span>

						{article.source_name && (
							<span className="flex items-center gap-1">
								<Globe className="w-3 h-3" />
								{article.source_name}
							</span>
						)}

						<span className="flex items-center gap-1">
							<Clock className="w-3 h-3" />
							{new Date(article.updated_at).toLocaleString()}
						</span>
					</div>

					<h1 className="font-display font-black text-3xl text-text-primary uppercase tracking-wide">
						{article.title}
					</h1>

					{article.excerpt && (
						<p className="text-sm text-text-muted leading-relaxed">
							{article.excerpt}
						</p>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div className="bg-bg-void border border-border-line rounded p-4">
						<p className="text-[10px] font-display uppercase text-text-muted mb-1">
							Competition
						</p>
						<p className="font-medium text-text-primary">
							{Array.isArray(article.comp_instances)
								? (article.comp_instances[0]?.name ?? 'General')
								: (article.comp_instances?.name ?? 'General')}
						</p>
					</div>

					<div className="bg-bg-void border border-border-line rounded p-4">
						<p className="text-[10px] font-display uppercase text-text-muted mb-1">
							Game Title
						</p>
						<p className="font-medium text-text-primary">
							{Array.isArray(article.game_titles)
								? (article.game_titles[0]?.name ?? 'Any')
								: (article.game_titles?.name ?? 'Any')}
						</p>
					</div>
				</div>

				<article className="prose prose-invert max-w-none">
					<div className="whitespace-pre-wrap text-sm leading-7 text-text-primary">
						{article.body}
					</div>
				</article>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{article.status !== 'published' && (
					<form action={publishArticle}>
						<input type="hidden" name="id" value={article.id} />
						<button
							type="submit"
							className="bg-state-win hover:bg-state-win/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all inline-flex items-center gap-2"
						>
							<CheckCircle2 className="w-4 h-4" />
							Publish Article
						</button>
					</form>
				)}

				{article.status !== 'rejected' && (
					<form action={rejectArticle}>
						<input type="hidden" name="id" value={article.id} />
						<button
							type="submit"
							className="bg-state-alert hover:bg-state-alert/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all inline-flex items-center gap-2"
						>
							<XCircle className="w-4 h-4" />
							Reject Article
						</button>
					</form>
				)}
			</div>
		</div>
	);
}
