-- A competition completes itself when its last fixture ends, and records its champion.
--   * champion_team_id: winner of the final (knockout) or top of the table (league / single group)
--   * auto_completed:   true when the system completed it, so a later correction can reopen it
-- The organiser can still complete or reopen a competition by hand.

ALTER TABLE comp_instances
  ADD COLUMN IF NOT EXISTS champion_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN NOT NULL DEFAULT false;

-- Who won the competition? NULL when it cannot be said yet (final not played, level final, several groups).
CREATE OR REPLACE FUNCTION competition_champion(p_comp UUID) RETURNS UUID AS $$
DECLARE
  st UUID; stype TEXT; w UUID; n INT;
BEGIN
  SELECT id, stage_type INTO st, stype FROM comp_stages
   WHERE comp_instance_id = p_comp ORDER BY stage_order DESC LIMIT 1;
  IF st IS NULL THEN RETURN NULL; END IF;

  IF stype = 'knockout' THEN
    SELECT m.winner_team_id INTO w FROM matches m
     WHERE m.stage_id = st AND m.deleted_at IS NULL AND m.next_match_id IS NULL
       AND m.status IN ('completed', 'walkover')
     ORDER BY m.bracket_round DESC NULLS LAST, m.bracket_slot NULLS LAST LIMIT 1;
    RETURN w;
  END IF;

  -- league, group or ranking: one table with one winner
  SELECT count(DISTINCT (coalesce(group_id::text, ''), game_title_id::text)) INTO n FROM standings WHERE stage_id = st;
  IF n <> 1 THEN RETURN NULL; END IF;
  SELECT team_id INTO w FROM standings WHERE stage_id = st ORDER BY rank NULLS LAST LIMIT 1;
  RETURN w;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION competition_champion(UUID) FROM PUBLIC, anon;

-- Complete the competition if every fixture is finished.
CREATE OR REPLACE FUNCTION maybe_complete_competition(p_comp UUID) RETURNS BOOLEAN AS $$
DECLARE
  st TEXT; ko UUID;
BEGIN
  SELECT status INTO st FROM comp_instances WHERE id = p_comp AND deleted_at IS NULL;
  IF st IS DISTINCT FROM 'ongoing' THEN RETURN false; END IF;

  -- every stage needs fixtures (a knockout that is still waiting for the group stage is not finished)
  IF EXISTS (SELECT 1 FROM comp_stages s WHERE s.comp_instance_id = p_comp
              AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.stage_id = s.id AND m.deleted_at IS NULL)) THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM matches WHERE comp_instance_id = p_comp AND deleted_at IS NULL) THEN RETURN false; END IF;

  -- nothing may still be waiting: scheduled, delayed, live, or cancelled-for-now (awaiting a new time)
  IF EXISTS (SELECT 1 FROM matches WHERE comp_instance_id = p_comp AND deleted_at IS NULL
              AND status NOT IN ('completed', 'walkover')) THEN
    RETURN false;
  END IF;

  -- a knockout needs a decided final (a level final waits for the organiser to pick the winner)
  SELECT id INTO ko FROM comp_stages WHERE comp_instance_id = p_comp AND stage_type = 'knockout'
   ORDER BY stage_order DESC LIMIT 1;
  IF ko IS NOT NULL AND (SELECT stage_order FROM comp_stages WHERE id = ko) =
     (SELECT max(stage_order) FROM comp_stages WHERE comp_instance_id = p_comp)
     AND competition_champion(p_comp) IS NULL THEN
    RETURN false;
  END IF;

  UPDATE comp_instances SET status = 'completed', auto_completed = true WHERE id = p_comp;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION maybe_complete_competition(UUID) FROM PUBLIC, anon, authenticated;

-- Whoever completes a competition (system or organiser), the champion is recorded; reopening clears it.
CREATE OR REPLACE FUNCTION trg_comp_champion() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.champion_team_id := competition_champion(NEW.id);
  ELSIF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.champion_team_id := NULL;
    NEW.auto_completed := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_comp_champion ON comp_instances;
CREATE TRIGGER trg_comp_champion BEFORE UPDATE OF status ON comp_instances
  FOR EACH ROW EXECUTE FUNCTION trg_comp_champion();

-- React to match changes. Named trg_zz_ so it runs after standings and bracket triggers.
CREATE OR REPLACE FUNCTION trg_zz_match_competition() RETURNS trigger AS $$
DECLARE c RECORD;
BEGIN
  SELECT status, auto_completed INTO c FROM comp_instances WHERE id = NEW.comp_instance_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.deleted_at IS NULL AND NEW.status IN ('completed', 'walkover') THEN
    IF c.status = 'ongoing' THEN
      PERFORM maybe_complete_competition(NEW.comp_instance_id);
    ELSIF c.status = 'completed' AND c.auto_completed THEN
      -- a correction after completion (for example a changed final): refresh the champion
      UPDATE comp_instances SET champion_team_id = competition_champion(NEW.comp_instance_id)
       WHERE id = NEW.comp_instance_id;
    END IF;
  ELSIF c.status = 'completed' AND c.auto_completed AND NEW.deleted_at IS NULL
        AND NEW.status IN ('scheduled', 'delayed', 'live', 'cancelled') THEN
    -- a fixture was reopened or added after the system completed the competition
    UPDATE comp_instances SET status = 'ongoing' WHERE id = NEW.comp_instance_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_zz_match_competition ON matches;
CREATE TRIGGER trg_zz_match_competition AFTER INSERT OR UPDATE OF status, winner_team_id, deleted_at ON matches
  FOR EACH ROW EXECUTE FUNCTION trg_zz_match_competition();

-- Backfill: crown the champion of competitions already completed whose final was actually played.
UPDATE comp_instances SET champion_team_id = competition_champion(id)
 WHERE status = 'completed' AND deleted_at IS NULL AND champion_team_id IS NULL;
