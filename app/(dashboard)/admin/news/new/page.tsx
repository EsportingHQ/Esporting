import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function saveDraft(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');

	const title = String(formData.get('title') ?? '').trim();
	const excerpt = String(formData.get('excerpt') ?? '').trim();
	const body = String(formData.get('body') ?? '').trim();
	const compInstanceId =
		String(formData.get('comp_instance_id') ?? '') || null;
	const gameTitleId = String(formData.get('game_title_id') ?? '') || null;

	if (!title || !body) throw new Error('Title and body are required');

	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const { error } = await supabase.from('news_articles').insert({
		title,
		slug,
		excerpt,
		body,
		comp_instance_id: compInstanceId,
		game_title_id: gameTitleId,
		author_id: user.id,
		source_type: 'admin',
		status: 'draft',
	});

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

async function publishNow(formData: FormData) {
	'use server';

	const cookieStore = await cookies();
	const supabase = createClient(cookieStore);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) redirect('/login');

	const title = String(formData.get('title') ?? '').trim();
	const excerpt = String(formData.get('excerpt') ?? '').trim();
	const body = String(formData.get('body') ?? '').trim();
	const compInstanceId =
		String(formData.get('comp_instance_id') ?? '') || null;
	const gameTitleId = String(formData.get('game_title_id') ?? '') || null;

	if (!title || !body) throw new Error('Title and body are required');

	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const now = new Date().toISOString();

	const { error } = await supabase.from('news_articles').insert({
		title,
		slug,
		excerpt,
		body,
		comp_instance_id: compInstanceId,
		game_title_id: gameTitleId,
		author_id: user.id,
		source_type: 'admin',
		status: 'published',
		published_at: now,
	});

	if (error) throw new Error(error.message);

	redirect('/admin/news');
}

export default async function AdminNewArticlePage() {
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

	const { data: competitions } = await supabase
		.from('comp_instances')
		.select('id, name')
		.is('deleted_at', null)
		.order('name');

	const { data: gameTitles } = await supabase
		.from('game_titles')
		.select('id, name')
		.eq('is_active', true)
		.order('name');

	return (
		<div className="max-w-3xl space-y-6 font-body">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
						New Official Article
					</h2>
					<p className="text-xs text-text-muted font-data mt-1 uppercase">
						ADMIN EDITORIAL PUBLISHING DESK
					</p>
				</div>

				<Link
					href="/admin/news"
					className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all"
				>
					Back
				</Link>
			</div>

			<div className="bg-bg-surface border border-border-line rounded p-5 space-y-5">
				<div className="space-y-2">
					<label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
						Title
					</label>
					<input
						form="publish-form"
						name="title"
						required
						className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
					/>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
						Excerpt
					</label>
					<textarea
						form="publish-form"
						name="excerpt"
						rows={3}
						className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
					/>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
							Competition
						</label>
						<select
							form="publish-form"
							name="comp_instance_id"
							className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
						>
							<option value="">General news</option>
							{(competitions ?? []).map((comp) => (
								<option key={comp.id} value={comp.id}>
									{comp.name}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-2">
						<label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
							Game Title
						</label>
						<select
							form="publish-form"
							name="game_title_id"
							className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
						>
							<option value="">Any game</option>
							{(gameTitles ?? []).map((game) => (
								<option key={game.id} value={game.id}>
									{game.name}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
						Article Body
					</label>
					<textarea
						form="publish-form"
						name="body"
						required
						rows={14}
						className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
					/>
				</div>
			</div>

			<form
				id="publish-form"
				className="flex flex-wrap items-center gap-3"
			>
				<button
					formAction={saveDraft}
					className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded transition-all"
				>
					Save Draft
				</button>

				<button
					formAction={publishNow}
					className="bg-state-win hover:bg-state-win/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all"
				>
					Publish Now
				</button>
			</form>
		</div>
	);
}
