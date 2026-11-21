-- Bulk import: create many teams with rosters in one call, and allow sanitised SVG logos.

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp','image/svg+xml']
 WHERE id = 'logos';

-- p_teams = [{"name": "Fnatic", "players": ["Kori","Ezra"]}, ...]
-- Every team is registered (approved) into the competition and each player is
-- assigned to all of the competition's games. Existing teams with the same name
-- are reused. Returns what happened per team.
CREATE OR REPLACE FUNCTION bulk_import_teams(p_comp UUID, p_teams JSONB)
RETURNS JSONB AS $$
DECLARE
  t JSONB; tname TEXT; tslug TEXT; tid UUID; pid UUID; tag TEXT; gid UUID;
  st TEXT; org UUID;
  out JSONB := '[]'::jsonb;
  made_teams INT := 0; made_players INT := 0;
  game_ids UUID[];
BEGIN
  SELECT status, organiser_id INTO st, org FROM comp_instances WHERE id = p_comp AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Competition not found'; END IF;
  IF NOT (is_admin() OR org = auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF st NOT IN ('draft', 'registration') THEN
    RAISE EXCEPTION 'Teams can only be imported while the competition is in draft or registration';
  END IF;
  IF jsonb_typeof(p_teams) <> 'array' THEN RAISE EXCEPTION 'Expected a list of teams'; END IF;
  IF jsonb_array_length(p_teams) = 0 THEN RAISE EXCEPTION 'No teams to import'; END IF;
  IF jsonb_array_length(p_teams) > 128 THEN RAISE EXCEPTION 'Import at most 128 teams at a time'; END IF;

  SELECT array_agg(game_title_id) INTO game_ids FROM comp_game_titles WHERE comp_instance_id = p_comp;

  FOR t IN SELECT * FROM jsonb_array_elements(p_teams) LOOP
    tname := trim(t->>'name');
    IF coalesce(tname, '') = '' THEN CONTINUE; END IF;
    tslug := trim(both '-' from regexp_replace(lower(tname), '[^a-z0-9]+', '-', 'g'));
    IF tslug = '' THEN CONTINUE; END IF;

    SELECT id INTO tid FROM teams WHERE slug = tslug AND deleted_at IS NULL LIMIT 1;
    IF tid IS NULL THEN
      INSERT INTO teams (name, slug, created_by) VALUES (tname, tslug, auth.uid()) RETURNING id INTO tid;
      made_teams := made_teams + 1;
    END IF;

    INSERT INTO comp_registrations (comp_instance_id, team_id, status, reviewed_at, reviewed_by)
    SELECT p_comp, tid, 'approved', now(), auth.uid()
    WHERE NOT EXISTS (SELECT 1 FROM comp_registrations WHERE comp_instance_id = p_comp AND team_id = tid);

    FOR tag IN SELECT trim(x) FROM jsonb_array_elements_text(coalesce(t->'players', '[]'::jsonb)) x LOOP
      IF tag = '' THEN CONTINUE; END IF;
      SELECT id INTO pid FROM players WHERE lower(gamertag) = lower(tag) AND deleted_at IS NULL LIMIT 1;
      IF pid IS NULL THEN
        INSERT INTO players (gamertag) VALUES (tag) RETURNING id INTO pid;
        made_players := made_players + 1;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM team_rosters WHERE team_id = tid AND player_id = pid AND left_at IS NULL) THEN
        INSERT INTO team_rosters (team_id, player_id, role, joined_at) VALUES (tid, pid, 'player', now());
      END IF;
      FOREACH gid IN ARRAY coalesce(game_ids, '{}') LOOP
        IF NOT EXISTS (SELECT 1 FROM player_game_assignments
                        WHERE comp_instance_id = p_comp AND team_id = tid AND player_id = pid AND game_title_id = gid) THEN
          INSERT INTO player_game_assignments (comp_instance_id, team_id, player_id, game_title_id, assigned_by)
          VALUES (p_comp, tid, pid, gid, auth.uid());
        END IF;
      END LOOP;
    END LOOP;

    out := out || jsonb_build_object('team_id', tid, 'name', tname);
  END LOOP;

  RETURN jsonb_build_object('teams', out, 'new_teams', made_teams, 'new_players', made_players);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Logo for several teams at once (used by the zip upload).
REVOKE ALL ON FUNCTION bulk_import_teams(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION bulk_import_teams(UUID, JSONB) TO authenticated;
