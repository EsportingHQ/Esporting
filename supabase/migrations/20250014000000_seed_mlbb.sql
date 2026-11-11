-- -------------------------------------------------------------
-- MIGRATION: 20250014000000_seed_mlbb.sql
-- Add Mobile Legends: Bang Bang (MLBB) as a launch title.
-- -------------------------------------------------------------
-- MLBB is a MOBA, so it gets its own game type. A game is decided by
-- destroying the enemy base, not by kills, so each game is scored as
-- a result: the winner records 1, the loser 0. The existing map_end
-- logic (higher score wins the game) then gives the right winner, and
-- the series score comes from games won.
--
-- Safe to run more than once.
-- -------------------------------------------------------------

INSERT INTO game_types (name, slug)
VALUES ('MOBA', 'moba')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO game_titles (game_type_id, name, slug, short_code)
SELECT id, 'Mobile Legends: Bang Bang', 'mlbb', 'MLBB'
FROM game_types WHERE slug = 'moba'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO scoring_metrics (game_title_id, metric_type, unit_label, win_condition, allows_draw, notes)
SELECT id, 'result', 'win', 'highest_score', false,
       'MLBB: each game is scored as a result. Winner = 1, loser = 0. Series score is games won.'
FROM game_titles WHERE slug = 'mlbb'
ON CONFLICT (game_title_id) DO NOTHING;

INSERT INTO modes (game_title_id, name, slug, metric_type, unit_label, win_condition)
SELECT id, 'Draft Pick', 'draft-pick', 'result', 'win', 'highest_score'
FROM game_titles WHERE slug = 'mlbb'
ON CONFLICT (game_title_id, slug) DO NOTHING;

INSERT INTO maps (game_title_id, name, slug)
SELECT id, 'Land of Dawn', 'land-of-dawn'
FROM game_titles WHERE slug = 'mlbb'
ON CONFLICT (game_title_id, slug) DO NOTHING;

INSERT INTO map_mode_links (map_id, mode_id)
SELECT m.id, d.id
FROM maps m
JOIN game_titles g ON g.id = m.game_title_id AND g.slug = 'mlbb'
JOIN modes d ON d.game_title_id = g.id AND d.slug = 'draft-pick'
WHERE m.slug = 'land-of-dawn'
ON CONFLICT (map_id, mode_id) DO NOTHING;
