import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
	FileText,
	Clock,
	CheckCircle2,
	AlertCircle,
	Globe,
	User,
} from 'lucide-react';
import { SelectAllCheckbox } from '@/components/admin/select-all-checkbox';

type ArticleRow = {
	id: string;
	title: string;
	status: string;
	source_type: string;
	source_name: string | null;
	updated_at: string;
	published_at: string | null;
	comp_instances: { name: string } | { name: string }[] | null;
};

function getCompetitionName(
	comp: { name: string } | { name: string }[] | null,
): string {
	if (!comp) return 'General';
	return Array.isArray(comp) ? (comp[0]?.name ?? 'General') : comp.name;
}

function statusStyles(status: string) {
	switch (status) {
		case 'published':
			return 'bg-state-win/10 text-state-win border border-state-win/30';
		case 'pending_review':
			return 'bg-accent-readout/10 text-accent-readout border border-accent-readout/30';
		case 'rejected':
			return 'bg-state-alert/10 text-state-alert border border-state-alert/30';
		case 'archived':
			return 'bg-bg-void text-text-muted border border-border-line';
		default:
			return 'bg-bg-void text-text-muted border border-border-line';
	}
}

function sourceBadge(type: string) {
	switch (type) {
		case 'external':
			return 'bg-blue-500/10 text-blue-400 border border-blue-400/30';
		case 'organiser':
			return 'bg-accent-readout/10 text-accent-readout border border-accent-readout/30';
		default:
			return 'bg-bg-void text-text-muted border border-border-line';
	}
}

async function bulkPublishArticles(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const ids = formData.getAll('article_ids').map(String);

	if (ids.length === 0) return;

	const { error } = await supabase
		.from('news_articles')
		.update({
			status: 'published',
			published_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		})
		.in('id', ids);

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

async function bulkArchiveArticles(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const ids = formData.getAll('article_ids').map(String);

	if (ids.length === 0) return;

	const { error } = await supabase
		.from('news_articles')
		.update({
			status: 'archived',
			updated_at: new Date().toISOString(),
		})
		.in('id', ids);

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

export default async function AdminNewsPage() {
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

	const { data: articles } = await supabase
		.from('news_articles')
		.select(
			`
				id,
				title,
				status,
				source_type,
				source_name,
				updated_at,
				published_at,
				comp_instances(name)
			`,
		)
		.is('deleted_at', null)
		.order('updated_at', { ascending: false });

	const rows = (articles ?? []) as unknown as ArticleRow[];

	const reviewRows = rows.filter(
		(a) => a.source_type === 'external' && a.status === 'pending_review',
	);

	const archivedRows = rows.filter((a) => a.status === 'archived');

	return (
		<div className="space-y-6 font-body">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
						News Review Queue
					</h2>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						EDITORIAL MODERATION & PUBLICATION DESK
					</p>
				</div>

				<Link
					href="/admin/news/new"
					className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all inline-flex items-center gap-2"
				>
					<FileText className="w-4 h-4" />
					New Article
				</Link>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-5 gap-4">
				<div className="bg-bg-surface border border-border-line rounded p-4">
					<p className="text-[10px] font-display uppercase text-text-muted">
						Pending Review
					</p>
					<p className="text-2xl font-data font-black text-text-primary">
						{
							rows.filter((a) => a.status === 'pending_review')
								.length
						}
					</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-4">
					<p className="text-[10px] font-display uppercase text-text-muted">
						Published
					</p>
					<p className="text-2xl font-data font-black text-text-primary">
						{rows.filter((a) => a.status === 'published').length}
					</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-4">
					<p className="text-[10px] font-display uppercase text-text-muted">
						Organiser Drafts
					</p>
					<p className="text-2xl font-data font-black text-text-primary">
						{
							rows.filter((a) => a.source_type === 'organiser')
								.length
						}
					</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-4">
					<p className="text-[10px] font-display uppercase text-text-muted">
						External Imports
					</p>
					<p className="text-2xl font-data font-black text-text-primary">
						{
							rows.filter((a) => a.source_type === 'external')
								.length
						}
					</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-4">
					<p className="text-[10px] font-display uppercase text-text-muted">
						Archived Imports
					</p>
					<p className="text-2xl font-data font-black text-text-primary">
						{rows.filter((a) => a.status === 'archived').length}
					</p>
				</div>
			</div>

			<div className="space-y-3">
				<form className="space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3 bg-bg-surface border border-border-line rounded p-4">
						<div className="flex items-center gap-3">
							<SelectAllCheckbox />
							<p className="text-xs font-data text-text-muted">
								Select all visible articles
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								formAction={bulkPublishArticles}
								className="bg-state-win hover:bg-state-win/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-4 py-2 rounded transition-all"
							>
								Publish Selected
							</button>

							<button
								formAction={bulkArchiveArticles}
								className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-black text-xs uppercase tracking-wider px-4 py-2 rounded transition-all"
							>
								Archive Selected
							</button>
						</div>
					</div>

					{reviewRows.map((article) => (
						<div
							key={article.id}
							className="bg-bg-surface border border-border-line rounded p-5 flex items-start justify-between gap-4"
						>
							<div className="pt-1">
								<input
									type="checkbox"
									name="article_ids"
									value={article.id}
									className="h-4 w-4 rounded border-border-line bg-bg-void text-accent-readout focus:ring-accent-readout"
									aria-label={`Select ${article.title}`}
								/>
							</div>

							<div className="flex-1 space-y-2 min-w-0">
								<div className="flex items-center gap-2">
									<FileText className="w-4 h-4 text-accent-readout shrink-0" />
									<h3 className="font-display font-black text-base text-text-primary uppercase tracking-wide truncate">
										{article.title}
									</h3>
								</div>

								<div className="flex flex-wrap items-center gap-2 text-xs font-data text-text-muted">
									<span>
										{getCompetitionName(
											article.comp_instances,
										)}
									</span>

									<span
										className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${statusStyles(article.status)}`}
									>
										{article.status.replace('_', ' ')}
									</span>

									<span
										className={`px-2 py-0.5 rounded-full text-[10px] font-display font-bold uppercase tracking-wider ${sourceBadge(article.source_type)}`}
									>
										{article.source_type}
									</span>

									{article.source_name && (
										<span className="flex items-center gap-1">
											<Globe className="w-3 h-3" />
											{article.source_name}
										</span>
									)}

									{article.source_type === 'organiser' && (
										<span className="flex items-center gap-1">
											<User className="w-3 h-3" />
											Organiser submission
										</span>
									)}

									{article.source_type === 'external' && (
										<span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase">
											Imported · {article.source_name}
										</span>
									)}

									<span className="flex items-center gap-1">
										<Clock className="w-3 h-3" />
										{new Date(
											article.updated_at,
										).toLocaleDateString()}
									</span>

									{article.published_at && (
										<span className="flex items-center gap-1 text-state-win">
											<CheckCircle2 className="w-3 h-3" />
											Published
										</span>
									)}

									{article.status === 'rejected' && (
										<span className="flex items-center gap-1 text-state-alert">
											<AlertCircle className="w-3 h-3" />
											Rejected
										</span>
									)}
								</div>
							</div>

							<Link
								href={`/admin/news/${article.id}`}
								className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all whitespace-nowrap"
							>
								Review
							</Link>
						</div>
					))}
				</form>
			</div>

			<div className="pt-8 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="font-display font-black text-lg uppercase tracking-wide text-text-primary">
						Archived Imports
					</h3>

					<span className="text-xs text-text-muted font-data">
						{archivedRows.length} archived
					</span>
				</div>

				{archivedRows.length === 0 ? (
					<div className="bg-bg-surface border border-border-line rounded p-6 text-sm text-text-muted">
						No archived imported articles.
					</div>
				) : (
					archivedRows.map((article) => (
						<div
							key={article.id}
							className="bg-bg-surface border border-border-line rounded p-5 flex items-start justify-between gap-4 opacity-80"
						>
							<div className="space-y-2 min-w-0">
								<h4 className="font-display font-black text-base text-text-primary uppercase tracking-wide truncate">
									{article.title}
								</h4>

								<div className="flex flex-wrap items-center gap-2 text-xs font-data text-text-muted">
									<span className="px-2 py-0.5 rounded-full bg-bg-void border border-border-line uppercase tracking-wider">
										archived
									</span>

									{article.source_name && (
										<span className="flex items-center gap-1">
											<Globe className="w-3 h-3" />
											{article.source_name}
										</span>
									)}

									<span className="flex items-center gap-1">
										<Clock className="w-3 h-3" />
										{new Date(
											article.updated_at,
										).toLocaleDateString()}
									</span>
								</div>
							</div>

							<Link
								href={`/admin/news/${article.id}`}
								className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all whitespace-nowrap"
							>
								View
							</Link>
						</div>
					))
				)}
			</div>
		</div>
	);
}
