-- MVP per game (map) plus an overall match MVP, both picked only once the game / games are finished.
ALTER TABLE public.match_maps ADD COLUMN IF NOT EXISTS mvp_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_map_mvp(p_map uuid, p_player uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE mm RECORD; m RECORD;
BEGIN
  SELECT id, match_id, status INTO mm FROM match_maps WHERE id = p_map;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not found'; END IF;
  SELECT comp_instance_id, status INTO m FROM matches WHERE id = mm.match_id;
  IF NOT (is_admin() OR is_assigned_contributor(mm.match_id) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status IN ('completed', 'cancelled') AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match has ended, so the MVP can no longer be changed';
  END IF;
  IF mm.status <> 'completed' THEN
    RAISE EXCEPTION 'Pick the MVP once the game has ended';
  END IF;
  IF p_player IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = mm.match_id AND player_id = p_player
  ) THEN
    RAISE EXCEPTION 'The MVP must be a player who played in this match';
  END IF;
  UPDATE match_maps SET mvp_player_id = p_player WHERE id = p_map;
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
  -- The overall MVP is picked once the games are finished
  IF p_player IS NOT NULL AND EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match) THEN
    IF EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match AND status = 'live')
       OR NOT EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match AND status = 'completed') THEN
      RAISE EXCEPTION 'Pick the match MVP once the games are finished';
    END IF;
  END IF;
  IF p_player IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = p_match AND player_id = p_player
  ) THEN
    RAISE EXCEPTION 'The MVP must be a player who played in this match';
  END IF;
  UPDATE matches SET mvp_player_id = p_player WHERE id = p_match;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_map_mvp(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_map_mvp(uuid, uuid) TO authenticated;
