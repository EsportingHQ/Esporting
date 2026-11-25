-- Rosters are locked in when the team registers. Before a match, the contributor either confirms
-- the rosters as they are, or records changes (players out, new players in), then confirms.
-- Confirming records the whole squad as that match's lineup, so the match counts toward
-- every confirmed player's form. At the end of the match only the MVP is picked.

CREATE OR REPLACE FUNCTION public._match_teams(p_match uuid)
RETURNS TABLE (team_id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT t FROM (
    SELECT team_home_id AS t FROM matches WHERE id = p_match
    UNION SELECT team_away_id FROM matches WHERE id = p_match
    UNION SELECT mp.team_id FROM match_participants mp WHERE mp.match_id = p_match
  ) x WHERE t IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.confirm_match_roster(p_match uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; tid uuid; n integer := 0; c integer;
BEGIN
  SELECT comp_instance_id, game_title_id, status, mvp_player_id INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status IN ('completed', 'cancelled') AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match has ended, so rosters can no longer be changed';
  END IF;

  FOR tid IN SELECT team_id FROM _match_teams(p_match) LOOP
    DELETE FROM match_lineups WHERE match_id = p_match AND team_id = tid;
    INSERT INTO match_lineups (match_id, team_id, player_id, role, confirmed)
    SELECT p_match, tid, pga.player_id, 'starter', true
      FROM player_game_assignments pga
     WHERE pga.comp_instance_id = m.comp_instance_id AND pga.game_title_id = m.game_title_id
       AND pga.team_id = tid AND pga.is_active
    ON CONFLICT (match_id, team_id, player_id) DO NOTHING;
    GET DIAGNOSTICS c = ROW_COUNT;
    n := n + c;
  END LOOP;

  IF m.mvp_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = p_match AND player_id = m.mvp_player_id
  ) THEN
    UPDATE matches SET mvp_player_id = NULL WHERE id = p_match;
  END IF;
  RETURN n;
END;
$$;

-- p_add is a JSON array like [{"gamertag":"Kaka","real_name":"Kaka O."}]; new players are created if needed.
CREATE OR REPLACE FUNCTION public.change_match_roster(p_match uuid, p_team uuid, p_remove uuid[], p_add jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; pid uuid; item jsonb; tag text;
BEGIN
  SELECT comp_instance_id, game_title_id, status INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status IN ('completed', 'cancelled') AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match has ended, so rosters can no longer be changed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM _match_teams(p_match) WHERE team_id = p_team) THEN
    RAISE EXCEPTION 'That team is not playing this match';
  END IF;

  -- Players out: they leave this competition's squad for this game, history is kept
  FOREACH pid IN ARRAY coalesce(p_remove, '{}') LOOP
    UPDATE player_game_assignments SET is_active = false
     WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
       AND team_id = p_team AND player_id = pid;
    IF NOT EXISTS (
      SELECT 1 FROM player_game_assignments WHERE team_id = p_team AND player_id = pid AND is_active
    ) THEN
      UPDATE team_rosters SET left_at = now() WHERE team_id = p_team AND player_id = pid AND left_at IS NULL;
    END IF;
  END LOOP;

  -- Players in: reuse the player if the gamertag exists, otherwise create them
  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_add, '[]'::jsonb)) LOOP
    tag := trim(coalesce(item->>'gamertag', ''));
    IF tag = '' THEN CONTINUE; END IF;
    SELECT id INTO pid FROM players WHERE lower(gamertag) = lower(tag) AND deleted_at IS NULL LIMIT 1;
    IF pid IS NULL THEN
      INSERT INTO players (gamertag, real_name) VALUES (tag, nullif(trim(coalesce(item->>'real_name', '')), ''))
      RETURNING id INTO pid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM team_rosters WHERE team_id = p_team AND player_id = pid AND left_at IS NULL) THEN
      INSERT INTO team_rosters (team_id, player_id, role, joined_at) VALUES (p_team, pid, 'player', now());
    END IF;
    IF EXISTS (
      SELECT 1 FROM player_game_assignments
       WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id AND team_id = p_team AND player_id = pid
    ) THEN
      UPDATE player_game_assignments SET is_active = true
       WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id AND team_id = p_team AND player_id = pid;
    ELSE
      INSERT INTO player_game_assignments (comp_instance_id, team_id, player_id, game_title_id, assigned_by, is_active)
      VALUES (m.comp_instance_id, p_team, pid, m.game_title_id, auth.uid(), true);
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._match_teams(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_match_roster(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.change_match_roster(uuid, uuid, uuid[], jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_match_roster(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_match_roster(uuid, uuid, uuid[], jsonb) TO authenticated;
