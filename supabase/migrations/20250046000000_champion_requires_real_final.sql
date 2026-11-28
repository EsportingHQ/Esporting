-- A knockout only has a final if it is a real bracket (bracket_round set). Manually added "Round 1" matches do not.
CREATE OR REPLACE FUNCTION competition_champion(p_comp UUID) RETURNS UUID AS $$
DECLARE
  st UUID; stype TEXT; w UUID; n INT; top_round INT;
BEGIN
  SELECT id, stage_type INTO st, stype FROM comp_stages
   WHERE comp_instance_id = p_comp ORDER BY stage_order DESC LIMIT 1;
  IF st IS NULL THEN RETURN NULL; END IF;

  IF stype = 'knockout' THEN
    -- only a real bracket has a final: the match in the last round that feeds no other match
    SELECT max(bracket_round) INTO top_round FROM matches WHERE stage_id = st AND deleted_at IS NULL AND bracket_round IS NOT NULL;
    IF top_round IS NULL THEN RETURN NULL; END IF;
    SELECT m.winner_team_id INTO w FROM matches m
     WHERE m.stage_id = st AND m.deleted_at IS NULL AND m.next_match_id IS NULL
       AND m.bracket_round = top_round AND m.status IN ('completed', 'walkover')
     ORDER BY m.bracket_slot NULLS LAST LIMIT 1;
    RETURN w;
  END IF;

  SELECT count(DISTINCT (coalesce(group_id::text, ''), game_title_id::text)) INTO n FROM standings WHERE stage_id = st;
  IF n <> 1 THEN RETURN NULL; END IF;
  SELECT team_id INTO w FROM standings WHERE stage_id = st ORDER BY rank NULLS LAST LIMIT 1;
  RETURN w;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

UPDATE comp_instances SET champion_team_id = NULL WHERE status = 'completed';
UPDATE comp_instances SET champion_team_id = competition_champion(id) WHERE status = 'completed' AND deleted_at IS NULL;
