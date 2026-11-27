-- 1. Fixture and bracket generators created game slots themselves, but since migration 37 a trigger
--    already creates them, so generating fixtures failed with "match_maps_match_id_map_number_key".
--    The generators now skip slots that already exist.
-- 2. The series length cap rises from 9 to 99 (the database limit) so contributors can step it freely.

CREATE OR REPLACE FUNCTION _insert_fixture(
  p_comp UUID, p_stage UUID, p_group UUID, p_game UUID, p_home UUID, p_away UUID, p_best_of INT, p_note TEXT
) RETURNS VOID AS $$
DECLARE mid UUID;
BEGIN
  INSERT INTO matches (comp_instance_id, stage_id, group_id, game_title_id, match_format,
                       team_home_id, team_away_id, best_of, status, notes, assignment_mode)
  VALUES (p_comp, p_stage, p_group, p_game, 'head_to_head', p_home, p_away, p_best_of, 'scheduled', p_note, 'assigned')
  RETURNING id INTO mid;
  INSERT INTO match_maps (match_id, map_number, status)
  SELECT mid, n, 'pending' FROM generate_series(1, greatest(p_best_of, 1)) n
  ON CONFLICT (match_id, map_number) DO NOTHING;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION _insert_bracket_match(
  p_comp UUID, p_stage UUID, p_game UUID, p_home UUID, p_away UUID, p_best_of INT, p_round INT, p_slot INT
) RETURNS UUID AS $$
DECLARE mid UUID;
BEGIN
  INSERT INTO matches (comp_instance_id, stage_id, game_title_id, match_format, team_home_id, team_away_id,
                       best_of, status, notes, assignment_mode, bracket_round, bracket_slot)
  VALUES (p_comp, p_stage, p_game, 'head_to_head', p_home, p_away, p_best_of, 'scheduled',
          'Round ' || p_round, 'assigned', p_round, p_slot)
  RETURNING id INTO mid;
  INSERT INTO match_maps (match_id, map_number, status)
  SELECT mid, n, 'pending' FROM generate_series(1, greatest(p_best_of, 1)) n
  ON CONFLICT (match_id, map_number) DO NOTHING;
  RETURN mid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_match_best_of(p_match uuid, p_best_of integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD;
BEGIN
  SELECT comp_instance_id, status, match_format, best_of INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.match_format <> 'head_to_head' THEN RAISE EXCEPTION 'Only head-to-head matches have a series length'; END IF;
  IF m.status NOT IN ('scheduled', 'delayed', 'live') THEN
    RAISE EXCEPTION 'The series length can no longer be changed (this match is %)', m.status;
  END IF;
  IF p_best_of IS NULL OR p_best_of < 1 OR p_best_of > 99 THEN
    RAISE EXCEPTION 'Pick between best of 1 and best of 99';
  END IF;
  IF _match_has_play(p_match)
     OR EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match AND status IN ('live', 'completed')) THEN
    RAISE EXCEPTION 'The series length is locked once a game has been played';
  END IF;

  DELETE FROM match_maps WHERE match_id = p_match AND status = 'pending' AND map_number > p_best_of;
  INSERT INTO match_maps (match_id, map_number, status)
  SELECT p_match, g, 'pending' FROM generate_series(1, p_best_of) g
   WHERE NOT EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match AND map_number = g);
  UPDATE matches SET best_of = p_best_of WHERE id = p_match;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_match_best_of(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_match_best_of(uuid, integer) TO authenticated;
