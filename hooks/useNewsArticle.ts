'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface NewsArticleDetail {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  published_at: string | null;
  authorName: string;
  tag: string;
}

export function useNewsArticle(slug: string) {
  const [article, setArticle] = useState<NewsArticleDetail | null>(null);
  const [related, setRelated] = useState<NewsArticleDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('news_articles')
          .select(
            'id, title, slug, body, excerpt, published_at, profiles!news_articles_author_id_fkey(username, display_name)'
          )
          .eq('slug', slug)
          .eq('status', 'published')
          .is('deleted_at', null)
          .single();

        if (error || !data) {
          setNotFound(true);
          return;
        }

        const profile = Array.isArray(data.profiles)
          ? data.profiles[0]
          : data.profiles;

        setArticle({
          id: data.id,
          title: data.title,
          slug: data.slug,
          body: data.body,
          excerpt: data.excerpt,
          published_at: data.published_at,
          authorName: profile?.display_name ?? profile?.username ?? 'Broadcast Desk',
          tag: 'NEWS',
        });

        const { data: relatedRows } = await supabase
          .from('news_articles')
          .select('id, title, slug, body, excerpt, published_at')
          .eq('status', 'published')
          .is('deleted_at', null)
          .neq('slug', slug)
          .order('published_at', { ascending: false })
          .limit(3);

        setRelated(
          (relatedRows ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            slug: r.slug,
            body: r.body ?? '',
            excerpt: r.excerpt,
            published_at: r.published_at,
            authorName: '',
            tag: 'NEWS',
          }))
        );
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [slug]);

  return { article, related, isLoading, notFound, error };
}