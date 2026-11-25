-- 1. Roster change history (who was swapped out / in, when, by whom)
-- 2. Cancelled matches: the contributor can ask to carry the recorded scores over; the organiser approves when rescheduling
-- 3. Cancel for good: walkover / forfeit win

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS cancel_carry_over boolean;

CREATE TABLE IF NOT EXISTS public.match_roster_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id uuid NOT NULL REFERENCES public.comp_instances(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('out', 'in')),
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_roster_changes_comp ON public.match_roster_changes (comp_instance_id, created_at DESC);
ALTER TABLE public.match_roster_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organiser contributor read roster changes" ON public.match_roster_changes;
CREATE POLICY "organiser contributor read roster changes" ON public.match_roster_changes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_admin()) OR (SELECT is_organiser_of(comp_instance_id))
    OR (match_id IS NOT NULL AND (SELECT is_assigned_contributor(match_id)))
  );

-- Roster changes are now logged
CREATE OR REPLACE FUNCTION public.change_match_roster(p_match uuid, p_team uuid, p_remove uuid[], p_add jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; pid uuid; item jsonb; tag text; n integer; was_active boolean;
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

  FOREACH pid IN ARRAY coalesce(p_remove, '{}') LOOP
    UPDATE player_game_assignments SET is_active = false
     WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
       AND team_id = p_team AND player_id = pid AND is_active;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO match_roster_changes (comp_instance_id, match_id, team_id, player_id, action, changed_by)
      VALUES (m.comp_instance_id, p_match, p_team, pid, 'out', auth.uid());
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM player_game_assignments WHERE team_id = p_team AND player_id = pid AND is_active
    ) THEN
      UPDATE team_rosters SET left_at = now() WHERE team_id = p_team AND player_id = pid AND left_at IS NULL;
    END IF;
  END LOOP;

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
    was_active := EXISTS (
      SELECT 1 FROM player_game_assignments
       WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
         AND team_id = p_team AND player_id = pid AND is_active
    );
    IF was_active THEN CONTINUE; END IF;
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
    INSERT INTO match_roster_changes (comp_instance_id, match_id, team_id, player_id, action, changed_by)
    VALUES (m.comp_instance_id, p_match, p_team, pid, 'in', auth.uid());
  END LOOP;
END;
$$;

-- Has any play been recorded in this match?
CREATE OR REPLACE FUNCTION public._match_has_play(p_match uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (SELECT 1 FROM match_events WHERE match_id = p_match AND is_void = false
                   AND event_type NOT IN ('map_selected', 'mode_selected'))
      OR EXISTS (SELECT 1 FROM match_maps WHERE match_id = p_match AND status = 'completed')
      OR EXISTS (SELECT 1 FROM match_scores WHERE match_id = p_match
                   AND (coalesce(home_current_score, 0) > 0 OR coalesce(away_current_score, 0) > 0));
$$;

-- The contributor says, after cancelling, whether recorded scores should carry over
CREATE OR REPLACE FUNCTION public.set_cancel_carry_over(p_match uuid, p_carry boolean)
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
  IF m.status <> 'cancelled' THEN RAISE EXCEPTION 'Only a cancelled match can have this set'; END IF;
  UPDATE matches SET cancel_carry_over = p_carry WHERE id = p_match;
END;
$$;

DROP FUNCTION IF EXISTS public.reschedule_match(uuid, timestamptz);

-- p_carry_over is the organiser's approval. Scores carry over only if the contributor asked AND the organiser approves.
CREATE OR REPLACE FUNCTION public.reschedule_match(p_match uuid, p_at timestamptz, p_carry_over boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; has_play boolean; carry boolean; hg numeric; ag numeric; is_fb boolean;
BEGIN
  SELECT comp_instance_id, status, game_title_id, team_home_id, team_away_id, cancel_carry_over
    INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR (auth_role() = 'organiser' AND is_organiser_of(m.comp_instance_id))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status NOT IN ('cancelled', 'delayed', 'scheduled') THEN
    RAISE EXCEPTION 'Only a cancelled, delayed or scheduled match can be rescheduled (this one is %)', m.status;
  END IF;
  IF p_at IS NULL THEN RAISE EXCEPTION 'Pick a date and time'; END IF;

  has_play := _match_has_play(p_match);
  carry := has_play AND coalesce(p_carry_over, false) AND coalesce(m.cancel_carry_over, false);

  IF has_play AND NOT carry THEN
    -- Start fresh: clear everything recorded so far
    UPDATE match_events SET is_void = true
     WHERE match_id = p_match AND is_void = false AND event_type NOT IN ('map_selected', 'mode_selected');
    UPDATE match_maps SET status = 'pending', home_score = 0, away_score = 0, map_winner = NULL,
           started_at = NULL, ended_at = NULL, duration_seconds = NULL
     WHERE match_id = p_match;
    UPDATE match_scores SET home_current_score = 0, away_current_score = 0, home_maps_won = 0, away_maps_won = 0
     WHERE match_id = p_match;
    UPDATE matches SET home_maps_won = 0, away_maps_won = 0 WHERE id = p_match;
  ELSIF has_play AND carry THEN
    -- Keep finished games and goals. A game that was in progress restarts from 0.
    UPDATE match_events SET is_void = true
     WHERE match_id = p_match AND is_void = false
       AND match_map_id IN (SELECT id FROM match_maps WHERE match_id = p_match AND status = 'live');
    UPDATE match_maps SET status = 'pending', home_score = 0, away_score = 0, map_winner = NULL,
           started_at = NULL, ended_at = NULL, duration_seconds = NULL
     WHERE match_id = p_match AND status = 'live';
    SELECT coalesce(ty.slug = 'football', false) INTO is_fb
      FROM game_titles gt LEFT JOIN game_types ty ON ty.id = gt.game_type_id WHERE gt.id = m.game_title_id;
    IF is_fb THEN
      SELECT coalesce(sum(CASE WHEN e.event_type IN ('goal', 'penalty_goal') AND e.team_id = m.team_home_id THEN e.value
                               WHEN e.event_type = 'own_goal' AND e.team_id = m.team_away_id THEN e.value ELSE 0 END), 0),
             coalesce(sum(CASE WHEN e.event_type IN ('goal', 'penalty_goal') AND e.team_id = m.team_away_id THEN e.value
                               WHEN e.event_type = 'own_goal' AND e.team_id = m.team_home_id THEN e.value ELSE 0 END), 0)
        INTO hg, ag FROM match_events e WHERE e.match_id = p_match AND e.is_void = false;
      UPDATE match_scores SET home_current_score = hg, away_current_score = ag WHERE match_id = p_match;
    ELSE
      UPDATE match_scores SET home_current_score = 0, away_current_score = 0 WHERE match_id = p_match;
    END IF;
  END IF;

  UPDATE matches
     SET scheduled_at = p_at, status = 'scheduled', started_at = NULL, ended_at = NULL, cancel_carry_over = NULL
   WHERE id = p_match;

  INSERT INTO match_status_log (match_id, old_status, new_status, triggered_by, reason)
  VALUES (p_match, m.status, 'scheduled', auth.uid(),
          CASE WHEN carry THEN 'Rescheduled, scores carried over'
               WHEN has_play THEN 'Rescheduled, scores cleared' ELSE 'Rescheduled' END);
END;
$$;

-- Cancel for good: one team is awarded the win (walkover / forfeit). The winner moves on in a bracket.
CREATE OR REPLACE FUNCTION public.declare_walkover(p_match uuid, p_winner uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD;
BEGIN
  SELECT comp_instance_id, status, team_home_id, team_away_id INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF NOT (is_admin() OR is_assigned_contributor(p_match) OR is_organiser_of(m.comp_instance_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF m.status NOT IN ('scheduled', 'delayed', 'live', 'cancelled') THEN
    RAISE EXCEPTION 'A % match cannot be awarded as a walkover', m.status;
  END IF;
  IF p_winner IS NULL OR (p_winner IS DISTINCT FROM m.team_home_id AND p_winner IS DISTINCT FROM m.team_away_id) THEN
    RAISE EXCEPTION 'Pick which team is awarded the win';
  END IF;
  IF coalesce(trim(p_reason), '') = '' THEN RAISE EXCEPTION 'Add a reason for the walkover'; END IF;

  UPDATE matches
     SET status = 'walkover', winner_team_id = p_winner, ended_at = now(), cancel_carry_over = NULL
   WHERE id = p_match;

  INSERT INTO match_status_log (match_id, old_status, new_status, triggered_by, reason)
  VALUES (p_match, m.status, 'walkover', auth.uid(), 'Walkover: ' || trim(p_reason));
END;
$$;

REVOKE EXECUTE ON FUNCTION public._match_has_play(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_cancel_carry_over(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reschedule_match(uuid, timestamptz, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.declare_walkover(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_cancel_carry_over(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_match(uuid, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.declare_walkover(uuid, uuid, text) TO authenticated;
