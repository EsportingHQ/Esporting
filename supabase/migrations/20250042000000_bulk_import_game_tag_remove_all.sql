-- 1. Bulk import: optional team tag, player real name, and an optional single game to assign the roster to.
--    p_teams = [{"name":"Fnatic","tag":"FNC","players":["Kori", {"gamertag":"Ezra","name":"Ezra Obi"}]}, ...]
--    p_game NULL = every game of the competition (old behaviour).
DROP FUNCTION IF EXISTS bulk_import_teams(UUID, JSONB);
CREATE OR REPLACE FUNCTION bulk_import_teams(p_comp UUID, p_teams JSONB, p_game UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  t JSONB; pl JSONB; tname TEXT; ttag TEXT; tslug TEXT; tid UUID; pid UUID; tag TEXT; pname TEXT; gid UUID;
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

  IF p_game IS NULL THEN
    SELECT array_agg(game_title_id) INTO game_ids FROM comp_game_titles WHERE comp_instance_id = p_comp;
  ELSE
    SELECT array_agg(game_title_id) INTO game_ids FROM comp_game_titles WHERE comp_instance_id = p_comp AND game_title_id = p_game;
    IF game_ids IS NULL THEN RAISE EXCEPTION 'That game is not part of this competition'; END IF;
  END IF;

  FOR t IN SELECT * FROM jsonb_array_elements(p_teams) LOOP
    tname := trim(t->>'name');
    IF coalesce(tname, '') = '' THEN CONTINUE; END IF;
    tslug := trim(both '-' from regexp_replace(lower(tname), '[^a-z0-9]+', '-', 'g'));
    IF tslug = '' THEN CONTINUE; END IF;
    ttag := nullif(upper(left(trim(coalesce(t->>'tag', '')), 8)), '');

    SELECT id INTO tid FROM teams WHERE slug = tslug AND deleted_at IS NULL LIMIT 1;
    IF tid IS NULL THEN
      INSERT INTO teams (name, slug, short_code, created_by) VALUES (tname, tslug, ttag, auth.uid()) RETURNING id INTO tid;
      made_teams := made_teams + 1;
    ELSIF ttag IS NOT NULL THEN
      UPDATE teams SET short_code = ttag WHERE id = tid AND short_code IS NULL;
    END IF;

    INSERT INTO comp_registrations (comp_instance_id, team_id, status, reviewed_at, reviewed_by)
    SELECT p_comp, tid, 'approved', now(), auth.uid()
    WHERE NOT EXISTS (SELECT 1 FROM comp_registrations WHERE comp_instance_id = p_comp AND team_id = tid);

    FOR pl IN SELECT * FROM jsonb_array_elements(coalesce(t->'players', '[]'::jsonb)) LOOP
      IF jsonb_typeof(pl) = 'object' THEN
        tag := trim(coalesce(pl->>'gamertag', ''));
        pname := nullif(trim(coalesce(pl->>'name', '')), '');
      ELSE
        tag := trim(both '"' from trim(pl::text));
        pname := NULL;
      END IF;
      IF tag = '' THEN CONTINUE; END IF;
      SELECT id INTO pid FROM players WHERE lower(gamertag) = lower(tag) AND deleted_at IS NULL LIMIT 1;
      IF pid IS NULL THEN
        INSERT INTO players (gamertag, real_name) VALUES (tag, pname) RETURNING id INTO pid;
        made_players := made_players + 1;
      ELSIF pname IS NOT NULL THEN
        UPDATE players SET real_name = pname WHERE id = pid AND real_name IS NULL;
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
REVOKE ALL ON FUNCTION bulk_import_teams(UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION bulk_import_teams(UUID, JSONB, UUID) TO authenticated;

-- 2. Remove every team from a competition (for a wrong bulk import). Only before any match exists.
--    Teams and players that only existed because of this competition are soft-deleted too, so they
--    do not linger in the Teams directory. Teams used anywhere else are kept.
CREATE OR REPLACE FUNCTION remove_all_comp_teams(p_comp UUID)
RETURNS JSONB AS $$
DECLARE
  st TEXT; org UUID; removed INT; gone UUID[]; gone_teams INT := 0; gone_players INT := 0; tid UUID;
BEGIN
  SELECT status, organiser_id INTO st, org FROM comp_instances WHERE id = p_comp AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Competition not found'; END IF;
  IF NOT (is_admin() OR org = auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF st NOT IN ('draft', 'registration') THEN
    RAISE EXCEPTION 'Teams can only be cleared while the competition is in draft or registration';
  END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE comp_instance_id = p_comp AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This competition already has matches. Remove the fixtures first.';
  END IF;
  SELECT coalesce(array_agg(team_id), '{}') INTO gone FROM comp_registrations WHERE comp_instance_id = p_comp;

  DELETE FROM player_game_assignments WHERE comp_instance_id = p_comp;
  DELETE FROM comp_registrations WHERE comp_instance_id = p_comp;
  GET DIAGNOSTICS removed = ROW_COUNT;

  FOREACH tid IN ARRAY gone LOOP
    IF NOT EXISTS (SELECT 1 FROM comp_registrations WHERE team_id = tid)
       AND NOT EXISTS (SELECT 1 FROM matches WHERE team_home_id = tid OR team_away_id = tid)
       AND EXISTS (SELECT 1 FROM teams WHERE id = tid AND deleted_at IS NULL AND (created_by = auth.uid() OR is_admin())) THEN
      UPDATE teams SET deleted_at = now() WHERE id = tid;
      gone_teams := gone_teams + 1;
      UPDATE players p SET deleted_at = now()
       WHERE p.deleted_at IS NULL AND p.user_id IS NULL
         AND EXISTS (SELECT 1 FROM team_rosters r WHERE r.player_id = p.id AND r.team_id = tid)
         AND NOT EXISTS (SELECT 1 FROM team_rosters r WHERE r.player_id = p.id AND r.team_id <> tid)
         AND NOT EXISTS (SELECT 1 FROM player_game_assignments a WHERE a.player_id = p.id)
         AND NOT EXISTS (SELECT 1 FROM match_lineups l WHERE l.player_id = p.id);
      GET DIAGNOSTICS removed = ROW_COUNT;
      gone_players := gone_players + removed;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('registrations_removed', coalesce(array_length(gone, 1), 0), 'teams_deleted', gone_teams, 'players_deleted', gone_players);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION remove_all_comp_teams(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION remove_all_comp_teams(UUID) TO authenticated;
