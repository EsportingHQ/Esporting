import { createClient } from 'jsr:@supabase/supabase-js@2'
/// <reference lib="deno.ns" />

type FeedConfig = {
  name: string
  url: string
}

type ParsedItem = {
  title: string
  link: string
  description: string
  publishedAt: string | null
}

const FEEDS: FeedConfig[] = [
  {
    name: 'Esports Insider',
    url: 'https://esportsinsider.com/feed',
  },
  {
    name: 'Dot Esports',
    url: 'https://dotesports.com/feed',
  },
  {
    name: 'Dexerto Esports',
    url: 'https://www.dexerto.com/feed/category/esports/',
  },
]

const SYSTEM_AUTHOR_ID = '7670ab52-a1cd-4436-bc05-bf26ae806f28'

function stripHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .trim()
}

function extractTag(block: string, tag: string): string {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'),
  )
  return match?.[1]?.trim() ?? ''
}

function parseItems(xml: string): ParsedItem[] {
  const items: ParsedItem[] = []

  // RSS feeds
  const rssMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []

  for (const item of rssMatches) {
    items.push({
      title: stripHtml(extractTag(item, 'title')),
      link: stripHtml(extractTag(item, 'link')),
      description: stripHtml(
        extractTag(item, 'description') ||
          extractTag(item, 'content:encoded'),
      ).slice(0, 240),
      publishedAt: extractTag(item, 'pubDate') || null,
    })
  }

  // Atom feeds
  const atomMatches = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []

  for (const entry of atomMatches) {
    const hrefMatch = entry.match(/href="([^"]+)"/i)

    items.push({
      title: stripHtml(extractTag(entry, 'title')),
      link: hrefMatch?.[1] ?? '',
      description: stripHtml(
        extractTag(entry, 'summary') || extractTag(entry, 'content'),
      ).slice(0, 240),
      publishedAt:
        extractTag(entry, 'published') ||
        extractTag(entry, 'updated') ||
        null,
    })
  }

  return items.filter((item) => item.title.length > 0 && item.link.length > 0)
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180)
}

const GAME_KEYWORDS: Record<string, string[]> = {
  valorant: ['valorant', 'vct', 'game changers'],
  cs2: ['counter-strike', 'cs2', 'cs:go'],
  'rainbow-six-siege': ['rainbow six siege', 'r6', 'siege'],
  'codm-mp': ['call of duty', 'black ops', 'multiplayer'],
  'codm-br': ['warzone', 'battle royale'],
  'pubg-br': ['pubg mobile', 'pubg'],
  'freefire-br': ['free fire'],
};

function detectGameSlug(title: string, body: string): string | null {
  const text = `${title} ${body}`.toLowerCase()

  for (const [slug, keywords] of Object.entries(GAME_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k))) return slug
  }

  return null
}

async function fetchArticleContent(url: string): Promise<{
  body: string
  coverUrl: string | null
}> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'EsportingHQ-NewsBot/1.0',
      },
    })

    const html = await response.text()

    // Hero image from Open Graph
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      null

    // Prefer article content
    const articleMatch =
        html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ??
        html.match(/class=["'][^"']*article-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ??
        html.match(/class=["'][^"']*entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ??
        html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)

    const source = articleMatch?.[1] ?? ''

    // Remove scripts, styles, and noisy metadata blocks first
    const cleaned = source
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
        .replace(/Published FR:[\s\S]*?(?=<p|$)/i, '')
        .replace(/Updated FR:[\s\S]*?(?=<p|$)/i, '')

    const paragraphs = Array.from(
        cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
    )
        .map((m) => stripHtml(m[1]))
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 80)
        .filter((p) => !p.includes('document.getElementById'))
        .filter((p) => !p.includes('function ()'))
        .filter((p) => !p.includes('window.'))
        .filter((p) => !p.includes('cookie'))
        .slice(0, 20)

    return {
        body: paragraphs.join('\n\n'),
        coverUrl: ogImage,
    }
  } catch {
    return { body: '', coverUrl: null }
  }
}

Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
    const refreshExisting = body.refreshExisting === true;
    const limitPerFeed = Number(body.limitPerFeed ?? 10);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const results: { feed: string; inserted: number; skipped: number }[] = []

  for (const feed of FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'EsportingHQ-NewsBot/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9,*/*;q=0.8',
        },
      })
      const xml = await response.text()

      console.log(feed.name, 'status', response.status)
      console.log(feed.name, 'preview', xml.slice(0, 200))

      const items = parseItems(xml)

      console.log(feed.name, 'first item', items[0])

      console.log(feed.name, 'items found', items.length)

      let inserted = 0
      let skipped = 0

      for (const item of items.slice(0, limitPerFeed)) {
        const { data: existing } = await supabase
            .from('news_articles')
            .select('id, body, cover_url, game_title_id')
            .eq('source_url', item.link)
            .maybeSingle()

        if (existing && !refreshExisting) {
            skipped++
            continue
        }

        // Fetch full article first
        const article = await fetchArticleContent(item.link)

        // Auto-detect game from title + full body
        const gameSlug = detectGameSlug(
            item.title,
            article.body || item.description,
        )

        let gameTitleId: string | null = null

        if (gameSlug) {
            const { data: game } = await supabase
                .from('game_titles')
                .select('id')
                .eq('slug', gameSlug)
                .maybeSingle()

            gameTitleId = game?.id ?? null
        }

        const payload = {
            title: item.title,
            excerpt: item.description,
            body: article.body || item.description,
            cover_url: article.coverUrl,
            source_type: 'external',
            source_name: feed.name,
            source_url: item.link,
            source_published_at: item.publishedAt,
            ingested_at: new Date().toISOString(),
            game_title_id: gameTitleId,
        }

        let error: { message: string } | null = null

        if (existing && refreshExisting) {
        const result = await supabase
            .from('news_articles')
            .update({
            ...payload,
            updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)

        error = result.error
        } else {
        const slug = `${slugify(item.title)}-${crypto.randomUUID().slice(0, 8)}`

        const result = await supabase.from('news_articles').insert({
            ...payload,
            slug,
            author_id: SYSTEM_AUTHOR_ID,
            status: 'pending_review',
        })

        error = result.error
        }

        if (error) {
        console.error('Upsert failed', feed.name, item.title, error.message)
        } else {
        inserted++
        }
      }

      results.push({ feed: feed.name, inserted, skipped })
    } catch (error) {
      console.error('Feed failed', feed.name, error)
      results.push({ feed: feed.name, inserted: 0, skipped: 0 })
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})