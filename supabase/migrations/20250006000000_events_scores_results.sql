-- ============================================================
-- Migration 006: Live Events, Scores & BR Results
-- ============================================================
-- Run order: AFTER 005.
-- Depends on: matches, match_maps, teams, players, profiles
-- What this creates:
--   - match_events      (append-only live event log)
--   - match_scores      (materialised current score snapshot)
--   - match_status_log  (history of status changes)
--   - br_match_results  (BR final placement + points table)
-- And the DB trigger that keeps match_scores in sync.
-- ============================================================

-- --------------------------------
-- TABLE: match_events
-- --------------------------------
-- THE most important table. Append-only — nothing is ever updated.
-- Every goal, kill, score update, status change, or correction = one row.
-- Corrections don't delete the wrong event — they reference it via
-- corrected_event_id and mark the original is_void = true.
--
-- sequence_no: monotonically increasing per match.
-- Used to replay events in order if needed.

CREATE SEQUENCE match_event_seq;

CREATE TABLE match_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id            UUID NOT NULL REFERENCES matches(id),
  match_map_id        UUID REFERENCES match_maps(id),
  -- NULL for football (single map) or match-level events

  event_type          TEXT NOT NULL,
  -- ── Football ──────────────────────────────────────
  -- 'goal'            → standard goal
  -- 'own_goal'        → own goal (counts for opponent)
  -- 'penalty_goal'    → penalty converted
  -- 'penalty_miss'    → penalty missed (no score change)
  -- 'yellow_card'     → caution
  -- 'red_card'        → dismissal
  -- 'half_time'       → first half ended
  -- 'full_time'       → match ended normally
  -- 'extra_time'      → going to extra time
  -- ── Shooter MP ────────────────────────────────────
  -- 'score_update'    → score changed (home or away team)
  -- 'round_end'       → S&D round completed
  -- 'map_end'         → this map is finished
  -- ── System ────────────────────────────────────────
  -- 'status_change'   → match status changed (use match_status_log too)
  -- 'map_selected'    → contributor selected a map
  -- 'mode_selected'   → contributor selected a mode
  -- ── Correction ────────────────────────────────────
  -- 'correction'      → fixes a previous wrong event

  -- Which team / player this event is for
  team_id             UUID REFERENCES teams(id),
  player_id           UUID REFERENCES players(id),

  -- The numeric value of this event
  value               NUMERIC,
  -- goal → 1
  -- score_update → new running total for that team
  -- round_end → rounds won so far
  -- kills in BR → kill count

  -- Extra data that doesn't fit into columns
  meta                JSONB DEFAULT '{}',
  -- Examples:
  -- { "minute": 67 }                          → football goal minute
  -- { "home_score": 150, "away_score": 127 }  → CODM score snapshot
  -- { "reason": "wrong team credited" }       → correction reason
  -- { "placement": 3, "kills": 8 }            → BR result detail

  -- Who fired this event
  triggered_by        UUID,    -- FK to profiles added in migration 008

  -- Correction fields
  is_correction       BOOLEAN DEFAULT false,
  corrected_event_id  UUID REFERENCES match_events(id),
  -- ^ the event this correction is fixing
  is_void             BOOLEAN DEFAULT false,
  -- ^ true = this event has been corrected, ignore it in score calc

  -- Ordering
  sequence_no         BIGINT DEFAULT nextval('match_event_seq'),

  created_at          TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: match_scores
-- --------------------------------
-- Materialised current score. One row per match (H2H).
-- Updated automatically by the DB trigger below every time
-- a new non-void event is inserted into match_events.
-- This is what the frontend reads — fast single-row lookup.
-- Never updated manually.

CREATE TABLE match_scores (
  match_id          UUID PRIMARY KEY REFERENCES matches(id),

  -- Current map being played (NULL if between maps)
  current_map_id    UUID REFERENCES match_maps(id),

  -- Overall series score (how many maps won)
  home_maps_won     INT DEFAULT 0,
  away_maps_won     INT DEFAULT 0,

  -- Current map score (resets at start of each new map)
  home_current_score  NUMERIC DEFAULT 0,
  away_current_score  NUMERIC DEFAULT 0,

  -- Breakdown for display (flexible per game type)
  score_breakdown   JSONB DEFAULT '{}',
  -- Football:  { "home_goals": 2, "away_goals": 1 }
  -- CODM MP:   { "home_score": 150, "away_score": 127, "mode": "Hardpoint" }
  -- BR:        {} (BR uses br_match_results, not match_scores)

  last_event_id     UUID REFERENCES match_events(id),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: match_status_log
-- --------------------------------
-- Records every status change in chronological order.
-- Separate from match_events for clean querying.
-- Powers the "match timeline" display and delay announcements.

CREATE TABLE match_status_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id),
  old_status    TEXT,
  new_status    TEXT NOT NULL,
  triggered_by  UUID,    -- FK to profiles added in migration 008
  reason        TEXT,    -- 'Technical issue', 'Team late', etc.
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: br_match_results
-- --------------------------------
-- BR ONLY. Final placement table posted after match ends.
-- One row per participant (team or solo player).
-- total_pts is automatically calculated.

CREATE TABLE br_match_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id),
  participant_id  UUID NOT NULL REFERENCES match_participants(id),
  placement       INT NOT NULL,       -- 1 = 1st place, 2 = 2nd...
  kills           INT NOT NULL DEFAULT 0,
  placement_pts   NUMERIC NOT NULL DEFAULT 0,
  kill_pts        NUMERIC NOT NULL DEFAULT 0,
  total_pts       NUMERIC GENERATED ALWAYS AS (placement_pts + kill_pts) STORED,
  posted_by       UUID,    -- FK to profiles added in migration 008
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (match_id, participant_id),
  UNIQUE (match_id, placement)   -- no two teams can have same placement
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_events_match         ON match_events(match_id);
CREATE INDEX idx_events_match_map     ON match_events(match_map_id);
CREATE INDEX idx_events_type          ON match_events(event_type);
CREATE INDEX idx_events_team          ON match_events(team_id);
CREATE INDEX idx_events_sequence      ON match_events(match_id, sequence_no);
CREATE INDEX idx_events_not_void      ON match_events(match_id) WHERE is_void = false;
CREATE INDEX idx_events_created       ON match_events(created_at);

CREATE INDEX idx_scores_match         ON match_scores(match_id);
CREATE INDEX idx_status_log_match     ON match_status_log(match_id);
CREATE INDEX idx_br_results_match     ON br_match_results(match_id);
CREATE INDEX idx_br_results_placement ON br_match_results(match_id, placement);

-- --------------------------------
-- CONSTRAINTS
-- --------------------------------
ALTER TABLE match_events
  ADD CONSTRAINT event_type_valid CHECK (event_type IN (
    'goal', 'own_goal', 'penalty_goal', 'penalty_miss',
    'yellow_card', 'red_card', 'half_time', 'full_time', 'extra_time',
    'score_update', 'round_end', 'map_end',
    'status_change', 'map_selected', 'mode_selected',
    'correction'
  ));

ALTER TABLE match_events
  ADD CONSTRAINT correction_needs_ref CHECK (
    (is_correction = true AND corrected_event_id IS NOT NULL)
    OR (is_correction = false)
  );

-- --------------------------------
-- DB TRIGGER: auto-update match_scores
-- --------------------------------
-- Fires after every INSERT on match_events.
-- Updates the match_scores row for that match.
-- This keeps the score materialised without the frontend
-- having to query and aggregate match_events itself.

CREATE OR REPLACE FUNCTION update_match_scores()
RETURNS TRIGGER AS $$
DECLARE
  v_match         matches%ROWTYPE;
  v_home_score    NUMERIC := 0;
  v_away_score    NUMERIC := 0;
  v_home_maps     INT := 0;
  v_away_maps     INT := 0;
  v_breakdown     JSONB := '{}';
BEGIN
  -- Skip voided events and corrections (they fix, not add)
  IF NEW.is_void = true THEN RETURN NEW; END IF;

  -- Fetch the match to know its format and game
  SELECT * INTO v_match FROM matches WHERE id = NEW.match_id;

  -- Skip BR matches (they use br_match_results, not match_scores)
  IF v_match.match_format = 'battle_royale' THEN RETURN NEW; END IF;

  -- ── FOOTBALL ──────────────────────────────────────────────
  -- Count all non-void goals for home and away team
  IF NEW.event_type IN ('goal', 'penalty_goal') THEN

    SELECT
      COALESCE(SUM(CASE WHEN team_id = v_match.team_home_id THEN value ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN team_id = v_match.team_away_id THEN value ELSE 0 END), 0)
    INTO v_home_score, v_away_score
    FROM match_events
    WHERE match_id = NEW.match_id
      AND event_type IN ('goal', 'penalty_goal')
      AND is_void = false;

    -- Own goals count for the opponent
    SELECT
      v_home_score + COALESCE(SUM(CASE WHEN team_id = v_match.team_away_id THEN value ELSE 0 END), 0),
      v_away_score + COALESCE(SUM(CASE WHEN team_id = v_match.team_home_id THEN value ELSE 0 END), 0)
    INTO v_home_score, v_away_score
    FROM match_events
    WHERE match_id = NEW.match_id
      AND event_type = 'own_goal'
      AND is_void = false;

    v_breakdown := jsonb_build_object(
      'home_goals', v_home_score,
      'away_goals', v_away_score
    );

  -- ── CODM MP (score_update carries the new running total) ───
  ELSIF NEW.event_type = 'score_update' THEN

    -- score_update.value is the NEW running total for that team
    -- meta contains home_score and away_score snapshot
    v_home_score := COALESCE((NEW.meta->>'home_score')::NUMERIC, 0);
    v_away_score := COALESCE((NEW.meta->>'away_score')::NUMERIC, 0);

    v_breakdown := jsonb_build_object(
      'home_score', v_home_score,
      'away_score', v_away_score
    );

  END IF;

  -- Count map wins (from match_maps table)
  SELECT
    COALESCE(SUM(CASE WHEN map_winner = 'home' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN map_winner = 'away' THEN 1 ELSE 0 END), 0)
  INTO v_home_maps, v_away_maps
  FROM match_maps
  WHERE match_id = NEW.match_id AND status = 'completed';

  -- Upsert match_scores
  INSERT INTO match_scores (
    match_id,
    home_current_score,
    away_current_score,
    home_maps_won,
    away_maps_won,
    score_breakdown,
    last_event_id,
    updated_at
  )
  VALUES (
    NEW.match_id,
    v_home_score,
    v_away_score,
    v_home_maps,
    v_away_maps,
    v_breakdown,
    NEW.id,
    now()
  )
  ON CONFLICT (match_id) DO UPDATE SET
    home_current_score = EXCLUDED.home_current_score,
    away_current_score = EXCLUDED.away_current_score,
    home_maps_won      = EXCLUDED.home_maps_won,
    away_maps_won      = EXCLUDED.away_maps_won,
    score_breakdown    = EXCLUDED.score_breakdown,
    last_event_id      = EXCLUDED.last_event_id,
    updated_at         = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_match_scores
  AFTER INSERT ON match_events
  FOR EACH ROW
  EXECUTE FUNCTION update_match_scores();

-- --------------------------------
-- DB TRIGGER: void correction targets
-- --------------------------------
-- When a correction event is inserted, automatically mark
-- the original (wrong) event as void.

CREATE OR REPLACE FUNCTION void_corrected_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_correction = true AND NEW.corrected_event_id IS NOT NULL THEN
    UPDATE match_events
    SET is_void = true
    WHERE id = NEW.corrected_event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_void_corrected_event
  AFTER INSERT ON match_events
  FOR EACH ROW
  WHEN (NEW.is_correction = true)
  EXECUTE FUNCTION void_corrected_event();
