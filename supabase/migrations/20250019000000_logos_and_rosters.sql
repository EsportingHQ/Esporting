-- Logo storage + roster management for organisers

-- Public bucket for competition and team logos (png / jpeg / webp, max 2 MB).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('logos', 'logos', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];

-- Signed-in users may upload only into their own folder (<user id>/...).
DROP POLICY IF EXISTS "logos upload own folder" ON storage.objects;
CREATE POLICY "logos upload own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "logos delete own folder" ON storage.objects;
CREATE POLICY "logos delete own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Who may edit a team inside a competition: the competition's organiser, or an admin.
CREATE OR REPLACE FUNCTION can_manage_team_in_comp(p_comp UUID, p_team UUID)
RETURNS BOOLEAN AS $$
  SELECT is_admin() OR EXISTS (
    SELECT 1
    FROM comp_instances ci
    JOIN comp_registrations cr ON cr.comp_instance_id = ci.id
    WHERE ci.id = p_comp AND ci.organiser_id = auth.uid() AND ci.deleted_at IS NULL
      AND cr.team_id = p_team
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION set_team_logo(p_comp UUID, p_team UUID, p_url TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT can_manage_team_in_comp(p_comp, p_team) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_url IS NOT NULL AND p_url NOT LIKE '%/storage/v1/object/public/logos/%' THEN
    RAISE EXCEPTION 'Logo must be uploaded through Esporting';
  END IF;
  UPDATE teams SET logo_url = p_url WHERE id = p_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add a player to a team's roster and to the competition's games.
CREATE OR REPLACE FUNCTION add_roster_player(
  p_comp UUID, p_team UUID, p_gamertag TEXT, p_real_name TEXT DEFAULT NULL,
  p_game_slugs TEXT[] DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE pid UUID; gid UUID; slug TEXT; st TEXT;
BEGIN
  IF NOT can_manage_team_in_comp(p_comp, p_team) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF coalesce(trim(p_gamertag), '') = '' THEN RAISE EXCEPTION 'Enter the player gamertag'; END IF;
  SELECT status INTO st FROM comp_instances WHERE id = p_comp;
  IF st NOT IN ('draft', 'registration', 'ongoing') THEN
    RAISE EXCEPTION 'This competition is % and rosters are closed', st;
  END IF;

  SELECT id INTO pid FROM players
   WHERE lower(gamertag) = lower(trim(p_gamertag)) AND deleted_at IS NULL LIMIT 1;
  IF pid IS NULL THEN
    INSERT INTO players (gamertag, real_name) VALUES (trim(p_gamertag), nullif(trim(p_real_name), ''))
    RETURNING id INTO pid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM team_rosters WHERE team_id = p_team AND player_id = pid AND left_at IS NULL) THEN
    INSERT INTO team_rosters (team_id, player_id, role, joined_at) VALUES (p_team, pid, 'player', now());
  END IF;

  FOREACH slug IN ARRAY coalesce(p_game_slugs, '{}') LOOP
    SELECT gt.id INTO gid FROM game_titles gt
      JOIN comp_game_titles cg ON cg.game_title_id = gt.id AND cg.comp_instance_id = p_comp
     WHERE gt.slug = slug;
    IF gid IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM player_game_assignments
       WHERE comp_instance_id = p_comp AND team_id = p_team AND player_id = pid AND game_title_id = gid
    ) THEN
      INSERT INTO player_game_assignments (comp_instance_id, team_id, player_id, game_title_id, assigned_by)
      VALUES (p_comp, p_team, pid, gid, auth.uid());
    END IF;
  END LOOP;
  RETURN pid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION remove_roster_player(p_comp UUID, p_team UUID, p_player UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT can_manage_team_in_comp(p_comp, p_team) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  DELETE FROM player_game_assignments
   WHERE comp_instance_id = p_comp AND team_id = p_team AND player_id = p_player;
  UPDATE team_rosters SET left_at = now()
   WHERE team_id = p_team AND player_id = p_player AND left_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION can_manage_team_in_comp(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION set_team_logo(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION add_roster_player(UUID, UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION remove_roster_player(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_team_logo(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION add_roster_player(UUID, UUID, TEXT, TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_roster_player(UUID, UUID, UUID) TO authenticated;
