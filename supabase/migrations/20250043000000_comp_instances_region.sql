-- Where a competition is played (Nigeria, Lagos, Online...). Shown under the competition name on match pages.
ALTER TABLE comp_instances ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE comp_instances DROP CONSTRAINT IF EXISTS comp_instances_region_len;
ALTER TABLE comp_instances ADD CONSTRAINT comp_instances_region_len CHECK (region IS NULL OR char_length(region) <= 60);
CREATE INDEX IF NOT EXISTS idx_comp_instances_organiser ON comp_instances (organiser_id) WHERE deleted_at IS NULL;
