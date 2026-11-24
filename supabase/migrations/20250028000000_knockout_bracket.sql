-- Knockout brackets: the whole bracket is created up front. Later rounds start empty and
-- fill in by themselves as winners are decided.
--   byes     when the team count is not a power of 2, some teams skip round 1
--   advance  a finished match sends its winner into the next round's slot
--   winner   organiser can set the winner of a level match (extra time, penalties)

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_round INT,
  ADD COLUMN IF NOT EXISTS bracket_slot  INT,
  ADD COLUMN IF NOT EXISTS next_match_id UUID REFERENCES matches(id),
  ADD COLUMN IF NOT EXISTS next_side     TEXT CHECK (next_side IN ('home', 'away'));
CREATE INDEX IF NOT EXISTS idx_matches_bracket ON matches (stage_id, bracket_round, bracket_slot) WHERE bracket_round IS NOT NULL;

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
  SELECT mid, n, 'pending' FROM generate_series(1, greatest(p_best_of, 1)) n;
  RETURN mid;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION _build_bracket(p_comp UUID, p_stage UUID, p_game UUID, p_best_of INT, p_teams UUID[])
RETURNS INT AS $$
DECLARE
  n INT := array_length(p_teams, 1);
  size INT := 1; rounds INT := 0; byes INT; pairs INT;
  mids UUID[] := '{}'; off INT; cnt INT; r INT; j INT; k INT;
  bye_pair BOOLEAN[]; ti INT := 1; made INT := 0;
  t1 UUID; t2 UUID; mid UUID; tgt UUID; side TEXT;
BEGIN
  WHILE size < n LOOP size := size * 2; rounds := rounds + 1; END LOOP;
  byes := size - n;
  pairs := size / 2;

  -- spread the bye pairs between the top and the bottom of the draw
  bye_pair := array_fill(false, ARRAY[pairs]);
  k := 0; j := 1;
  WHILE k < byes LOOP
    bye_pair[CASE WHEN k % 2 = 0 THEN j ELSE pairs - j + 1 END] := true;
    IF k % 2 = 1 THEN j := j + 1; END IF;
    k := k + 1;
  END LOOP;

  -- create every match, round by round (round 1 only where both teams play)
  FOR r IN 1..rounds LOOP
    cnt := size / (2 ^ r)::int;
    FOR j IN 1..cnt LOOP
      IF r = 1 THEN
        IF bye_pair[j] THEN
          mids := mids || NULL::uuid;                 -- no match, the team goes straight to round 2
        ELSE
          t1 := p_teams[ti]; t2 := p_teams[ti + 1]; ti := ti + 2;
          mids := mids || _insert_bracket_match(p_comp, p_stage, p_game, t1, t2, p_best_of, r, j);
          made := made + 1;
        END IF;
      ELSE
        mids := mids || _insert_bracket_match(p_comp, p_stage, p_game, NULL, NULL, p_best_of, r, j);
        made := made + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- link each match to the one its winner plays next; place bye teams in round 2
  off := 0;
  FOR r IN 1..(rounds - 1) LOOP
    cnt := size / (2 ^ r)::int;
    FOR j IN 1..cnt LOOP
      tgt := mids[off + cnt + ((j + 1) / 2)];
      side := CASE WHEN j % 2 = 1 THEN 'home' ELSE 'away' END;
      mid := mids[off + j];
      IF mid IS NOT NULL THEN
        UPDATE matches SET next_match_id = tgt, next_side = side WHERE id = mid;
      ELSIF r = 1 THEN
        t1 := p_teams[ti]; ti := ti + 1;
        IF side = 'home' THEN UPDATE matches SET team_home_id = t1 WHERE id = tgt;
        ELSE UPDATE matches SET team_away_id = t1 WHERE id = tgt; END IF;
      END IF;
    END LOOP;
    off := off + cnt;
  END LOOP;
  RETURN made;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- advance the winner into the next round's slot
CREATE OR REPLACE FUNCTION trg_advance_bracket() RETURNS trigger AS $$
BEGIN
  IF NEW.next_match_id IS NOT NULL AND NEW.status IN ('completed', 'walkover') AND NEW.winner_team_id IS NOT NULL THEN
    IF NEW.next_side = 'home' THEN
      UPDATE matches SET team_home_id = NEW.winner_team_id
       WHERE id = NEW.next_match_id AND status IN ('scheduled', 'delayed');
    ELSE
      UPDATE matches SET team_away_id = NEW.winner_team_id
       WHERE id = NEW.next_match_id AND status IN ('scheduled', 'delayed');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_bracket_advance ON matches;
CREATE TRIGGER trg_bracket_advance
  AFTER UPDATE OF status, winner_team_id ON matches
  FOR EACH ROW EXECUTE FUNCTION trg_advance_bracket();

-- organiser decides a level knockout match (extra time, penalties)
CREATE OR REPLACE FUNCTION set_knockout_winner(p_match UUID, p_team UUID) RETURNS VOID AS $$
DECLARE m matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  PERFORM _can_run_fixtures(m.comp_instance_id);
  IF m.bracket_round IS NULL THEN RAISE EXCEPTION 'This is not a knockout bracket match'; END IF;
  IF m.status NOT IN ('completed', 'walkover') THEN RAISE EXCEPTION 'Finish the match first'; END IF;
  IF p_team NOT IN (m.team_home_id, m.team_away_id) THEN RAISE EXCEPTION 'That team is not in this match'; END IF;
  UPDATE matches SET winner_team_id = p_team WHERE id = p_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION set_knockout_winner(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_knockout_winner(UUID, UUID) TO authenticated;

-- the old round-by-round pairing is replaced by the bracket
CREATE OR REPLACE FUNCTION generate_next_knockout_round(p_comp UUID, p_stage UUID)
RETURNS INT AS $$
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  RAISE EXCEPTION 'The bracket fills in by itself as matches finish. There is nothing to generate.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- clear_stage_fixtures must also drop the bracket links
CREATE OR REPLACE FUNCTION clear_stage_fixtures(p_comp UUID, p_stage UUID) RETURNS INT AS $$
DECLARE removed INT;
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = p_stage AND deleted_at IS NULL
             AND status NOT IN ('scheduled', 'delayed')) THEN
    RAISE EXCEPTION 'Some matches in this stage have started or finished, so they cannot be cleared.';
  END IF;
  UPDATE matches SET next_match_id = NULL WHERE stage_id = p_stage AND deleted_at IS NULL;
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

-- generate_fixtures: a knockout stage now builds the full bracket
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
  manual BOOLEAN := false;
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

  IF s.stage_type = 'knockout' THEN
    IF array_length(games, 1) > 1 THEN
      RAISE EXCEPTION 'A knockout needs one game. Set the stage to a single game.';
    END IF;
    RETURN _build_bracket(p_comp, p_stage, games[1], s.best_of, teams);
  END IF;

  g := CASE WHEN s.stage_type = 'group' THEN greatest(p_groups, 1) ELSE 1 END;
  manual := s.stage_type = 'group'
    AND NOT EXISTS (SELECT 1 FROM comp_registrations WHERE comp_instance_id = p_comp AND status = 'approved' AND manual_group IS NULL);
  IF manual THEN
    SELECT max(manual_group) INTO g FROM comp_registrations WHERE comp_instance_id = p_comp AND status = 'approved';
    FOR gi IN 1..g LOOP
      IF (SELECT count(*) FROM comp_registrations WHERE comp_instance_id = p_comp AND status = 'approved' AND manual_group = gi) < 2 THEN
        RAISE EXCEPTION 'Group % needs at least 2 teams.', chr(64 + gi);
      END IF;
    END LOOP;
  ELSIF n / g < 2 THEN
    RAISE EXCEPTION 'Not enough teams for % groups. Each group needs at least 2 teams.', g;
  END IF;

  FOR gi IN 1..g LOOP
    grp := '{}';
    IF manual THEN
      SELECT array_agg(team_id ORDER BY random()) INTO grp
        FROM comp_registrations WHERE comp_instance_id = p_comp AND status = 'approved' AND manual_group = gi;
    ELSE
      i := gi;
      WHILE i <= n LOOP
        grp := grp || teams[i];
        i := i + g;
      END LOOP;
    END IF;

    gid := NULL;
    IF s.stage_type = 'group' THEN
      INSERT INTO comp_groups (stage_id, name) VALUES (p_stage, 'Group ' || chr(64 + gi)) RETURNING id INTO gid;
      UPDATE comp_registrations SET group_id = gid
       WHERE comp_instance_id = p_comp AND team_id = ANY (grp);
    END IF;

    arr := grp;
    IF array_length(arr, 1) % 2 = 1 THEN arr := arr || NULL::uuid; END IF;
    m := array_length(arr, 1);

    FOR leg IN 1..(CASE WHEN p_double THEN 2 ELSE 1 END) LOOP
      FOR r IN 0..(m - 2) LOOP
        round_no := r + 1 + (leg - 1) * (m - 1);
        FOR i IN 1..(m / 2) LOOP
          h := arr[i]; a := arr[m + 1 - i];
          IF h IS NULL OR a IS NULL THEN CONTINUE; END IF;
          IF (i = 1 AND r % 2 = 1) THEN
            h := arr[m + 1 - i]; a := arr[i];
          END IF;
          IF leg = 2 THEN
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
        arr := ARRAY[arr[1], arr[m]] || arr[2:m - 1];
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN made;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
