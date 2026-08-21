import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function updateArticle(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id"));

  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const compInstanceId = String(formData.get("comp_instance_id") ?? "") || null;
  const gameTitleId = String(formData.get("game_title_id") ?? "") || null;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const { error } = await supabase
    .from("news_articles")
    .update({
      title,
      slug,
      excerpt,
      body,
      comp_instance_id: compInstanceId,
      game_title_id: gameTitleId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);

  redirect("/organiser/news");
}

async function submitForReview(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("news_articles")
    .update({
      status: "pending_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);

  redirect("/organiser/news");
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: roleData } = await supabase
    .from("user_role_assignments")
    .select("roles(name)")
    .eq("user_id", user.id)
    .is("revoked_at", null);

  const roles =
    (roleData as { roles: { name: string } }[] | null)?.map(
      (r) => r.roles?.name,
    ) ?? [];

  const isAdmin = roles.includes("super_admin");
  const isOrganiser = roles.includes("organiser");

  if (!isAdmin && !isOrganiser) redirect("/dashboard-redirect");

  const { data: article } = await supabase
    .from("news_articles")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!article) notFound();

  if (!isAdmin && article.author_id !== user.id) {
    redirect("/organiser/news");
  }

  const { data: competitions } = await supabase
    .from("comp_instances")
    .select("id, name")
    .eq("organiser_id", user.id)
    .is("deleted_at", null)
    .order("name");

  const { data: gameTitles } = await supabase
    .from("game_titles")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="max-w-3xl space-y-6 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-2xl tracking-wider text-text-primary uppercase">
            Edit Article
          </h2>
          <p className="text-xs text-text-muted font-data mt-1 uppercase">
            STATUS: {article.status.replace("_", " ")}
          </p>
        </div>

        <Link
          href="/organiser/news"
          className="border border-border-line hover:border-accent-readout/40 text-text-primary hover:text-accent-readout font-display font-bold text-xs uppercase tracking-wider px-3 py-2 rounded transition-all"
        >
          Back
        </Link>
      </div>

      <form action={updateArticle} className="space-y-5">
        <input type="hidden" name="id" value={article.id} />

        <div className="bg-bg-surface border border-border-line rounded p-5 space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
              Title
            </label>
            <input
              name="title"
              required
              defaultValue={article.title}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
              Excerpt
            </label>
            <textarea
              name="excerpt"
              rows={3}
              defaultValue={article.excerpt ?? ""}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-text-muted">
                Competition
              </label>
              <select
                name="comp_instance_id"
                defaultValue={article.comp_instance_id ?? ""}
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
                name="game_title_id"
                defaultValue={article.game_title_id ?? ""}
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
              name="body"
              required
              rows={14}
              defaultValue={article.body}
              className="w-full bg-bg-void border border-border-line rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-readout"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="bg-accent-readout hover:bg-accent-readout/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all"
          >
            Save Draft
          </button>
        </div>
      </form>

      {article.status !== "published" && (
        <form action={submitForReview}>
          <input type="hidden" name="id" value={article.id} />
          <button
            type="submit"
            className="bg-state-win hover:bg-state-win/80 text-bg-void font-display font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded transition-all"
          >
            Submit for Review
          </button>
        </form>
      )}
    </div>
  );
}
