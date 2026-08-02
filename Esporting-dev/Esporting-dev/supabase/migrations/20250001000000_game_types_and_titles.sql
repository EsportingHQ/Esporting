-- ============================================================
-- Migration 001: Game Types & Game Titles
-- ============================================================
-- Run order: FIRST. Nothing else depends on anything before this.
-- What this creates:
--   - game_types  (Football, Shooter)
--   - game_titles (FC 26, FC Mobile, eFootball Mobile,
--                  CODM MP, CODM BR, PUBG BR, Free Fire BR)
-- ============================================================

-- --------------------------------
-- TABLE: game_types
-- --------------------------------
-- The top-level category. Either Football or Shooter.
-- Every game title belongs to exactly one type.
-- This drives UI logic (different event types, different scoring).

CREATE TABLE game_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,   -- 'Football' | 'Shooter'
  slug        TEXT UNIQUE NOT NULL,   -- 'football' | 'shooter'
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: game_titles
-- --------------------------------
-- The actual games the platform covers.
-- Each has a type, a unique name, slug, and short code.
-- is_active lets you disable a game without deleting it.

CREATE TABLE game_titles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type_id    INT NOT NULL REFERENCES game_types(id),
  name            TEXT UNIQUE NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  short_code      TEXT UNIQUE NOT NULL,
  cover_image_url TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_game_titles_type     ON game_titles(game_type_id);
CREATE INDEX idx_game_titles_active   ON game_titles(is_active);
CREATE INDEX idx_game_titles_slug     ON game_titles(slug);

-- --------------------------------
-- SEED DATA: game_types
-- --------------------------------
INSERT INTO game_types (name, slug) VALUES
  ('Football', 'football'),
  ('Shooter',  'shooter');

-- --------------------------------
-- SEED DATA: game_titles
-- --------------------------------
-- Football games (game_type_id = 1)
INSERT INTO game_titles (game_type_id, name, slug, short_code) VALUES
  (1, 'FC 26',            'fc-26',           'FC26'),
  (1, 'FC Mobile',        'fc-mobile',       'FCM'),
  (1, 'eFootball Mobile', 'efootball-mobile','EFB');

-- Shooter games (game_type_id = 2)
-- NOTE: CODM is split into two separate titles (MP and BR)
-- because they have completely different scoring, events, and match logic.
INSERT INTO game_titles (game_type_id, name, slug, short_code) VALUES
  (2, 'CODM Multiplayer', 'codm-mp',      'CODM-MP'),
  (2, 'CODM Battle Royale','codm-br',     'CODM-BR'),
  (2, 'PUBG Battle Royale','pubg-br',     'PUBG'),
  (2, 'Free Fire Battle Royale','freefire-br','FF');
