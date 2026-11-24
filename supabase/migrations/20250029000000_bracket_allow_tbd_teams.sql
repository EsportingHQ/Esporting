-- Later bracket rounds exist before their teams are known, so a head-to-head match may have
-- empty team slots when it belongs to a bracket. Such a match cannot start until both teams fill in.
ALTER TABLE matches DROP CONSTRAINT match_format_teams;
ALTER TABLE matches ADD CONSTRAINT match_format_teams CHECK (
  (match_format = 'battle_royale' AND team_home_id IS NULL AND team_away_id IS NULL)
  OR (match_format = 'head_to_head' AND (
        (team_home_id IS NOT NULL AND team_away_id IS NOT NULL)
        OR bracket_round IS NOT NULL))
);

CREATE OR REPLACE FUNCTION trg_bracket_needs_teams() RETURNS trigger AS $$
BEGIN
  IF NEW.bracket_round IS NOT NULL AND NEW.status NOT IN ('scheduled', 'delayed', 'cancelled')
     AND (NEW.team_home_id IS NULL OR NEW.team_away_id IS NULL) THEN
    RAISE EXCEPTION 'Both teams must be decided before this match can start. It is waiting for the earlier round to finish.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_bracket_teams ON matches;
CREATE TRIGGER trg_bracket_teams
  BEFORE UPDATE OF status ON matches
  FOR EACH ROW EXECUTE FUNCTION trg_bracket_needs_teams();
