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

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
			</div>

			<div className="space-y-3">
				{rows.map((article) => (
					<div
						key={article.id}
						className="bg-bg-surface border border-border-line rounded p-5 flex items-start justify-between gap-4"
					>
						<div className="space-y-2 min-w-0">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-accent-readout shrink-0" />
								<h3 className="font-display font-black text-base text-text-primary uppercase tracking-wide truncate">
									{article.title}
								</h3>
							</div>

							<div className="flex flex-wrap items-center gap-2 text-xs font-data text-text-muted">
								<span>
									{getCompetitionName(article.comp_instances)}
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
			</div>
		</div>
	);
}
