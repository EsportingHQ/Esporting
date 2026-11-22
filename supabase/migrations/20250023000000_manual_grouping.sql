-- Manual grouping: organiser places teams in groups; generate_fixtures uses it when every approved team is placed.
ALTER TABLE comp_registrations ADD COLUMN IF NOT EXISTS manual_group INT;

CREATE OR REPLACE FUNCTION set_manual_groups(p_comp UUID, p_assignments JSONB) RETURNS VOID AS $$
DECLARE r JSONB;
BEGIN
  PERFORM _can_run_fixtures(p_comp);
  UPDATE comp_registrations SET manual_group = NULL WHERE comp_instance_id = p_comp;
  FOR r IN SELECT * FROM jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb)) LOOP
    UPDATE comp_registrations SET manual_group = nullif((r->>'group')::int, 0)
     WHERE comp_instance_id = p_comp AND team_id = (r->>'team_id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION set_manual_groups(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_manual_groups(UUID, JSONB) TO authenticated;

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
  -- Manual grouping: used when the organiser has placed every approved team in a group
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
