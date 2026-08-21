import Link from "next/link";
import { PublicNav } from "@/components/layout/public-nav";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Calendar, User, ArrowLeft } from "lucide-react";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  published_at: string | null;
  source_type: string | null;
  profiles:
    { display_name: string | null } | { display_name: string | null }[] | null;
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
    .from("news_articles")
    .select(
      "id, title, slug, body, excerpt, published_at, source_type, profiles(display_name), comp_instances(name), game_titles(name)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error || !data) notFound();

  const article = data as ArticleRow;

  const authorName =
    first(article.profiles)?.display_name ?? "EsportingHQ Editorial";
  const competition = first(article.comp_instances)?.name ?? null;
  const game = first(article.game_titles)?.name ?? null;

  const { data: relatedData } = await supabase
    .from("news_articles")
    .select("id, title, slug")
    .eq("status", "published")
    .is("deleted_at", null)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return (
    <div className="flex-1 flex flex-col bg-bg-void text-text-primary">
      <PublicNav />

      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        <Link
          href="/news"
          className="inline-flex items-center gap-1.5 text-xs font-display font-bold text-accent-readout hover:underline uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO BULLETIN DESK</span>
        </Link>

        <article className="bg-bg-surface border border-border-line rounded p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {competition && (
                <span className="px-2 py-0.5 bg-accent-readout/10 border border-accent-readout/30 text-[9px] font-display font-bold text-accent-readout tracking-wider uppercase rounded-sm">
                  {competition}
                </span>
              )}

              {game && (
                <span className="px-2 py-0.5 bg-bg-void border border-border-line text-[9px] font-display font-bold text-text-muted tracking-wider uppercase rounded-sm">
                  {game}
                </span>
              )}
            </div>

            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-wide uppercase leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-data text-text-muted border-t border-border-line pt-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString()
                    : "Draft"}
                </span>
              </span>

              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>By {authorName}</span>
              </span>
            </div>
          </div>

          <div className="text-sm font-body text-text-primary leading-relaxed space-y-4 whitespace-pre-wrap pt-2">
            {article.body}
          </div>
        </article>

        <section className="space-y-4">
          <h3 className="font-display font-black text-sm uppercase tracking-wider text-text-muted">
            RELATED BROADCASTS
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(relatedData ?? []).map((post) => (
              <Link key={post.id} href={`/news/${post.slug}`} className="block">
                <div className="bg-bg-surface border border-border-line hover:border-accent-readout/30 rounded p-4 h-full flex flex-col justify-between transition-all">
                  <div className="space-y-2">
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
