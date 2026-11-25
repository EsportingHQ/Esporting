-- Rescheduling a cancelled (or delayed) match keeps the same match row, so its bracket slot and
-- "winner goes to the next round" link stay intact.
--  * The 8-hour time lock no longer blocks changing the time of a match that was cancelled or delayed.
--  * reschedule_match puts it back to 'scheduled' on the new time and logs it.

CREATE OR REPLACE FUNCTION public.enforce_fixture_time_rule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.external_source IS NOT NULL OR NEW.scheduled_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;
  IF NEW.scheduled_at < now() + interval '8 hours' THEN
    RAISE EXCEPTION 'Fixture times must be set at least 8 hours before kickoff.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.scheduled_at IS NOT NULL AND OLD.scheduled_at < now() + interval '8 hours'
     AND OLD.status NOT IN ('cancelled', 'delayed') THEN
    RAISE EXCEPTION 'This match starts in under 8 hours, so its time is locked. Ask an Esporting admin to change it.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reschedule_match(p_match uuid, p_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; played integer;
BEGIN
  SELECT comp_instance_id, status INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR (auth_role() = 'organiser' AND is_organiser_of(m.comp_instance_id))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status NOT IN ('cancelled', 'delayed', 'scheduled') THEN
    RAISE EXCEPTION 'Only a cancelled, delayed or scheduled match can be rescheduled (this one is %)', m.status;
  END IF;
  IF p_at IS NULL THEN RAISE EXCEPTION 'Pick a date and time'; END IF;

  -- A match that already had play recorded would carry old scores into the new date
  SELECT count(*) INTO played FROM match_events
   WHERE match_id = p_match AND event_type NOT IN ('map_selected', 'mode_selected');
  IF played > 0 AND NOT is_admin() THEN
    RAISE EXCEPTION 'This match already had play recorded before it was cancelled. Ask an Esporting admin to reschedule it.';
  END IF;

  UPDATE matches
     SET scheduled_at = p_at, status = 'scheduled', started_at = NULL, ended_at = NULL
   WHERE id = p_match;

  INSERT INTO match_status_log (match_id, old_status, new_status, triggered_by, reason)
  VALUES (p_match, m.status, 'scheduled', auth.uid(), 'Rescheduled');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_match(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_match(uuid, timestamptz) TO authenticated;
