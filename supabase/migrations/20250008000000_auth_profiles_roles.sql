-- ============================================================
-- Migration 008: Auth, Profiles, Roles & Permissions
-- ============================================================
-- Run order: AFTER 007.
-- This migration does two things:
--   1. Creates auth/user management tables
--   2. Adds the FK constraints we deferred from earlier migrations
--      (created_by, organiser_id, contrib_id, triggered_by, etc.)
-- ============================================================

-- --------------------------------
-- TABLE: profiles
-- --------------------------------
-- Extends Supabase's auth.users table.
-- Created automatically via trigger when a user signs up.

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: roles
-- --------------------------------
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  -- 'super_admin' | 'organiser' | 'contributor' | 'viewer'
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------
-- TABLE: permissions
-- --------------------------------
CREATE TABLE permissions (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  -- 'match:trigger_live'
  -- 'match:post_event'
  -- 'match:correct_event'
  -- 'match:assign_contributor'
  -- 'comp:create'
  -- 'comp:register_team'
  -- 'comp:assign_player'
  -- 'game:manage_catalogue'
  -- 'user:manage_roles'
  -- 'news:publish'
  -- 'news:publish_own'
  description TEXT
);

-- --------------------------------
-- TABLE: role_permissions
-- --------------------------------
CREATE TABLE role_permissions (
  role_id       INT NOT NULL REFERENCES roles(id),
  permission_id INT NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

-- --------------------------------
-- TABLE: user_role_assignments
-- --------------------------------
-- A user can have multiple roles.
-- comp_instance_id = NULL → global role (e.g. super_admin applies everywhere)
-- comp_instance_id = set  → scoped role (e.g. organiser of only this competition)

CREATE TABLE user_role_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id),
  role_id           INT  NOT NULL REFERENCES roles(id),
  comp_instance_id  UUID REFERENCES comp_instances(id),  -- NULL = global
  granted_by        UUID REFERENCES profiles(id),
  granted_at        TIMESTAMPTZ DEFAULT now(),
  revoked_at        TIMESTAMPTZ,    -- NULL = currently active
  UNIQUE (user_id, role_id, comp_instance_id)
);

-- --------------------------------
-- INDEXES
-- --------------------------------
CREATE INDEX idx_profiles_username       ON profiles(username);
CREATE INDEX idx_ura_user                ON user_role_assignments(user_id);
CREATE INDEX idx_ura_role                ON user_role_assignments(role_id);
CREATE INDEX idx_ura_comp                ON user_role_assignments(comp_instance_id);
CREATE INDEX idx_ura_active              ON user_role_assignments(user_id) WHERE revoked_at IS NULL;

-- --------------------------------
-- TRIGGER: auto-create profile on signup
-- --------------------------------
-- When a user is created in auth.users, automatically
-- create their profile row. Uses their email prefix as default username.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    -- Default username from email: "user@gmail.com" → "user"
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(NEW.id::TEXT, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- --------------------------------
-- TRIGGER: auto-assign viewer role on signup
-- --------------------------------
-- All new users get the viewer role by default.
-- Admins upgrade them to organiser or contributor.

CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  viewer_role_id INT;
BEGIN
  SELECT id INTO viewer_role_id FROM roles WHERE name = 'viewer';

  IF viewer_role_id IS NOT NULL THEN
    INSERT INTO user_role_assignments (user_id, role_id, granted_by)
    VALUES (NEW.id, viewer_role_id, NULL);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_assign_default_role
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- --------------------------------
-- NOW ADD DEFERRED FKs from earlier migrations
-- --------------------------------
-- These were left as plain UUID columns to avoid circular deps.
-- Now that profiles exists, we add the constraints.

ALTER TABLE comp_series
  ADD CONSTRAINT fk_comp_series_created_by
  FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE comp_instances
  ADD CONSTRAINT fk_comp_instances_organiser
  FOREIGN KEY (organiser_id) REFERENCES profiles(id);

ALTER TABLE comp_registrations
  ADD CONSTRAINT fk_comp_reg_reviewed_by
  FOREIGN KEY (reviewed_by) REFERENCES profiles(id);

ALTER TABLE teams
  ADD CONSTRAINT fk_teams_created_by
  FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE player_game_assignments
  ADD CONSTRAINT fk_pga_assigned_by
  FOREIGN KEY (assigned_by) REFERENCES profiles(id);

ALTER TABLE matches
  ADD CONSTRAINT fk_matches_contrib
  FOREIGN KEY (contrib_id) REFERENCES profiles(id);

ALTER TABLE match_events
  ADD CONSTRAINT fk_events_triggered_by
  FOREIGN KEY (triggered_by) REFERENCES profiles(id);

ALTER TABLE match_status_log
  ADD CONSTRAINT fk_status_log_triggered_by
  FOREIGN KEY (triggered_by) REFERENCES profiles(id);

ALTER TABLE br_match_results
  ADD CONSTRAINT fk_br_results_posted_by
  FOREIGN KEY (posted_by) REFERENCES profiles(id);

ALTER TABLE br_points_config
  ADD CONSTRAINT fk_br_config_created_by
  FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE maps
  ADD CONSTRAINT fk_maps_added_by
  FOREIGN KEY (added_by) REFERENCES profiles(id);

-- --------------------------------
-- SEED DATA: roles
-- --------------------------------
INSERT INTO roles (name, description) VALUES
  ('super_admin',  'Full platform access. Can do everything.'),
  ('organiser',    'Can create and manage their own competitions.'),
  ('contributor',  'Can log match events for assigned matches.'),
  ('viewer',       'Read-only access. Default role for all users.');

-- --------------------------------
-- SEED DATA: permissions
-- --------------------------------
INSERT INTO permissions (code, description) VALUES
  ('match:trigger_live',       'Change match status to live/completed/delayed'),
  ('match:post_event',         'Post a goal, kill, score update, or other match event'),
  ('match:correct_event',      'Void a wrong event and post a correction'),
  ('match:assign_contributor', 'Assign a contributor to a match'),
  ('match:manage_lineup',      'Set or edit match lineups'),
  ('match:select_map_mode',    'Select map and mode for a match map slot'),
  ('comp:create',              'Create a new competition series or instance'),
  ('comp:manage',              'Edit competition details, stages, groups'),
  ('comp:register_team',       'Register a team into a competition'),
  ('comp:assign_player',       'Assign a player to a game within a competition'),
  ('game:manage_catalogue',    'Add or edit game titles, maps, modes'),
  ('user:invite_organiser',    'Send organiser invite emails'),
  ('user:manage_roles',        'Assign or revoke roles for any user'),
  ('news:publish',             'Publish news articles (any competition)'),
  ('news:publish_own',         'Publish news articles linked to own competitions'),
  ('br:post_results',          'Post final BR placement results');

-- --------------------------------
-- SEED DATA: role_permissions
-- --------------------------------
-- super_admin gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id
FROM permissions;

-- organiser permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'organiser'),
  id
FROM permissions
WHERE code IN (
  'comp:create',
  'comp:manage',
  'comp:register_team',
  'comp:assign_player',
  'match:manage_lineup',
  'news:publish_own'
);

-- contributor permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'contributor'),
  id
FROM permissions
WHERE code IN (
  'match:trigger_live',
  'match:post_event',
  'match:correct_event',
  'match:manage_lineup',
  'match:select_map_mode',
  'br:post_results'
);

-- viewer: no dashboard permissions (read-only via RLS on public tables)
