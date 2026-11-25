-- 1. Every head-to-head match gets its game slots (best_of, at least 1) when it is created,
--    so the contributor never lands on a match with "No games have been created".
CREATE OR REPLACE FUNCTION public.create_default_match_maps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.match_format = 'head_to_head'
     AND NOT EXISTS (SELECT 1 FROM match_maps WHERE match_id = NEW.id) THEN
    INSERT INTO match_maps (match_id, map_number, status)
    SELECT NEW.id, g, 'pending' FROM generate_series(1, greatest(coalesce(NEW.best_of, 1), 1)) g;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.create_default_match_maps() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_default_match_maps ON public.matches;
CREATE TRIGGER trg_default_match_maps AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.create_default_match_maps();

-- Backfill matches that were created without game slots
INSERT INTO match_maps (match_id, map_number, status)
SELECT m.id, g, 'pending'
  FROM matches m, LATERAL generate_series(1, greatest(coalesce(m.best_of, 1), 1)) g
 WHERE m.deleted_at IS NULL AND m.match_format = 'head_to_head'
   AND NOT EXISTS (SELECT 1 FROM match_maps mm WHERE mm.match_id = m.id);

-- 2. Cancel for good (duplicates, mistakes). Removes the match everywhere; the status log keeps the record.
CREATE OR REPLACE FUNCTION public.cancel_match_permanently(p_match uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD;
BEGIN
  SELECT comp_instance_id, status, bracket_round, next_match_id INTO m
    FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR (auth_role() = 'organiser' AND is_organiser_of(m.comp_instance_id))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status IN ('completed', 'live') THEN
    RAISE EXCEPTION 'A % match cannot be removed', m.status;
  END IF;
  IF m.bracket_round IS NOT NULL THEN
    RAISE EXCEPTION 'This match is part of the bracket. Award a walkover instead, so the bracket can move on';
  END IF;
  UPDATE matches SET deleted_at = now() WHERE id = p_match;
  INSERT INTO match_status_log (match_id, old_status, new_status, triggered_by, reason)
  VALUES (p_match, m.status, 'cancelled', auth.uid(),
          'Cancelled permanently' || CASE WHEN coalesce(trim(p_reason), '') <> '' THEN ': ' || trim(p_reason) ELSE '' END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cancel_match_permanently(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_match_permanently(uuid, text) TO authenticated;
