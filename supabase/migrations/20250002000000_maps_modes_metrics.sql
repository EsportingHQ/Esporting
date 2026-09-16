-- ============================================================
-- Migration 002: Maps, Modes, Map-Mode Links & Scoring Metrics
-- ============================================================
-- Run order: AFTER 001.
-- Depends on: game_titles
-- What this creates:
--   - maps            (game maps, e.g. Nuketown, Erangel)
--   - modes           (game modes, e.g. Hardpoint, S&D, Frontline)
--   - map_mode_links  (which maps are valid for which modes)
--   - scoring_metrics (how each game/mode is scored)
-- ============================================================

-- --------------------------------
-- TABLE: maps
-- --------------------------------
-- A map belongs to one game title.
-- is_approved: false = suggested by organiser, pending admin review.
-- is_active: soft disable without deleting.

CREATE TABLE maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title_id   UUID NOT NULL REFERENCES game_titles(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  image_url       TEXT,
  is_active       BOOLEAN DEFAULT true,
  is_approved     BOOLEAN DEFAULT true,  -- false = organiser suggestion, pending admin
  added_by        UUID,  -- FK to profiles added in migration 008
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_title_id, slug)
);

-- --------------------------------
-- TABLE: modes
-- --------------------------------
-- A mode belongs to one game title.
-- metric_type drives how the score is recorded and displayed.
-- win_condition tells the system how to determine the map winner.

CREATE TABLE modes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title_id   UUID NOT NULL REFERENCES game_titles(id),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  metric_type     TEXT NOT NULL,
  -- 'goals'      → Football games
  -- 'points'     → Hardpoint, Domination, Control, S&D (score-based shooter modes)
  -- 'kills'      → Frontline, TDM, Kill Confirmed, Cranked, Deathmatch
  -- 'rounds'     → Search & Destroy (first to X rounds wins)
  -- 'placement'  → BR games (no live score, results only)
  unit_label      TEXT NOT NULL,
  -- 'goals', 'pts', 'kills', 'rounds'
  win_condition   TEXT NOT NULL,
  -- 'highest_score' | 'most_kills' | 'most_rounds_won' | 'placement_table'
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_title_id, slug)
);

-- --------------------------------
-- TABLE: map_mode_links
-- --------------------------------
-- Many-to-many: which maps can be played in which modes.
-- This lets the contributor dropdown only show valid map/mode combos.

CREATE TABLE map_mode_links (
  map_id  UUID NOT NULL REFERENCES maps(id),
  mode_id UUID NOT NULL REFERENCES modes(id),
  PRIMARY KEY (map_id, mode_id)
);

-- --------------------------------
-- TABLE: scoring_metrics
-- --------------------------------
-- Game-level default scoring config.
-- For CODM MP: metric resolves at mode level (modes.metric_type).
-- For Football and BR: this table is the source of truth.

CREATE TABLE scoring_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title_id   UUID NOT NULL REFERENCES game_titles(id) UNIQUE,
  metric_type     TEXT NOT NULL,
  unit_label      TEXT NOT NULL,
  win_condition   TEXT NOT NULL,
  allows_draw     BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_maps_game_title   ON maps(game_title_id);
CREATE INDEX idx_maps_approved     ON maps(is_approved);
CREATE INDEX idx_modes_game_title  ON modes(game_title_id);
CREATE INDEX idx_map_mode_map      ON map_mode_links(map_id);
CREATE INDEX idx_map_mode_mode     ON map_mode_links(mode_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- --------------------------------
-- SEED: scoring_metrics
-- --------------------------------
-- We reference game_titles by slug for clarity and safety.

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'goals', 'goals', 'highest_score', true,
       'Standard football scoring. Draw allowed in group stage.'
FROM game_titles WHERE slug = 'fc-26';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'goals', 'goals', 'highest_score', true,
       'Standard football scoring. Draw allowed in group stage.'
FROM game_titles WHERE slug = 'fc-mobile';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'goals', 'goals', 'highest_score', true,
       'Standard football scoring. Draw allowed in group stage.'
FROM game_titles WHERE slug = 'efootball-mobile';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'points', 'pts', 'highest_score', false,
       'CODM MP: metric_type resolves at mode level. This is a fallback default.'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'placement', 'pts', 'placement_table', false,
       'BR: no live score. Final results posted as placement table after match.'
FROM game_titles WHERE slug = 'codm-br';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'placement', 'pts', 'placement_table', false,
       'BR: no live score. Final results posted as placement table after match.'
FROM game_titles WHERE slug = 'pubg-br';

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'placement', 'pts', 'placement_table', false,
       'BR: no live score. Final results posted as placement table after match.'
FROM game_titles WHERE slug = 'freefire-br';

-- --------------------------------
-- SEED: modes (CODM MP)
-- --------------------------------
-- 8 competitive modes from the screenshot.
-- metric_type is set per mode — this is the key for CODM scoring logic.

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Hardpoint', 'hardpoint', 'points', 'pts', 'highest_score'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Search & Destroy', 'search-and-destroy', 'rounds', 'rounds', 'most_rounds_won'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Domination', 'domination', 'points', 'pts', 'highest_score'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Deathmatch', 'deathmatch', 'kills', 'kills', 'most_kills'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Frontline', 'frontline', 'kills', 'kills', 'most_kills'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Control', 'control', 'points', 'pts', 'highest_score'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Kill Confirmed', 'kill-confirmed', 'kills', 'kills', 'most_kills'
FROM game_titles WHERE slug = 'codm-mp';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Cranked', 'cranked', 'kills', 'kills', 'most_kills'
FROM game_titles WHERE slug = 'codm-mp';

-- --------------------------------
-- SEED: modes (Football games)
-- --------------------------------
-- Football has one effective "mode" — normal match.
-- This allows the match_maps table to work consistently across all game types.

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Normal Match', 'normal-match', 'goals', 'goals', 'highest_score'
FROM game_titles WHERE slug = 'fc-26';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Normal Match', 'normal-match', 'goals', 'goals', 'highest_score'
FROM game_titles WHERE slug = 'fc-mobile';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Normal Match', 'normal-match', 'goals', 'goals', 'highest_score'
FROM game_titles WHERE slug = 'efootball-mobile';

-- --------------------------------
-- SEED: modes (BR games)
-- --------------------------------
-- BR has one mode. No live scoring. Results-only.

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Battle Royale', 'battle-royale', 'placement', 'pts', 'placement_table'
FROM game_titles WHERE slug = 'codm-br';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Battle Royale', 'battle-royale', 'placement', 'pts', 'placement_table'
FROM game_titles WHERE slug = 'pubg-br';

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Battle Royale', 'battle-royale', 'placement', 'pts', 'placement_table'
FROM game_titles WHERE slug = 'freefire-br';

-- --------------------------------
-- SEED: maps (CODM MP — competitive pool)
-- --------------------------------
-- 26 maps from the standard competitive rotation.
-- Admins/organisers add more via dashboard later.

DO $$
DECLARE
  codm_mp_id UUID;
BEGIN
  SELECT id INTO codm_mp_id FROM game_titles WHERE slug = 'codm-mp';

  INSERT INTO maps (game_title_id, name, slug) VALUES
    (codm_mp_id, 'Nuketown',          'nuketown'),
    (codm_mp_id, 'Crash',             'crash'),
    (codm_mp_id, 'Shipment',          'shipment'),
    (codm_mp_id, 'Raid',              'raid'),
    (codm_mp_id, 'Standoff',          'standoff'),
    (codm_mp_id, 'Firing Range',      'firing-range'),
    (codm_mp_id, 'Rust',              'rust'),
    (codm_mp_id, 'Crossfire',         'crossfire'),
    (codm_mp_id, 'Hackney Yard',      'hackney-yard'),
    (codm_mp_id, 'Favela',            'favela'),
    (codm_mp_id, 'Rebirth',           'rebirth'),
    (codm_mp_id, 'Summit',            'summit'),
    (codm_mp_id, 'Monastery',         'monastery'),
    (codm_mp_id, 'Slums',             'slums'),
    (codm_mp_id, 'Highrise',          'highrise'),
    (codm_mp_id, 'Meltdown',          'meltdown'),
    (codm_mp_id, 'Takeoff',           'takeoff'),
    (codm_mp_id, 'Reclaim',           'reclaim'),
    (codm_mp_id, 'Cage',              'cage'),
    (codm_mp_id, 'Tunisia',           'tunisia'),
    (codm_mp_id, 'Hacienda',          'hacienda'),
    (codm_mp_id, 'Satellite',         'satellite'),
    (codm_mp_id, 'Aniyah Incursion',  'aniyah-incursion'),
    (codm_mp_id, 'Checkmate',         'checkmate'),
    (codm_mp_id, 'Pines',             'pines'),
    (codm_mp_id, 'Airborne',          'airborne');
END $$;

-- --------------------------------
-- SEED: map_mode_links (CODM MP)
-- --------------------------------
-- Links every CODM MP map to every CODM MP mode.
-- In reality, not every map supports every mode — but for MVP this is fine.
-- Organisers/admins can restrict specific combos later.
-- This gives the contributor the full dropdown without blocking anyone.

DO $$
DECLARE
  codm_mp_id UUID;
  map_row    RECORD;
  mode_row   RECORD;
BEGIN
  SELECT id INTO codm_mp_id FROM game_titles WHERE slug = 'codm-mp';

  FOR map_row IN SELECT id FROM maps WHERE game_title_id = codm_mp_id LOOP
    FOR mode_row IN SELECT id FROM modes WHERE game_title_id = codm_mp_id LOOP
      INSERT INTO map_mode_links (map_id, mode_id)
      VALUES (map_row.id, mode_row.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
