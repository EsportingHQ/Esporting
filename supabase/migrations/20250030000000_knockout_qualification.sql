-- A knockout stage that follows a group or league stage can pull its teams from the standings
-- ("auto") or leave the draw to the organiser ("manual").
--   qualify_mode           'auto'   top teams of the previous stage enter by themselves
--                          'manual' an empty bracket is built and the organiser puts teams in
--   qualifiers_per_group   how many teams per group (or in total, for a league) go through
--   bracket_teams          manual mode only: how many teams the bracket is built for

ALTER TABLE comp_stages
  ADD COLUMN IF NOT EXISTS qualify_mode TEXT NOT NULL DEFAULT 'auto' CHECK (qualify_mode IN ('auto', 'manual')),
  ADD COLUMN IF NOT EXISTS qualifiers_per_group INT NOT NULL DEFAULT 2 CHECK (qualifiers_per_group BETWEEN 1 AND 32),
  ADD COLUMN IF NOT EXISTS bracket_teams INT CHECK (bracket_teams IS NULL OR bracket_teams BETWEEN 2 AND 64);

DROP FUNCTION IF EXISTS _build_bracket(UUID, UUID, UUID, INT, UUID[]);
CREATE OR REPLACE FUNCTION _build_bracket(
  p_comp UUID, p_stage UUID, p_game UUID, p_best_of INT, p_teams UUID[], p_seeded BOOLEAN DEFAULT false
) RETURNS INT AS $$
DECLARE
  n INT := array_length(p_teams, 1);
  size INT := 1; rounds INT := 0; byes INT; pairs INT;
  mids UUID[] := '{}'; off INT; cnt INT; r INT; j INT; k INT;
  bye_pair BOOLEAN[]; ti INT; bi INT := 1; made INT := 0;
  t1 UUID; t2 UUID; mid UUID; tgt UUID; side TEXT;
BEGIN
  WHILE size < n LOOP size := size * 2; rounds := rounds + 1; END LOOP;
  byes := size - n;
  pairs := size / 2;
  -- seeded: the first `byes` teams are the top seeds and take the byes
  ti := CASE WHEN p_seeded THEN byes + 1 ELSE 1 END;

  bye_pair := array_fill(false, ARRAY[pairs]);
  k := 0; j := 1;
  WHILE k < byes LOOP
    bye_pair[CASE WHEN k % 2 = 0 THEN j ELSE pairs - j + 1 END] := true;
    IF k % 2 = 1 THEN j := j + 1; END IF;
    k := k + 1;
  END LOOP;

  FOR r IN 1..rounds LOOP
    cnt := size / (2 ^ r)::int;
    FOR j IN 1..cnt LOOP
      IF r = 1 THEN
        IF bye_pair[j] THEN
          mids := mids || NULL::uuid;
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
        IF p_seeded THEN t1 := p_teams[bi]; bi := bi + 1; ELSE t1 := p_teams[ti]; ti := ti + 1; END IF;
        IF side = 'home' THEN UPDATE matches SET team_home_id = t1 WHERE id = tgt;
        ELSE UPDATE matches SET team_away_id = t1 WHERE id = tgt; END IF;
      END IF;
    END LOOP;
    off := off + cnt;
  END LOOP;
  RETURN made;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Teams that qualify from a finished group or league stage, in bracket order:
-- consecutive pairs are first-round matches, any top seeds that get a bye come first.
CREATE OR REPLACE FUNCTION _qualifiers(p_prev UUID, p_game UUID, p_k INT, p_grouped BOOLEAN)
RETURNS UUID[] AS $$
DECLARE
  g INT; n INT; i INT; m INT; size INT := 1; byes INT;
  win UUID[]; run UUID[]; seeds UUID[]; rest UUID[]; res UUID[] := '{}';
BEGIN
  SELECT array_agg(team_id ORDER BY rank, coalesce(gname, ''), rk_pts DESC) INTO seeds FROM (
    SELECT st.team_id, st.rank, cg.name AS gname, st.points AS rk_pts
      FROM standings st LEFT JOIN comp_groups cg ON cg.id = st.group_id
     WHERE st.stage_id = p_prev AND st.game_title_id = p_game
       AND st.rank <= p_k
  ) q;
  n := coalesce(array_length(seeds, 1), 0);
  IF n < 2 THEN RETURN seeds; END IF;

  -- two per group and a power-of-two number of groups: winners meet runners-up of another group
  IF p_grouped AND p_k = 2 THEN
    SELECT count(*) INTO g FROM comp_groups WHERE stage_id = p_prev;
    IF g >= 2 AND (g & (g - 1)) = 0 AND n = 2 * g THEN
      SELECT array_agg(st.team_id ORDER BY cg.name) INTO win
        FROM standings st JOIN comp_groups cg ON cg.id = st.group_id
       WHERE st.stage_id = p_prev AND st.game_title_id = p_game AND st.rank = 1;
      SELECT array_agg(st.team_id ORDER BY cg.name) INTO run
        FROM standings st JOIN comp_groups cg ON cg.id = st.group_id
       WHERE st.stage_id = p_prev AND st.game_title_id = p_game AND st.rank = 2;
      IF array_length(win, 1) = g AND array_length(run, 1) = g THEN
        i := 1;
        WHILE i < g LOOP
          res := res || win[i] || run[i + 1] || win[i + 1] || run[i];
          i := i + 2;
        END LOOP;
        RETURN res;
      END IF;
    END IF;
  END IF;

  -- otherwise seed them: best vs worst, and the top seeds take any byes
  WHILE size < n LOOP size := size * 2; END LOOP;
  byes := size - n;
  res := seeds[1:byes];
  rest := seeds[byes + 1:n];
  m := coalesce(array_length(rest, 1), 0);
  FOR i IN 1..(m / 2) LOOP
    res := res || rest[i] || rest[m + 1 - i];
  END LOOP;
  RETURN res;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- generate_fixtures: knockout branch now follows the stage's qualification setting
CREATE OR REPLACE FUNCTION generate_fixtures(
  p_comp UUID, p_stage UUID, p_groups INT DEFAULT 1, p_double BOOLEAN DEFAULT false
) RETURNS INT AS $$
DECLARE
  s comp_stages%ROWTYPE;
  prev comp_stages%ROWTYPE;
  teams UUID[]; ordered UUID[];
  n INT; g INT; gi INT; gid UUID; pending INT; k INT;
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

  SELECT array_agg(id) INTO games FROM _fixture_games(p_comp, s.game_title_id);
  IF games IS NULL THEN RAISE EXCEPTION 'This competition has no head-to-head game to generate fixtures for'; END IF;

  IF s.stage_type = 'knockout' THEN
    IF array_length(games, 1) > 1 THEN
      RAISE EXCEPTION 'A knockout needs one game. Set the stage to a single game.';
    END IF;
    game := games[1];

    -- manual: build an empty bracket, the organiser puts the teams in
    IF s.qualify_mode = 'manual' THEN
      k := coalesce(s.bracket_teams, n);
      IF k < 2 THEN RAISE EXCEPTION 'Set how many teams the bracket is for (at least 2).'; END IF;
      RETURN _build_bracket(p_comp, p_stage, game, s.best_of, array_fill(NULL::uuid, ARRAY[k]));
    END IF;

    SELECT * INTO prev FROM comp_stages
     WHERE comp_instance_id = p_comp AND stage_order < s.stage_order AND stage_type IN ('group', 'league')
     ORDER BY stage_order DESC LIMIT 1;

    IF FOUND THEN
      IF NOT EXISTS (SELECT 1 FROM matches WHERE stage_id = prev.id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Generate the fixtures for "%" first, so teams can qualify from it.', prev.name;
      END IF;
      SELECT count(*) INTO pending FROM matches
       WHERE stage_id = prev.id AND deleted_at IS NULL AND status NOT IN ('completed', 'walkover', 'cancelled');
      IF pending > 0 THEN
        RAISE EXCEPTION '% match(es) in "%" are not finished yet. Finish them, or switch this stage to picking the teams yourself.', pending, prev.name;
      END IF;
      ordered := _qualifiers(prev.id, game, s.qualifiers_per_group, prev.stage_type = 'group');
      IF coalesce(array_length(ordered, 1), 0) < 2 THEN
        RAISE EXCEPTION 'Fewer than 2 teams qualified from "%".', prev.name;
      END IF;
      RETURN _build_bracket(p_comp, p_stage, game, s.best_of, ordered, true);
    END IF;

    IF n < 2 THEN RAISE EXCEPTION 'Register at least 2 teams first'; END IF;
    RETURN _build_bracket(p_comp, p_stage, game, s.best_of, teams);
  END IF;

  IF n < 2 THEN RAISE EXCEPTION 'Register at least 2 teams first'; END IF;

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

-- manual bracket: put a team into (or clear) an open slot
CREATE OR REPLACE FUNCTION set_bracket_team(p_match UUID, p_side TEXT, p_team UUID) RETURNS VOID AS $$
DECLARE m matches%ROWTYPE;
BEGIN
  IF p_side NOT IN ('home', 'away') THEN RAISE EXCEPTION 'Side must be home or away'; END IF;
  SELECT * INTO m FROM matches WHERE id = p_match AND deleted_at IS NULL;
  IF NOT FOUND OR m.bracket_round IS NULL THEN RAISE EXCEPTION 'Not a bracket match'; END IF;
  PERFORM _can_run_fixtures(m.comp_instance_id);
  IF m.status <> 'scheduled' THEN RAISE EXCEPTION 'This match has already started'; END IF;
  IF EXISTS (SELECT 1 FROM matches f WHERE f.next_match_id = m.id AND f.next_side = p_side AND f.deleted_at IS NULL) THEN
    RAISE EXCEPTION 'That place is filled by the winner of an earlier match';
  END IF;
  IF p_team IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM comp_registrations WHERE comp_instance_id = m.comp_instance_id AND team_id = p_team AND status = 'approved') THEN
      RAISE EXCEPTION 'That team is not registered in this competition';
    END IF;
    IF EXISTS (SELECT 1 FROM matches o WHERE o.stage_id = m.stage_id AND o.deleted_at IS NULL
               AND p_team IN (o.team_home_id, o.team_away_id)
               AND NOT (o.id = m.id AND ((p_side = 'home' AND o.team_home_id = p_team) OR (p_side = 'away' AND o.team_away_id = p_team)))) THEN
      RAISE EXCEPTION 'That team is already in the bracket';
    END IF;
  END IF;
  IF p_side = 'home' THEN UPDATE matches SET team_home_id = p_team WHERE id = p_match;
  ELSE UPDATE matches SET team_away_id = p_team WHERE id = p_match; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION set_bracket_team(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_bracket_team(UUID, TEXT, UUID) TO authenticated;
