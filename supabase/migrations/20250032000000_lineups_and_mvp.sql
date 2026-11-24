-- Who played in a match, and the match MVP.
--  * set_match_lineup: the contributor (or organiser / admin) records which squad players played for one team.
--  * set_match_mvp: records the match MVP, who must be one of the players who played.
--  * matches.mvp_player_id stores the MVP so player pages can count it.

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS mvp_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_matches_mvp_player ON public.matches (mvp_player_id) WHERE mvp_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_match_lineups_player ON public.match_lineups (player_id);

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
  IF p_team IS DISTINCT FROM m.team_home_id AND p_team IS DISTINCT FROM m.team_away_id THEN
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

CREATE OR REPLACE FUNCTION public.set_match_mvp(p_match uuid, p_player uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD;
BEGIN
  SELECT comp_instance_id, status INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status IN ('completed', 'cancelled') AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match has ended, so the MVP can no longer be changed';
  END IF;
  IF p_player IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = p_match AND player_id = p_player
  ) THEN
    RAISE EXCEPTION 'The MVP must be a player who played in this match';
  END IF;
  UPDATE matches SET mvp_player_id = p_player WHERE id = p_match;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_match_lineup(uuid, uuid, uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_match_mvp(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_match_lineup(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_match_mvp(uuid, uuid) TO authenticated;
