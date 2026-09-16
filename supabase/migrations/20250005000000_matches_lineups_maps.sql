-- ============================================================
-- Migration 005: Matches, Lineups & Match Maps
-- ============================================================
-- Run order: AFTER 004.
-- Depends on: comp_instances, comp_stages, comp_groups,
--             game_titles, teams, players, maps, modes, profiles
-- What this creates:
--   - matches             (every match/game scheduled)
--   - match_lineups       (players declared for a match)
--   - match_maps          (each map slot in a Best-of series)
--   - match_participants  (BR-specific: multi-team/solo entries)
-- ============================================================

-- --------------------------------
-- TABLE: matches
-- --------------------------------
-- Every single match in the system lives here.
-- match_format distinguishes head-to-head from BR.
-- For BR: team_home_id and team_away_id are both NULL.
--         Participants tracked in match_participants.
-- For H2H: team_home_id and team_away_id are set.

CREATE TABLE matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  stage_id          UUID REFERENCES comp_stages(id),
  group_id          UUID REFERENCES comp_groups(id),
  game_title_id     UUID NOT NULL REFERENCES game_titles(id),

  -- Head-to-head only (NULL for BR)
  team_home_id      UUID REFERENCES teams(id),
  team_away_id      UUID REFERENCES teams(id),

  match_format      TEXT NOT NULL,
  -- 'head_to_head'  → 2 teams, Football or CODM MP
  -- 'battle_royale' → multi-team or solo, BR games

  best_of           INT NOT NULL DEFAULT 1,
  -- How many maps/games in the series (1, 3, 5... up to 15)
  -- For BR: typically 1 (one BR match = one game)

  -- Timing
  scheduled_at      TIMESTAMPTZ,     -- planned start
  started_at        TIMESTAMPTZ,     -- set when LIVE trigger fires
  ended_at          TIMESTAMPTZ,     -- set when COMPLETED trigger fires

  -- Status
  status            TEXT NOT NULL DEFAULT 'scheduled',
  -- 'scheduled'  → upcoming
  -- 'delayed'    → pushed back, reason in match_status_log
  -- 'live'       → currently being played
  -- 'completed'  → finished
  -- 'cancelled'  → called off
  -- 'walkover'   → one team didn't show, other wins by default

  -- Result (H2H only — BR results in br_match_results)
  winner_team_id    UUID REFERENCES teams(id),

  -- Maps won per team in a Best-of series (H2H)
  home_maps_won     INT DEFAULT 0,
  away_maps_won     INT DEFAULT 0,

  -- Contributor assigned to this match (set by admin)
  contrib_id        UUID,    -- FK to profiles added in migration 008

  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  -- A team cannot play itself
  CONSTRAINT no_self_match CHECK (team_home_id != team_away_id),

  -- BR matches must have no home/away team
  -- H2H matches must have both teams
  CONSTRAINT match_format_teams CHECK (
    (match_format = 'battle_royale' AND team_home_id IS NULL AND team_away_id IS NULL)
    OR
    (match_format = 'head_to_head' AND team_home_id IS NOT NULL AND team_away_id IS NOT NULL)
  )
);

-- --------------------------------
-- TABLE: match_lineups
-- --------------------------------
-- Players declared for a specific match.
-- Can be updated until the LIVE trigger fires.
-- Both home and away teams have rows here.

CREATE TABLE match_lineups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES matches(id),
  team_id     UUID NOT NULL REFERENCES teams(id),
  player_id   UUID NOT NULL REFERENCES players(id),
  role        TEXT NOT NULL DEFAULT 'starter',
  -- 'starter'     → starting player
  -- 'substitute'  → bench, may come on
  -- 'withdrawn'   → removed from lineup (injury, red card etc.)
  confirmed   BOOLEAN DEFAULT false,  -- organiser/contributor confirmed this lineup
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (match_id, team_id, player_id)
);

-- --------------------------------
-- TABLE: match_maps
-- --------------------------------
-- Each row is one map/round in a Best-of series.
-- map_number = 1, 2, 3... up to best_of value on the match.
-- For football Best-of: one row per game, mode = 'Normal Match'.
-- For CODM MP Best-of: one row per map, with map and mode selected.
-- map_id and mode_id can be NULL if selected on-site later.

CREATE TABLE match_maps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id),
  map_number      INT NOT NULL,       -- 1 = Map 1, 2 = Map 2, etc.

  -- Can be NULL if not pre-determined (selected on-site by contributor)
  map_id          UUID REFERENCES maps(id),
  mode_id         UUID REFERENCES modes(id),

  -- Scores for this specific map (H2H only)
  home_score      NUMERIC DEFAULT 0,
  away_score      NUMERIC DEFAULT 0,

  -- Which team won this map (NULL until completed)
  map_winner      TEXT,   -- 'home' | 'away' | 'draw'

  status          TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'    → not started yet
  -- 'live'       → currently being played
  -- 'completed'  → this map is done
  -- 'skipped'    → not needed (e.g. team won BO3 in 2 maps)

  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_seconds INT,      -- actual duration in seconds (for recap string)
  -- e.g. 3960 = 66 minutes → "at Hardpoint (66m)"

  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (match_id, map_number)
);

-- --------------------------------
-- TABLE: match_participants
-- --------------------------------
-- BR ONLY. Tracks who is in a BR match.
-- For team BR: team_id is set, player_id is NULL.
-- For solo BR: player_id is set, team_id is NULL.
-- slot_number is their entry number (1–20 for a 20-team lobby).

CREATE TABLE match_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id),
  team_id       UUID REFERENCES teams(id),      -- team BR
  player_id     UUID REFERENCES players(id),    -- solo BR
  slot_number   INT NOT NULL,

  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (match_id, slot_number),

  -- Must have exactly one of team_id or player_id
  CONSTRAINT participant_is_team_or_solo CHECK (
    (team_id IS NOT NULL AND player_id IS NULL)
    OR
    (player_id IS NOT NULL AND team_id IS NULL)
  )
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_matches_comp         ON matches(comp_instance_id);
CREATE INDEX idx_matches_stage        ON matches(stage_id);
CREATE INDEX idx_matches_game         ON matches(game_title_id);
CREATE INDEX idx_matches_status       ON matches(status);
CREATE INDEX idx_matches_scheduled    ON matches(scheduled_at);
CREATE INDEX idx_matches_home         ON matches(team_home_id);
CREATE INDEX idx_matches_away         ON matches(team_away_id);
CREATE INDEX idx_matches_contrib      ON matches(contrib_id);
CREATE INDEX idx_matches_deleted      ON matches(deleted_at);

CREATE INDEX idx_lineups_match        ON match_lineups(match_id);
CREATE INDEX idx_lineups_team         ON match_lineups(team_id);
CREATE INDEX idx_lineups_player       ON match_lineups(player_id);

CREATE INDEX idx_match_maps_match     ON match_maps(match_id);
CREATE INDEX idx_match_maps_status    ON match_maps(status);

CREATE INDEX idx_participants_match   ON match_participants(match_id);
CREATE INDEX idx_participants_team    ON match_participants(team_id);
CREATE INDEX idx_participants_player  ON match_participants(player_id);

-- --------------------------------
-- CONSTRAINTS
-- --------------------------------
ALTER TABLE matches
  ADD CONSTRAINT matches_status_valid
  CHECK (status IN ('scheduled','delayed','live','completed','cancelled','walkover'));

ALTER TABLE matches
  ADD CONSTRAINT matches_format_valid
  CHECK (match_format IN ('head_to_head','battle_royale'));

ALTER TABLE matches
  ADD CONSTRAINT matches_best_of_valid
  CHECK (best_of BETWEEN 1 AND 15);

ALTER TABLE match_lineups
  ADD CONSTRAINT lineup_role_valid
  CHECK (role IN ('starter','substitute','withdrawn'));

ALTER TABLE match_maps
  ADD CONSTRAINT map_status_valid
  CHECK (status IN ('pending','live','completed','skipped'));

ALTER TABLE match_maps
  ADD CONSTRAINT map_winner_valid
  CHECK (map_winner IN ('home','away','draw') OR map_winner IS NULL);
