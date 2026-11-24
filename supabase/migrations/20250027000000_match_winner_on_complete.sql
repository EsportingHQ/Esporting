-- A finished head-to-head match gets its winner automatically, so standings count wins.
--   series / maps games (MLBB, CODM, football best of 2+): more games won wins the match
--   football single match: more goals wins
--   level on games or goals: no winner (a draw, 1 point each)

CREATE OR REPLACE FUNCTION compute_match_winner(p_match UUID) RETURNS UUID AS $$
DECLARE
  m matches%ROWTYPE;
  is_fb BOOLEAN;
  hw INT; aw INT; hg NUMERIC; ag NUMERIC;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match;
  IF NOT FOUND OR m.match_format <> 'head_to_head' THEN RETURN NULL; END IF;

  SELECT coalesce(ty.slug = 'football', false) INTO is_fb
    FROM game_titles gt LEFT JOIN game_types ty ON ty.id = gt.game_type_id WHERE gt.id = m.game_title_id;

  IF is_fb AND m.best_of <= 1 THEN
    SELECT coalesce(home_current_score, 0), coalesce(away_current_score, 0) INTO hg, ag
      FROM match_scores WHERE match_id = p_match;
    hg := coalesce(hg, 0); ag := coalesce(ag, 0);
    RETURN CASE WHEN hg > ag THEN m.team_home_id WHEN ag > hg THEN m.team_away_id ELSE NULL END;
  END IF;

  SELECT count(*) FILTER (WHERE map_winner = 'home'), count(*) FILTER (WHERE map_winner = 'away')
    INTO hw, aw FROM match_maps WHERE match_id = p_match AND status = 'completed';
  IF hw + aw = 0 THEN
    hw := coalesce(m.home_maps_won, 0); aw := coalesce(m.away_maps_won, 0);
  END IF;
  RETURN CASE WHEN hw > aw THEN m.team_home_id WHEN aw > hw THEN m.team_away_id ELSE NULL END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trg_set_winner_on_complete() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.winner_team_id IS NULL THEN
    NEW.winner_team_id := compute_match_winner(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_match_winner ON matches;
CREATE TRIGGER trg_match_winner
  BEFORE UPDATE OF status ON matches
  FOR EACH ROW EXECUTE FUNCTION trg_set_winner_on_complete();

REVOKE ALL ON FUNCTION compute_match_winner(UUID) FROM PUBLIC, anon;

-- Backfill matches that already ended without a winner (also refreshes their standings)
UPDATE matches SET winner_team_id = compute_match_winner(id)
 WHERE status = 'completed' AND winner_team_id IS NULL AND deleted_at IS NULL
   AND compute_match_winner(id) IS NOT NULL;
