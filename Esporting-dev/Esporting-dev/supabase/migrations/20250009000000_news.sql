-- ============================================================
-- Migration 009: News
-- ============================================================
-- Run order: AFTER 008.
-- Depends on: profiles, comp_instances, game_titles
-- What this creates:
--   - news_articles
--   - news_tags
--   - news_article_tags
-- ============================================================

-- --------------------------------
-- TABLE: news_articles
-- --------------------------------
CREATE TABLE news_articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  body              TEXT NOT NULL,        -- markdown content
  excerpt           TEXT,                 -- short summary for article cards
  cover_url         TEXT,
  author_id         UUID NOT NULL REFERENCES profiles(id),
  status            TEXT NOT NULL DEFAULT 'draft',
  -- 'draft'       → only visible to author/admin
  -- 'published'   → publicly visible
  -- 'archived'    → hidden from public but not deleted
  published_at      TIMESTAMPTZ,          -- set when status → published
  -- Optional links to related content
  comp_instance_id  UUID REFERENCES comp_instances(id),
  game_title_id     UUID REFERENCES game_titles(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- --------------------------------
-- TABLE: news_tags
-- --------------------------------
CREATE TABLE news_tags (
  id    SERIAL PRIMARY KEY,
  name  TEXT UNIQUE NOT NULL,   -- 'CODM', 'Tournament Recap', 'Transfer News'
  slug  TEXT UNIQUE NOT NULL
);

-- --------------------------------
-- TABLE: news_article_tags
-- --------------------------------
CREATE TABLE news_article_tags (
  article_id  UUID NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id      INT  NOT NULL REFERENCES news_tags(id),
  PRIMARY KEY (article_id, tag_id)
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_articles_status     ON news_articles(status);
CREATE INDEX idx_articles_author     ON news_articles(author_id);
CREATE INDEX idx_articles_comp       ON news_articles(comp_instance_id);
CREATE INDEX idx_articles_game       ON news_articles(game_title_id);
CREATE INDEX idx_articles_published  ON news_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_articles_slug       ON news_articles(slug);
CREATE INDEX idx_article_tags_art    ON news_article_tags(article_id);
CREATE INDEX idx_article_tags_tag    ON news_article_tags(tag_id);

-- --------------------------------
-- CONSTRAINTS
-- --------------------------------
ALTER TABLE news_articles
  ADD CONSTRAINT articles_status_valid
  CHECK (status IN ('draft', 'published', 'archived'));

-- --------------------------------
-- SEED DATA: news_tags
-- --------------------------------
INSERT INTO news_tags (name, slug) VALUES
  ('Tournament Recap',  'tournament-recap'),
  ('Match Preview',     'match-preview'),
  ('Transfer News',     'transfer-news'),
  ('CODM',              'codm'),
  ('FC 26',             'fc-26'),
  ('FC Mobile',         'fc-mobile'),
  ('eFootball',         'efootball'),
  ('PUBG',              'pubg'),
  ('Free Fire',         'free-fire'),
  ('Announcement',      'announcement'),
  ('Rankings',          'rankings');
