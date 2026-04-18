-- ============================================================
-- Migration 007: Standings & BR Points Configuration
-- ============================================================
-- Run order: AFTER 006.
-- Depends on: comp_stages, comp_groups, game_titles, teams
-- What this creates:
--   - standings           (league table per stage/group/game)
--   - br_points_template  (default BR points config templates)
--   - br_points_config    (per-competition BR points table)
-- ============================================================

-- --------------------------------
-- TABLE: standings
-- --------------------------------
-- Computed league table. Recalculated after every completed match.
-- One row per team per stage per group per game title.
-- score_diff is auto-computed (score_for - score_against).
-- rank is set during the recalculation function.

CREATE TABLE standings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id        UUID NOT NULL REFERENCES comp_stages(id),
  group_id        UUID REFERENCES comp_groups(id),   -- NULL for league/ranking stages
  game_title_id   UUID NOT NULL REFERENCES game_titles(id),
  team_id         UUID NOT NULL REFERENCES teams(id),

  -- Match record
  played          INT NOT NULL DEFAULT 0,
  wins            INT NOT NULL DEFAULT 0,
  draws           INT NOT NULL DEFAULT 0,
  losses          INT NOT NULL DEFAULT 0,

  -- Points (3 for win, 1 for draw, 0 for loss — standard football)
  -- For BR: accumulated placement+kill points across all matches
  points          NUMERIC NOT NULL DEFAULT 0,

  -- Score totals
  score_for       NUMERIC NOT NULL DEFAULT 0,
  score_against   NUMERIC NOT NULL DEFAULT 0,
  score_diff      NUMERIC GENERATED ALWAYS AS (score_for - score_against) STORED,

  -- Current rank in this group/stage (recalculated after each match)
  rank            INT,

  -- Extra data: kills avg, placement avg for BR, etc.
  meta            JSONB DEFAULT '{}',

  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (stage_id, group_id, game_title_id, team_id)
);

-- --------------------------------
-- TABLE: br_points_template
-- --------------------------------
-- Default BR points tables that admins pre-configure.
-- When an organiser creates a BR competition, the template
-- is copied into br_points_config for that competition.
-- is_default: the one that gets auto-applied if organiser doesn't choose.

CREATE TABLE br_points_template (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title_id     UUID NOT NULL REFERENCES game_titles(id),
  name              TEXT NOT NULL,
  -- 'Standard CODM BR', 'Kill-Heavy', 'Standard PUBG BR'
  placement         INT NOT NULL,
  placement_points  NUMERIC NOT NULL,
  kill_points       NUMERIC NOT NULL DEFAULT 1,
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_title_id, name, placement)
);

-- --------------------------------
-- TABLE: br_points_config
-- --------------------------------
-- The actual points table for a specific competition instance.
-- Copied from a template when the competition is created,
-- then the organiser can customise it.

CREATE TABLE br_points_config (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  game_title_id     UUID NOT NULL REFERENCES game_titles(id),
  placement         INT NOT NULL,
  placement_points  NUMERIC NOT NULL,
  kill_points       NUMERIC NOT NULL DEFAULT 1,
  created_by        UUID,    -- FK to profiles added in migration 008
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (comp_instance_id, game_title_id, placement)
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_standings_stage      ON standings(stage_id);
CREATE INDEX idx_standings_group      ON standings(group_id);
CREATE INDEX idx_standings_game       ON standings(game_title_id);
CREATE INDEX idx_standings_team       ON standings(team_id);
CREATE INDEX idx_standings_points     ON standings(stage_id, game_title_id, points DESC);

CREATE INDEX idx_br_template_game     ON br_points_template(game_title_id);
CREATE INDEX idx_br_template_default  ON br_points_template(game_title_id) WHERE is_default = true;

CREATE INDEX idx_br_config_comp       ON br_points_config(comp_instance_id);
CREATE INDEX idx_br_config_game       ON br_points_config(game_title_id);

-- --------------------------------
-- SEED DATA: br_points_template
-- --------------------------------
-- Standard CODM BR (20 teams)
DO $$
DECLARE
  codm_br_id UUID;
  pubg_br_id UUID;
  ff_br_id   UUID;
BEGIN
  SELECT id INTO codm_br_id FROM game_titles WHERE slug = 'codm-br';
  SELECT id INTO pubg_br_id FROM game_titles WHERE slug = 'pubg-br';
  SELECT id INTO ff_br_id   FROM game_titles WHERE slug = 'freefire-br';

  -- ── Standard CODM BR ──────────────────────────────────────
  INSERT INTO br_points_template (game_title_id, name, placement, placement_points, kill_points, is_default)
  VALUES
    (codm_br_id, 'Standard CODM BR', 1,  15, 1, true),
    (codm_br_id, 'Standard CODM BR', 2,  12, 1, true),
    (codm_br_id, 'Standard CODM BR', 3,  10, 1, true),
    (codm_br_id, 'Standard CODM BR', 4,   8, 1, true),
    (codm_br_id, 'Standard CODM BR', 5,   6, 1, true),
    (codm_br_id, 'Standard CODM BR', 6,   4, 1, true),
    (codm_br_id, 'Standard CODM BR', 7,   4, 1, true),
    (codm_br_id, 'Standard CODM BR', 8,   4, 1, true),
    (codm_br_id, 'Standard CODM BR', 9,   4, 1, true),
    (codm_br_id, 'Standard CODM BR', 10,  4, 1, true),
    (codm_br_id, 'Standard CODM BR', 11,  2, 1, true),
    (codm_br_id, 'Standard CODM BR', 12,  2, 1, true),
    (codm_br_id, 'Standard CODM BR', 13,  2, 1, true),
    (codm_br_id, 'Standard CODM BR', 14,  2, 1, true),
    (codm_br_id, 'Standard CODM BR', 15,  2, 1, true),
    (codm_br_id, 'Standard CODM BR', 16,  0, 1, true),
    (codm_br_id, 'Standard CODM BR', 17,  0, 1, true),
    (codm_br_id, 'Standard CODM BR', 18,  0, 1, true),
    (codm_br_id, 'Standard CODM BR', 19,  0, 1, true),
    (codm_br_id, 'Standard CODM BR', 20,  0, 1, true);

  -- ── Standard PUBG BR ──────────────────────────────────────
  INSERT INTO br_points_template (game_title_id, name, placement, placement_points, kill_points, is_default)
  VALUES
    (pubg_br_id, 'Standard PUBG BR', 1,  10, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 2,   6, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 3,   5, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 4,   4, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 5,   3, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 6,   2, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 7,   2, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 8,   2, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 9,   1, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 10,  1, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 11,  0, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 12,  0, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 13,  0, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 14,  0, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 15,  0, 1, true),
    (pubg_br_id, 'Standard PUBG BR', 16,  0, 1, true);

  -- ── Standard Free Fire BR ─────────────────────────────────
  INSERT INTO br_points_template (game_title_id, name, placement, placement_points, kill_points, is_default)
  VALUES
    (ff_br_id, 'Standard Free Fire BR', 1,  12, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 2,   9, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 3,   7, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 4,   5, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 5,   4, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 6,   3, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 7,   3, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 8,   3, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 9,   2, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 10,  2, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 11,  1, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 12,  1, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 13,  0, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 14,  0, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 15,  0, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 16,  0, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 17,  0, 1, true),
    (ff_br_id, 'Standard Free Fire BR', 18,  0, 1, true);

END $$;
