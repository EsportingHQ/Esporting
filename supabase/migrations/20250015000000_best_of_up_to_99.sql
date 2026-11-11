-- -------------------------------------------------------------
-- MIGRATION: 20250015000000_best_of_up_to_99.sql
-- Allow series of up to Best of 99.
-- -------------------------------------------------------------
-- Launch tournaments run anywhere from Bo1 to Bo99. The original
-- constraints capped best_of at 15, so scheduling a longer series
-- failed at the database.
-- -------------------------------------------------------------

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_best_of_valid;
ALTER TABLE matches
  ADD CONSTRAINT matches_best_of_valid
  CHECK (best_of BETWEEN 1 AND 99);

ALTER TABLE comp_stages
  DROP CONSTRAINT IF EXISTS comp_stages_best_of_valid;
ALTER TABLE comp_stages
  ADD CONSTRAINT comp_stages_best_of_valid
  CHECK (best_of BETWEEN 1 AND 99);
