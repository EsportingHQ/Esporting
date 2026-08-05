'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface NewsArticleListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  tag: string;
  image_url: string | null;
}

export function useNewsArticles() {
  const [articles, setArticles] = useState<NewsArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      try {
        setIsLoading(true);

        const { data, error } = await supabase
          .from('news_articles')
          .select('id, title, slug, excerpt, cover_url, published_at')
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('published_at', { ascending: false });

        if (error) throw error;

        setArticles(
          (data ?? []).map((a) => ({
            id: a.id,
            title: a.title,
            slug: a.slug,
            excerpt: a.excerpt,
            published_at: a.published_at,
            tag: 'NEWS',
            image_url: a.cover_url,
          }))
        );
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { articles, isLoading, error };
}