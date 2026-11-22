-- Standings are recalculated automatically whenever a match (or its football score) changes.
--   football          P W D L GF GA GD Pts      (win 3, draw 1)
--   CODM MP / MLBB    P W L  Maps won/lost/diff Pts (win 3)  -- no goals for / against
--   battle royale     handled from br_match_results (placement + kill points)
-- score_for / score_against hold goals for football and maps for series games;
-- meta.metric says which ('goals' | 'maps').

CREATE OR REPLACE FUNCTION recompute_stage_standings(p_stage UUID, p_game UUID) RETURNS VOID AS $$
BEGIN
  IF p_stage IS NULL OR p_game IS NULL THEN RETURN; END IF;
  DELETE FROM standings WHERE stage_id = p_stage AND game_title_id = p_game;

  INSERT INTO standings (stage_id, group_id, game_title_id, team_id, played, wins, draws, losses,
                         points, score_for, score_against, rank, meta)
  WITH football AS (
    SELECT (gt.slug IS NOT NULL AND ty.slug = 'football') AS is_football
      FROM game_titles gt LEFT JOIN game_types ty ON ty.id = gt.game_type_id WHERE gt.id = p_game
  ), res AS (
    SELECT m.id, m.group_id, m.team_home_id, m.team_away_id, m.winner_team_id, m.status,
           (m.status IN ('completed', 'walkover')) AS done,
           CASE WHEN (SELECT is_football FROM football) THEN
             CASE WHEN m.best_of > 1 THEN (SELECT coalesce(sum(mm.home_score), 0) FROM match_maps mm WHERE mm.match_id = m.id AND mm.status = 'completed')
                  ELSE coalesce(ms.home_current_score, 0) END
           ELSE coalesce(m.home_maps_won, 0) END AS hs,
           CASE WHEN (SELECT is_football FROM football) THEN
             CASE WHEN m.best_of > 1 THEN (SELECT coalesce(sum(mm.away_score), 0) FROM match_maps mm WHERE mm.match_id = m.id AND mm.status = 'completed')
                  ELSE coalesce(ms.away_current_score, 0) END
           ELSE coalesce(m.away_maps_won, 0) END AS aws
      FROM matches m LEFT JOIN match_scores ms ON ms.match_id = m.id
     WHERE m.stage_id = p_stage AND m.game_title_id = p_game AND m.deleted_at IS NULL
       AND m.status <> 'cancelled' AND m.match_format = 'head_to_head'
  ), sides AS (
    SELECT group_id, team_home_id AS team, done, status, winner_team_id, hs AS sf, aws AS sa FROM res
    UNION ALL
    SELECT group_id, team_away_id, done, status, winner_team_id, aws, hs FROM res
  ), agg AS (
    SELECT group_id, team,
           count(*) FILTER (WHERE done) AS played,
           count(*) FILTER (WHERE done AND winner_team_id = team) AS wins,
           count(*) FILTER (WHERE done AND winner_team_id IS NULL AND status <> 'walkover') AS draws,
           count(*) FILTER (WHERE done AND winner_team_id IS NOT NULL AND winner_team_id <> team) AS losses,
           coalesce(sum(sf) FILTER (WHERE done), 0) AS sf,
           coalesce(sum(sa) FILTER (WHERE done), 0) AS sa
      FROM sides GROUP BY group_id, team
  )
  SELECT p_stage, a.group_id, p_game, a.team, a.played, a.wins, a.draws, a.losses,
         a.wins * 3 + a.draws, a.sf, a.sa,
         row_number() OVER (PARTITION BY a.group_id
                            ORDER BY a.wins * 3 + a.draws DESC, a.sf - a.sa DESC, a.sf DESC, a.wins DESC, t.name),
         jsonb_build_object('metric', CASE WHEN (SELECT is_football FROM football) THEN 'goals' ELSE 'maps' END)
    FROM agg a JOIN teams t ON t.id = a.team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION trg_standings_from_match() RETURNS trigger AS $$
BEGIN
  PERFORM recompute_stage_standings(NEW.stage_id, NEW.game_title_id);
  IF TG_OP = 'UPDATE' AND (OLD.stage_id IS DISTINCT FROM NEW.stage_id OR OLD.game_title_id IS DISTINCT FROM NEW.game_title_id) THEN
    PERFORM recompute_stage_standings(OLD.stage_id, OLD.game_title_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_standings_match ON matches;
CREATE TRIGGER trg_standings_match
  AFTER INSERT OR UPDATE OF status, winner_team_id, home_maps_won, away_maps_won, deleted_at, stage_id, group_id, game_title_id
  ON matches FOR EACH ROW EXECUTE FUNCTION trg_standings_from_match();

CREATE OR REPLACE FUNCTION trg_standings_from_score() RETURNS trigger AS $$
DECLARE mt matches%ROWTYPE;
BEGIN
  SELECT * INTO mt FROM matches WHERE id = NEW.match_id;
  IF FOUND AND mt.status IN ('completed', 'walkover') THEN
    PERFORM recompute_stage_standings(mt.stage_id, mt.game_title_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_standings_score ON match_scores;
CREATE TRIGGER trg_standings_score
  AFTER INSERT OR UPDATE ON match_scores
  FOR EACH ROW EXECUTE FUNCTION trg_standings_from_score();

REVOKE ALL ON FUNCTION recompute_stage_standings(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- Backfill for matches that already exist
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT stage_id, game_title_id FROM matches WHERE stage_id IS NOT NULL AND deleted_at IS NULL LOOP
    PERFORM recompute_stage_standings(r.stage_id, r.game_title_id);
  END LOOP;
END $$;
