-- ============================================================
-- Migration 004: Teams, Players & Registrations
-- ============================================================
-- Run order: AFTER 003.
-- Depends on: comp_instances, comp_groups, game_titles
-- What this creates:
--   - teams                   (team profiles)
--   - players                 (player profiles — data records, not auth users)
--   - team_rosters            (player ↔ team membership)
--   - comp_registrations      (team ↔ competition enrollment)
--   - player_game_assignments (which player plays which game in a competition)
-- ============================================================

-- --------------------------------
-- TABLE: teams
-- --------------------------------
-- Team profile. Independent of any competition.
-- A team registers INTO competitions — they exist on their own.

CREATE TABLE teams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  short_code    TEXT,           -- 'KTI' for Team Kuti, 'BLO' for Team Bello
  logo_url      TEXT,
  country       TEXT,           -- ISO 3166-1 alpha-2, e.g. 'NG', 'GH'
  created_by    UUID,           -- FK to profiles added in migration 008
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- --------------------------------
-- TABLE: players
-- --------------------------------
-- Player profile. Just a data record for MVP.
-- user_id is nullable — will be linked to auth accounts in Phase 2.

CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,             -- nullable — FK to auth.users added in Phase 2
  gamertag    TEXT NOT NULL,    -- their in-game name, e.g. 'Ade', 'Seun'
  real_name   TEXT,
  avatar_url  TEXT,
  country     TEXT,             -- ISO 3166-1 alpha-2
  created_at  TIMESTAMPTZ DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

-- --------------------------------
-- TABLE: team_rosters
-- --------------------------------
-- Tracks which players belong to which team, and for how long.
-- A player can be on only one active team at a time.
-- left_at = NULL means currently active.

CREATE TABLE team_rosters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id),
  player_id   UUID NOT NULL REFERENCES players(id),
  role        TEXT NOT NULL DEFAULT 'player',
  -- 'player' | 'captain' | 'substitute' | 'coach'
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at     TIMESTAMPTZ,     -- NULL = currently on this team
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: comp_registrations
-- --------------------------------
-- A team registers for a specific competition instance.
-- group_id is NULL until the organiser assigns them to a group.
-- status tracks the approval workflow.

CREATE TABLE comp_registrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  team_id           UUID NOT NULL REFERENCES teams(id),
  group_id          UUID REFERENCES comp_groups(id),  -- assigned after registration
  status            TEXT NOT NULL DEFAULT 'pending',
  -- 'pending'    → submitted, awaiting organiser approval
  -- 'approved'   → confirmed in competition
  -- 'rejected'   → not accepted
  -- 'withdrawn'  → team pulled out
  registered_at     TIMESTAMPTZ DEFAULT now(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID,       -- FK to profiles added in migration 008
  notes             TEXT,
  UNIQUE (comp_instance_id, team_id)
);

-- --------------------------------
-- TABLE: player_game_assignments
-- --------------------------------
-- The key table for multi-game competitions.
-- Tracks which player competes in which game title within a competition.
--
-- Example — UI eSports League:
--   Ade   → eFootball Mobile only
--   Bolu  → FC Mobile only
--   Razaq → FC 26 only
--   Seun  → CODM MP AND CODM BR (two rows)
--   Tunde → CODM MP AND CODM BR (two rows)
--
-- A player can have multiple rows in the same competition
-- if they compete in multiple games.

CREATE TABLE player_game_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id  UUID NOT NULL REFERENCES comp_instances(id),
  team_id           UUID NOT NULL REFERENCES teams(id),
  player_id         UUID NOT NULL REFERENCES players(id),
  game_title_id     UUID NOT NULL REFERENCES game_titles(id),
  is_active         BOOLEAN DEFAULT true,   -- false = removed/suspended
  assigned_at       TIMESTAMPTZ DEFAULT now(),
  assigned_by       UUID,                   -- FK to profiles added in migration 008
  UNIQUE (comp_instance_id, team_id, player_id, game_title_id)
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_teams_slug               ON teams(slug);
CREATE INDEX idx_teams_deleted            ON teams(deleted_at);

CREATE INDEX idx_players_gamertag         ON players(gamertag);
CREATE INDEX idx_players_deleted          ON players(deleted_at);

CREATE INDEX idx_team_rosters_team        ON team_rosters(team_id);
CREATE INDEX idx_team_rosters_player      ON team_rosters(player_id);
CREATE INDEX idx_team_rosters_active      ON team_rosters(team_id, player_id) WHERE left_at IS NULL;

CREATE INDEX idx_comp_reg_instance        ON comp_registrations(comp_instance_id);
CREATE INDEX idx_comp_reg_team            ON comp_registrations(team_id);
CREATE INDEX idx_comp_reg_status          ON comp_registrations(status);

CREATE INDEX idx_pga_comp                 ON player_game_assignments(comp_instance_id);
CREATE INDEX idx_pga_team                 ON player_game_assignments(team_id);
CREATE INDEX idx_pga_player               ON player_game_assignments(player_id);
CREATE INDEX idx_pga_game                 ON player_game_assignments(game_title_id);

-- --------------------------------
-- CONSTRAINTS
-- --------------------------------
ALTER TABLE team_rosters
  ADD CONSTRAINT roster_role_valid
  CHECK (role IN ('player', 'captain', 'substitute', 'coach'));

ALTER TABLE comp_registrations
  ADD CONSTRAINT comp_reg_status_valid
  CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn'));
