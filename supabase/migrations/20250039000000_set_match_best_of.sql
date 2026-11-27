-- The contributor can set how many games a match has (best of N) before play starts.
-- The stage's best-of stays the default; this changes one match only.
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
  IF p_best_of IS NULL OR p_best_of < 1 OR p_best_of > 9 THEN
    RAISE EXCEPTION 'Pick between best of 1 and best of 9';
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
