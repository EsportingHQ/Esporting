-- ============================================================
-- Migration 010: Row Level Security (RLS) Policies
-- ============================================================
-- Run order: AFTER 009. Last migration.
-- What this does:
--   - Enables RLS on every table
--   - Public tables: anyone can read
--   - Private tables: only authorised roles can read/write
--   - Write policies: enforced per role and scope
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: get the current user's role name
-- ============================================================
-- Used in every policy. Returns the highest-privilege role
-- the current user has (globally, not scoped).

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT AS $$
  SELECT r.name
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = auth.uid()
    AND ura.revoked_at IS NULL
    AND ura.comp_instance_id IS NULL  -- global roles only
  ORDER BY
    CASE r.name
      WHEN 'super_admin'  THEN 1
      WHEN 'organiser'    THEN 2
      WHEN 'contributor'  THEN 3
      WHEN 'viewer'       THEN 4
      ELSE 5
    END
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: check if user is admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'super_admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: check if user is organiser of a comp
-- ============================================================
CREATE OR REPLACE FUNCTION is_organiser_of(p_comp_instance_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM comp_instances
    WHERE id = p_comp_instance_id
      AND organiser_id = auth.uid()
      AND deleted_at IS NULL
  ) OR is_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER FUNCTION: check if user is assigned contributor for a match
-- ============================================================
CREATE OR REPLACE FUNCTION is_assigned_contributor(p_match_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches
    WHERE id = p_match_id
      AND contrib_id = auth.uid()
  ) OR is_admin();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE game_types               ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_titles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE modes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_mode_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_metrics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_series              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_instances           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_game_titles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_stages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_groups              ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_rosters             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comp_registrations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_maps               ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_status_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_match_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_points_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE br_points_template       ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_article_tags        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PUBLIC READ POLICIES
-- ============================================================
-- These tables are public information. Anyone (even unauthenticated) can read.

-- Game catalogue
CREATE POLICY "public read game_types"     ON game_types     FOR SELECT USING (true);
CREATE POLICY "public read game_titles"    ON game_titles    FOR SELECT USING (is_active = true);
CREATE POLICY "public read maps"           ON maps           FOR SELECT USING (is_active = true AND is_approved = true);
CREATE POLICY "public read modes"          ON modes          FOR SELECT USING (is_active = true);
CREATE POLICY "public read map_mode_links" ON map_mode_links FOR SELECT USING (true);
CREATE POLICY "public read scoring"        ON scoring_metrics FOR SELECT USING (true);
CREATE POLICY "public read br_templates"   ON br_points_template FOR SELECT USING (true);

-- Competition structure
CREATE POLICY "public read comp_series"    ON comp_series    FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "public read comp_instances" ON comp_instances FOR SELECT USING (deleted_at IS NULL AND status != 'draft');
CREATE POLICY "public read comp_games"     ON comp_game_titles FOR SELECT USING (true);
CREATE POLICY "public read comp_stages"    ON comp_stages    FOR SELECT USING (true);
CREATE POLICY "public read comp_groups"    ON comp_groups    FOR SELECT USING (true);
CREATE POLICY "public read br_points"      ON br_points_config FOR SELECT USING (true);

-- Teams and players
CREATE POLICY "public read teams"          ON teams          FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "public read players"        ON players        FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "public read rosters"        ON team_rosters   FOR SELECT USING (true);
CREATE POLICY "public read registrations"  ON comp_registrations FOR SELECT USING (status = 'approved');
CREATE POLICY "public read assignments"    ON player_game_assignments FOR SELECT USING (is_active = true);

-- Matches and live data
CREATE POLICY "public read matches"        ON matches        FOR SELECT USING (deleted_at IS NULL AND status != 'draft');
CREATE POLICY "public read lineups"        ON match_lineups  FOR SELECT USING (true);
CREATE POLICY "public read match_maps"     ON match_maps     FOR SELECT USING (true);
CREATE POLICY "public read participants"   ON match_participants FOR SELECT USING (true);
CREATE POLICY "public read events"         ON match_events   FOR SELECT USING (is_void = false);
CREATE POLICY "public read scores"         ON match_scores   FOR SELECT USING (true);
CREATE POLICY "public read status_log"     ON match_status_log FOR SELECT USING (true);
CREATE POLICY "public read br_results"     ON br_match_results FOR SELECT USING (true);
CREATE POLICY "public read standings"      ON standings      FOR SELECT USING (true);

-- News
CREATE POLICY "public read news"           ON news_articles  FOR SELECT USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "public read tags"           ON news_tags      FOR SELECT USING (true);
CREATE POLICY "public read article_tags"   ON news_article_tags FOR SELECT USING (true);

-- Profiles (public gamertags and display names)
CREATE POLICY "public read profiles"       ON profiles       FOR SELECT USING (true);

-- Roles (needed for helper functions)
CREATE POLICY "public read roles"          ON roles          FOR SELECT USING (true);
CREATE POLICY "public read permissions"    ON permissions    FOR SELECT USING (true);
CREATE POLICY "public read role_perms"     ON role_permissions FOR SELECT USING (true);

-- ============================================================
-- AUTHENTICATED USER POLICIES
-- ============================================================

-- Users can update their own profile
CREATE POLICY "users update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can see their own role assignments
CREATE POLICY "users read own roles"
ON user_role_assignments FOR SELECT
USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- ADMIN-ONLY WRITE POLICIES (game catalogue management)
-- ============================================================

CREATE POLICY "admin write game_types"
ON game_types FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin write game_titles"
ON game_titles FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage maps"
ON maps FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage modes"
ON modes FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage map_mode_links"
ON map_mode_links FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage scoring_metrics"
ON scoring_metrics FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage br_templates"
ON br_points_template FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "admin manage roles"
ON user_role_assignments FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- ============================================================
-- ORGANISER WRITE POLICIES
-- ============================================================

-- Organisers can create competition series
CREATE POLICY "organiser create comp_series"
ON comp_series FOR INSERT
WITH CHECK (auth_role() IN ('organiser', 'super_admin'));

-- Organisers can manage their own series
CREATE POLICY "organiser update own comp_series"
ON comp_series FOR UPDATE
USING (created_by = auth.uid() OR is_admin());

-- Organisers can create competition instances
CREATE POLICY "organiser create comp_instances"
ON comp_instances FOR INSERT
WITH CHECK (auth_role() IN ('organiser', 'super_admin'));

-- Organisers can manage their own instances
CREATE POLICY "organiser update own comp_instances"
ON comp_instances FOR UPDATE
USING (organiser_id = auth.uid() OR is_admin());

-- Organisers can manage stages/groups for their comps
CREATE POLICY "organiser manage stages"
ON comp_stages FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM comp_instances ci
    WHERE ci.id = comp_stages.comp_instance_id
      AND ci.organiser_id = auth.uid()
  )
);

CREATE POLICY "organiser manage groups"
ON comp_groups FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM comp_stages cs
    JOIN comp_instances ci ON ci.id = cs.comp_instance_id
    WHERE cs.id = comp_groups.stage_id
      AND ci.organiser_id = auth.uid()
  )
);

-- Organisers can manage team registrations for their comps
CREATE POLICY "organiser manage registrations"
ON comp_registrations FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM comp_instances ci
    WHERE ci.id = comp_registrations.comp_instance_id
      AND ci.organiser_id = auth.uid()
  )
);

-- Organisers can manage player assignments for their comps
CREATE POLICY "organiser manage player_assignments"
ON player_game_assignments FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM comp_instances ci
    WHERE ci.id = player_game_assignments.comp_instance_id
      AND ci.organiser_id = auth.uid()
  )
);

-- Organisers can manage BR points config for their comps
CREATE POLICY "organiser manage br_points_config"
ON br_points_config FOR ALL
USING (
  is_admin() OR EXISTS (
    SELECT 1 FROM comp_instances ci
    WHERE ci.id = br_points_config.comp_instance_id
      AND ci.organiser_id = auth.uid()
  )
);

-- Organisers can write news for their own competitions
CREATE POLICY "organiser write own news"
ON news_articles FOR INSERT
WITH CHECK (
  auth_role() IN ('organiser', 'super_admin') AND
  (
    comp_instance_id IS NULL AND is_admin()  -- only admin writes unlinked articles
    OR
    is_organiser_of(comp_instance_id)         -- organiser of this comp
  )
);

CREATE POLICY "organiser update own news"
ON news_articles FOR UPDATE
USING (author_id = auth.uid() OR is_admin());

-- Organisers can suggest maps (is_approved = false initially)
CREATE POLICY "organiser suggest maps"
ON maps FOR INSERT
WITH CHECK (
  auth_role() IN ('organiser', 'super_admin') AND
  is_approved = false   -- starts unapproved, admin confirms later
  OR is_admin()
);

-- ============================================================
-- CONTRIBUTOR WRITE POLICIES
-- ============================================================

-- Contributors can insert match events for their assigned matches
CREATE POLICY "contributor post match events"
ON match_events FOR INSERT
WITH CHECK (
  is_admin() OR is_assigned_contributor(match_id)
);

-- Contributors can update match_maps (select map/mode, update score)
CREATE POLICY "contributor update match_maps"
ON match_maps FOR UPDATE
USING (
  is_admin() OR is_assigned_contributor(match_id)
);

-- Contributors can manage lineups for their matches
CREATE POLICY "contributor manage lineups"
ON match_lineups FOR ALL
USING (
  is_admin() OR is_assigned_contributor(match_id)
);

-- Contributors can post BR results for their matches
CREATE POLICY "contributor post br_results"
ON br_match_results FOR INSERT
WITH CHECK (
  is_admin() OR is_assigned_contributor(match_id)
);

-- ============================================================
-- ADMIN match management
-- ============================================================

CREATE POLICY "admin manage matches"
ON matches FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Organisers can create matches in their competitions
CREATE POLICY "organiser create matches"
ON matches FOR INSERT
WITH CHECK (
  auth_role() IN ('organiser', 'super_admin') AND
  is_organiser_of(comp_instance_id)
);
