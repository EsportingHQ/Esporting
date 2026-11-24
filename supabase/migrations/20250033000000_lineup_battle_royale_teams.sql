-- Battle royale lobbies have many teams (match_participants), not just a home and away team.
-- Let the lineup be recorded for any of them.

CREATE OR REPLACE FUNCTION public.set_match_lineup(p_match uuid, p_team uuid, p_players uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; pid uuid;
BEGIN
  SELECT comp_instance_id, game_title_id, team_home_id, team_away_id, status, mvp_player_id
    INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF p_team IS DISTINCT FROM m.team_home_id AND p_team IS DISTINCT FROM m.team_away_id
     AND NOT EXISTS (SELECT 1 FROM match_participants WHERE match_id = p_match AND team_id = p_team) THEN
    RAISE EXCEPTION 'That team is not playing this match';
  END IF;
  IF m.status IN ('completed', 'cancelled') AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match has ended, so who played can no longer be changed';
  END IF;

  FOREACH pid IN ARRAY coalesce(p_players, '{}') LOOP
    IF NOT EXISTS (
      SELECT 1 FROM player_game_assignments
       WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
         AND team_id = p_team AND player_id = pid AND is_active
    ) THEN
      RAISE EXCEPTION 'A selected player is not on this team''s squad for this game';
    END IF;
  END LOOP;

  DELETE FROM match_lineups WHERE match_id = p_match AND team_id = p_team;
  INSERT INTO match_lineups (match_id, team_id, player_id, role, confirmed)
  SELECT p_match, p_team, x, 'starter', true FROM unnest(coalesce(p_players, '{}')) AS x;

  -- An MVP who is no longer in the lineup is cleared
  IF m.mvp_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = p_match AND player_id = m.mvp_player_id
  ) THEN
    UPDATE matches SET mvp_player_id = NULL WHERE id = p_match;
  END IF;
END;
$$;
