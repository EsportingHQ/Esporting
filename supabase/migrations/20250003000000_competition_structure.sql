-- ============================================================
-- Migration 003: Competition Structure
-- ============================================================
-- Run order: AFTER 002.
-- Depends on: profiles (from 008, BUT profiles will be created
--             in migration 008). To avoid circular dependency,
--             created_by and organiser_id are added as nullable
--             FKs that get enforced via RLS, not DB constraint.
--             We use TEXT reference for now and add FK in 008.
-- What this creates:
--   - comp_series       (the brand: "UI eSports League")
--   - comp_instances    (the edition: "UI eSports League Season 1")
--   - comp_game_titles  (which games are in this comp)
--   - comp_stages       (Group Stage, Quarters, Finals...)
--   - comp_groups       (Group A, Group B...)
-- ============================================================

-- --------------------------------
-- TABLE: comp_series
-- --------------------------------
-- The evergreen brand. Name must be globally unique.
-- Example: "UI eSports League", "FIFA World Cup"

CREATE TABLE comp_series (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT UNIQUE NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  description   TEXT,
  created_by    UUID,   -- FK to profiles added in migration 008
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ   -- soft delete
);

-- --------------------------------
-- TABLE: comp_instances
-- --------------------------------
-- A specific edition/season of a series.
-- slug must be unique within a series (not globally).
-- Example series_id → "UI eSports League"
--         name     → "UI eSports League Season 1 - 2025"
--         edition  → "Season 1"

CREATE TABLE comp_instances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id         UUID NOT NULL REFERENCES comp_series(id),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  edition_label     TEXT,             -- 'Season 1', '2025', 'Spring'
  banner_url        TEXT,
  description       TEXT,
  format            TEXT NOT NULL,
  -- 'league'           → round-robin, standings table
  -- 'knockout'         → bracket, single/double elimination
  -- 'group+knockout'   → group stage then bracket
  -- 'ranking'          → BR-style, points across multiple matches
  status            TEXT NOT NULL DEFAULT 'draft',
  -- 'draft'        → being set up, not visible publicly
  -- 'registration' → teams can register
  -- 'ongoing'      → matches are being played
  -- 'completed'    → all done
  -- 'cancelled'    → called off
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  prize_pool        TEXT,             -- free text: '₦500,000', 'Trophy only'
  organiser_id      UUID,             -- FK to profiles added in migration 008
  created_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  UNIQUE (series_id, slug)
);

-- --------------------------------
-- TABLE: comp_game_titles
-- --------------------------------
-- Which game titles are covered in this competition instance.
-- A single competition can cover multiple games
-- (e.g. UI eSports League covers FC Mobile AND CODM MP AND PUBG BR).

CREATE TABLE comp_game_titles (
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  game_title_id     UUID NOT NULL REFERENCES game_titles(id),
  PRIMARY KEY (comp_instance_id, game_title_id)
);

-- --------------------------------
-- TABLE: comp_stages
-- --------------------------------
-- Ordered stages within a competition.
-- stage_order determines sequence (1 = first, 2 = second, etc.)
-- best_of applies at stage level (can be overridden per match).

CREATE TABLE comp_stages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  game_title_id     UUID REFERENCES game_titles(id),  -- NULL = applies to all games
  name              TEXT NOT NULL,
  -- 'Group Stage', 'Round of 16', 'Quarter Finals',
  -- 'Semi Finals', 'Grand Final', 'Playoffs'
  stage_type        TEXT NOT NULL,
  -- 'league'    → all teams play each other
  -- 'group'     → divided into groups, top N advance
  -- 'knockout'  → lose and you're out
  -- 'ranking'   → BR-style points accumulation
  stage_order       INT NOT NULL,
  best_of           INT NOT NULL DEFAULT 1,
  -- 1 = single match, 3 = BO3, 5 = BO5, up to 15
  starts_at         TIMESTAMPTZ,
  ends_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: comp_groups
-- --------------------------------
-- Optional sub-division within a stage.
-- Only used for group-stage formats.
-- Example: Stage = "Group Stage", Groups = A, B, C, D

CREATE TABLE comp_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id    UUID NOT NULL REFERENCES comp_stages(id),
  name        TEXT NOT NULL,   -- 'Group A', 'Group B', 'Pool 1'
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_comp_instances_series   ON comp_instances(series_id);
CREATE INDEX idx_comp_instances_status   ON comp_instances(status);
CREATE INDEX idx_comp_instances_deleted  ON comp_instances(deleted_at);
CREATE INDEX idx_comp_game_titles_comp   ON comp_game_titles(comp_instance_id);
CREATE INDEX idx_comp_game_titles_game   ON comp_game_titles(game_title_id);
CREATE INDEX idx_comp_stages_instance   ON comp_stages(comp_instance_id);
CREATE INDEX idx_comp_stages_order      ON comp_stages(comp_instance_id, stage_order);
CREATE INDEX idx_comp_groups_stage      ON comp_groups(stage_id);

-- --------------------------------
-- CONSTRAINTS: status flow
-- --------------------------------
ALTER TABLE comp_instances
  ADD CONSTRAINT comp_instances_status_valid
  CHECK (status IN ('draft','registration','ongoing','completed','cancelled'));

ALTER TABLE comp_instances
  ADD CONSTRAINT comp_instances_format_valid
  CHECK (format IN ('league','knockout','group+knockout','ranking'));

ALTER TABLE comp_stages
  ADD CONSTRAINT comp_stages_type_valid
  CHECK (stage_type IN ('league','group','knockout','ranking'));

ALTER TABLE comp_stages
  ADD CONSTRAINT comp_stages_best_of_valid
  CHECK (best_of BETWEEN 1 AND 15);
