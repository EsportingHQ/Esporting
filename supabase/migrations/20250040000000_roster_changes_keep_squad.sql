-- Roster changes are per match. A player taken out of one match stays on the team (squad); only that match's
-- line-up changes, so they can play the next one. New players are added to the squad as well.

-- Anyone can see a match's roster changes (shown on the public match page)
DROP POLICY IF EXISTS "public read roster changes" ON public.match_roster_changes;
CREATE POLICY "public read roster changes" ON public.match_roster_changes FOR SELECT TO anon, authenticated USING (true);

-- Who plays this match by default: what is already confirmed, else the team's most recent line-up for this
-- game in this competition, else the whole active squad.
CREATE OR REPLACE FUNCTION public.default_match_lineup(p_match uuid, p_team uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; prev uuid; res uuid[];
BEGIN
  SELECT comp_instance_id, game_title_id INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND THEN RETURN '{}'; END IF;

  SELECT array_agg(player_id) INTO res FROM match_lineups WHERE match_id = p_match AND team_id = p_team;
  IF res IS NOT NULL THEN RETURN res; END IF;

  SELECT m2.id INTO prev
    FROM matches m2
   WHERE m2.comp_instance_id = m.comp_instance_id AND m2.game_title_id = m.game_title_id
     AND m2.id <> p_match AND m2.deleted_at IS NULL
     AND EXISTS (SELECT 1 FROM match_lineups ml WHERE ml.match_id = m2.id AND ml.team_id = p_team)
   ORDER BY coalesce(m2.ended_at, m2.started_at, m2.scheduled_at) DESC NULLS LAST
   LIMIT 1;

  IF prev IS NOT NULL THEN
    SELECT array_agg(ml.player_id) INTO res
      FROM match_lineups ml
     WHERE ml.match_id = prev AND ml.team_id = p_team
       AND EXISTS (SELECT 1 FROM player_game_assignments pga
                    WHERE pga.comp_instance_id = m.comp_instance_id AND pga.game_title_id = m.game_title_id
                      AND pga.team_id = p_team AND pga.player_id = ml.player_id AND pga.is_active);
    IF res IS NOT NULL THEN RETURN res; END IF;
  END IF;

  SELECT array_agg(pga.player_id) INTO res
    FROM player_game_assignments pga
   WHERE pga.comp_instance_id = m.comp_instance_id AND pga.game_title_id = m.game_title_id
     AND pga.team_id = p_team AND pga.is_active;
  RETURN coalesce(res, '{}');
END;
$$;
GRANT EXECUTE ON FUNCTION public.default_match_lineup(uuid, uuid) TO anon, authenticated;

-- Confirming keeps a line-up that already exists; otherwise it uses the default
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
    IF NOT EXISTS (SELECT 1 FROM match_lineups WHERE match_id = p_match AND team_id = tid) THEN
      INSERT INTO match_lineups (match_id, team_id, player_id, role, confirmed)
      SELECT p_match, tid, x, 'starter', true FROM unnest(default_match_lineup(p_match, tid)) AS x
      ON CONFLICT (match_id, team_id, player_id) DO NOTHING;
      GET DIAGNOSTICS c = ROW_COUNT;
      n := n + c;
    END IF;
  END LOOP;
  RETURN n;
END;
$$;

-- p_remove: players taken out of this match (they stay on the team).
-- p_add: [{player_id}] for someone from the team's bench, or [{gamertag}] for a brand-new player.
CREATE OR REPLACE FUNCTION public.change_match_roster(p_match uuid, p_team uuid, p_remove uuid[], p_add jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE m RECORD; pid uuid; item jsonb; tag text; n integer;
BEGIN
  SELECT comp_instance_id, game_title_id, status, mvp_player_id INTO m FROM matches WHERE id = p_match;
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

  -- Make sure this match has a line-up for the team to change
  IF NOT EXISTS (SELECT 1 FROM match_lineups WHERE match_id = p_match AND team_id = p_team) THEN
    INSERT INTO match_lineups (match_id, team_id, player_id, role, confirmed)
    SELECT p_match, p_team, x, 'starter', true FROM unnest(default_match_lineup(p_match, p_team)) AS x
    ON CONFLICT (match_id, team_id, player_id) DO NOTHING;
  END IF;

  FOREACH pid IN ARRAY coalesce(p_remove, '{}') LOOP
    DELETE FROM match_lineups WHERE match_id = p_match AND team_id = p_team AND player_id = pid;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO match_roster_changes (comp_instance_id, match_id, team_id, player_id, action, changed_by)
      VALUES (m.comp_instance_id, p_match, p_team, pid, 'out', auth.uid());
    END IF;
  END LOOP;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p_add, '[]'::jsonb)) LOOP
    pid := NULL;
    IF coalesce(item->>'player_id', '') <> '' THEN
      pid := (item->>'player_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM players WHERE id = pid AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'That player was not found';
      END IF;
    ELSE
      tag := trim(coalesce(item->>'gamertag', ''));
      IF tag = '' THEN CONTINUE; END IF;
      SELECT id INTO pid FROM players WHERE lower(gamertag) = lower(tag) AND deleted_at IS NULL LIMIT 1;
      IF pid IS NULL THEN
        INSERT INTO players (gamertag, real_name) VALUES (tag, nullif(trim(coalesce(item->>'real_name', '')), ''))
        RETURNING id INTO pid;
      END IF;
    END IF;

    -- Anyone who plays is part of the team's squad for this game
    IF NOT EXISTS (SELECT 1 FROM team_rosters WHERE team_id = p_team AND player_id = pid AND left_at IS NULL) THEN
      INSERT INTO team_rosters (team_id, player_id, role, joined_at) VALUES (p_team, pid, 'player', now());
    END IF;
    IF EXISTS (SELECT 1 FROM player_game_assignments
                WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
                  AND team_id = p_team AND player_id = pid) THEN
      UPDATE player_game_assignments SET is_active = true
       WHERE comp_instance_id = m.comp_instance_id AND game_title_id = m.game_title_id
         AND team_id = p_team AND player_id = pid AND NOT is_active;
    ELSE
      INSERT INTO player_game_assignments (comp_instance_id, team_id, player_id, game_title_id, assigned_by, is_active)
      VALUES (m.comp_instance_id, p_team, pid, m.game_title_id, auth.uid(), true);
    END IF;

    INSERT INTO match_lineups (match_id, team_id, player_id, role, confirmed)
    VALUES (p_match, p_team, pid, 'starter', true)
    ON CONFLICT (match_id, team_id, player_id) DO NOTHING;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN
      INSERT INTO match_roster_changes (comp_instance_id, match_id, team_id, player_id, action, changed_by)
      VALUES (m.comp_instance_id, p_match, p_team, pid, 'in', auth.uid());
    END IF;
  END LOOP;

  IF m.mvp_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM match_lineups WHERE match_id = p_match AND player_id = m.mvp_player_id
  ) THEN
    UPDATE matches SET mvp_player_id = NULL WHERE id = p_match;
  END IF;
END;
$$;
