-- Fixture generation (league / groups / knockout) and the 48-hour fixture-time rule.
--
-- generate_fixtures        round-robin for league and group stages, first round for knockouts
-- generate_next_knockout   pairs the surviving teams once every match of the stage is finished
-- clear_stage_fixtures     removes not-yet-started fixtures of a stage so they can be regenerated
-- enforce_fixture_time_rule  organisers must set a kickoff at least 48 hours ahead, and cannot
--                            move a match that starts in under 48 hours (admins can).

CREATE OR REPLACE FUNCTION _fixture_games(p_comp UUID, p_game UUID)
RETURNS TABLE (id UUID) AS $$
  SELECT gt.id FROM comp_game_titles cg
  JOIN game_titles gt ON gt.id = cg.game_title_id
  WHERE cg.comp_instance_id = p_comp
    AND (p_game IS NULL OR gt.id = p_game)
    AND gt.slug NOT LIKE '%-br'      -- battle royale games have lobbies, not head-to-head fixtures
$$ LANGUAGE sql STABLE SET search_path = public;

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
  SELECT mid, n, 'pending' FROM generate_series(1, greatest(p_best_of, 1)) n;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION _can_run_fixtures(p_comp UUID) RETURNS VOID AS $$
DECLARE st TEXT;
BEGIN
  IF NOT (is_admin() OR (auth_role() = 'organiser' AND is_organiser_of(p_comp))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT status INTO st FROM comp_instances WHERE id = p_comp AND deleted_at IS NULL;
  IF st IS NULL THEN RAISE EXCEPTION 'Competition not found'; END IF;
  IF st NOT IN ('draft', 'registration', 'ongoing') THEN
    RAISE EXCEPTION 'This competition is % and fixtures can no longer change', st;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION generate_fixtures(
  p_comp UUID, p_stage UUID, p_groups INT DEFAULT 1, p_double BOOLEAN DEFAULT false
) RETURNS INT AS $$
DECLARE
  s comp_stages%ROWTYPE;
  teams UUID[];
  n INT; g INT; gi INT; gid UUID;
  grp UUID[]; arr UUID[]; m INT; r INT; i INT;
  h UUID; a UUID; leg INT; round_no INT;
  game UUID; games UUID[];
  made INT := 0;
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  SELECT * INTO s FROM comp_stages WHERE id = p_stage AND comp_instance_id = p_comp;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stage not found'; END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This stage already has fixtures. Clear them first to generate again.';
  END IF;
  IF s.stage_type = 'ranking' THEN
    RAISE EXCEPTION 'Ranking stages use lobbies, not generated fixtures';
  END IF;

  SELECT array_agg(team_id ORDER BY random()) INTO teams
    FROM comp_registrations WHERE comp_instance_id = p_comp AND status = 'approved';
  n := coalesce(array_length(teams, 1), 0);
  IF n < 2 THEN RAISE EXCEPTION 'Register at least 2 teams first'; END IF;

  SELECT array_agg(id) INTO games FROM _fixture_games(p_comp, s.game_title_id);
  IF games IS NULL THEN RAISE EXCEPTION 'This competition has no head-to-head game to generate fixtures for'; END IF;

  -- ---------------- knockout: first round only ----------------
  IF s.stage_type = 'knockout' THEN
    IF array_length(games, 1) > 1 THEN
      RAISE EXCEPTION 'A knockout needs one game. Set the stage to a single game.';
    END IF;
    game := games[1];
    i := 1;
    WHILE i + 1 <= n LOOP
      PERFORM _insert_fixture(p_comp, p_stage, NULL, game, teams[i], teams[i + 1], s.best_of, 'Round 1');
      made := made + 1;
      i := i + 2;
    END LOOP;
    RETURN made;
  END IF;

  -- ---------------- league / group: round robin ----------------
  g := CASE WHEN s.stage_type = 'group' THEN greatest(p_groups, 1) ELSE 1 END;
  IF n / g < 2 THEN
    RAISE EXCEPTION 'Not enough teams for % groups. Each group needs at least 2 teams.', g;
  END IF;

  FOR gi IN 1..g LOOP
    grp := '{}';
    i := gi;
    WHILE i <= n LOOP
      grp := grp || teams[i];
      i := i + g;
    END LOOP;

    gid := NULL;
    IF s.stage_type = 'group' THEN
      INSERT INTO comp_groups (stage_id, name) VALUES (p_stage, 'Group ' || chr(64 + gi)) RETURNING id INTO gid;
      UPDATE comp_registrations SET group_id = gid
       WHERE comp_instance_id = p_comp AND team_id = ANY (grp);
    END IF;

    arr := grp;
    IF array_length(arr, 1) % 2 = 1 THEN arr := arr || NULL::uuid; END IF;  -- bye slot
    m := array_length(arr, 1);

    FOR leg IN 1..(CASE WHEN p_double THEN 2 ELSE 1 END) LOOP
      FOR r IN 0..(m - 2) LOOP
        round_no := r + 1 + (leg - 1) * (m - 1);
        FOR i IN 1..(m / 2) LOOP
          h := arr[i]; a := arr[m + 1 - i];
          IF h IS NULL OR a IS NULL THEN CONTINUE; END IF;
          IF (i = 1 AND r % 2 = 1) THEN  -- keep the fixed team from always being home
            h := arr[m + 1 - i]; a := arr[i];
          END IF;
          IF leg = 2 THEN  -- return leg: swap home and away
            FOREACH game IN ARRAY games LOOP
              PERFORM _insert_fixture(p_comp, p_stage, gid, game, a, h, s.best_of, 'Round ' || round_no);
              made := made + 1;
            END LOOP;
          ELSE
            FOREACH game IN ARRAY games LOOP
              PERFORM _insert_fixture(p_comp, p_stage, gid, game, h, a, s.best_of, 'Round ' || round_no);
              made := made + 1;
            END LOOP;
          END IF;
        END LOOP;
        -- rotate everyone except the first slot
        arr := ARRAY[arr[1], arr[m]] || arr[2:m - 1];
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN made;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pairs the teams still alive once every match in the knockout stage is finished.
CREATE OR REPLACE FUNCTION generate_next_knockout_round(p_comp UUID, p_stage UUID)
RETURNS INT AS $$
DECLARE
  s comp_stages%ROWTYPE;
  alive UUID[]; k INT; i INT; made INT := 0; last_round INT; game UUID;
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  SELECT * INTO s FROM comp_stages WHERE id = p_stage AND comp_instance_id = p_comp;
  IF NOT FOUND OR s.stage_type <> 'knockout' THEN RAISE EXCEPTION 'Not a knockout stage'; END IF;

  IF NOT EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Generate the first round before the next one';
  END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL
             AND status NOT IN ('completed', 'walkover', 'cancelled')) THEN
    RAISE EXCEPTION 'Finish every match in the current round first';
  END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL
             AND status IN ('completed', 'walkover') AND winner_team_id IS NULL) THEN
    RAISE EXCEPTION 'A knockout match has no winner. Fix the result first.';
  END IF;

  SELECT max(substring(notes FROM 'Round (\d+)')::int) INTO last_round
    FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL;

  -- alive = registered teams that have not lost a finished match in this stage
  SELECT array_agg(cr.team_id ORDER BY random()) INTO alive
    FROM comp_registrations cr
   WHERE cr.comp_instance_id = p_comp AND cr.status = 'approved'
     AND NOT EXISTS (
       SELECT 1 FROM matches mt
        WHERE mt.stage_id = p_stage AND mt.deleted_at IS NULL
          AND mt.status IN ('completed', 'walkover') AND mt.winner_team_id IS NOT NULL
          AND cr.team_id IN (mt.team_home_id, mt.team_away_id) AND mt.winner_team_id <> cr.team_id);
  k := coalesce(array_length(alive, 1), 0);
  IF k <= 1 THEN RAISE EXCEPTION 'The knockout is finished. There is a champion.'; END IF;

  SELECT gm.id INTO game FROM _fixture_games(p_comp, s.game_title_id) gm LIMIT 1;
  i := 1;
  WHILE i + 1 <= k LOOP
    PERFORM _insert_fixture(p_comp, p_stage, NULL, game, alive[i], alive[i + 1], s.best_of, 'Round ' || (last_round + 1));
    made := made + 1;
    i := i + 2;
  END LOOP;
  RETURN made;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION clear_stage_fixtures(p_comp UUID, p_stage UUID) RETURNS INT AS $$
DECLARE removed INT;
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL
             AND status NOT IN ('scheduled', 'delayed')) THEN
    RAISE EXCEPTION 'Some matches in this stage have started or finished, so they cannot be cleared.';
  END IF;
  DELETE FROM match_maps WHERE match_id IN
    (SELECT id FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL);
  UPDATE matches SET deleted_at = now(), group_id = NULL
   WHERE stage_id = p_stage AND deleted_at IS NULL;
  GET DIAGNOSTICS removed = ROW_COUNT;
  UPDATE comp_registrations SET group_id = NULL
   WHERE group_id IN (SELECT id FROM comp_groups WHERE stage_id = p_stage);
  DELETE FROM comp_groups WHERE stage_id = p_stage;
  RETURN removed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------- the 48-hour rule ----------------
CREATE OR REPLACE FUNCTION enforce_fixture_time_rule() RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN RETURN NEW; END IF;      -- system and admins are exempt
  IF NEW.external_source IS NOT NULL OR NEW.scheduled_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;

  IF NEW.scheduled_at < now() + interval '48 hours' THEN
    RAISE EXCEPTION 'Fixture times must be set at least 48 hours before kickoff.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.scheduled_at IS NOT NULL AND OLD.scheduled_at < now() + interval '48 hours' THEN
    RAISE EXCEPTION 'This match starts in under 48 hours, so its time is locked. Ask an Esporting admin to change it.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_fixture_time_rule ON matches;
CREATE TRIGGER trg_fixture_time_rule
  BEFORE INSERT OR UPDATE OF scheduled_at ON matches
  FOR EACH ROW EXECUTE FUNCTION enforce_fixture_time_rule();

REVOKE ALL ON FUNCTION _fixture_games(UUID, UUID), _insert_fixture(UUID,UUID,UUID,UUID,UUID,UUID,INT,TEXT),
  _can_run_fixtures(UUID), generate_fixtures(UUID,UUID,INT,BOOLEAN),
  generate_next_knockout_round(UUID,UUID), clear_stage_fixtures(UUID,UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION generate_fixtures(UUID,UUID,INT,BOOLEAN),
  generate_next_knockout_round(UUID,UUID), clear_stage_fixtures(UUID,UUID) TO authenticated;
