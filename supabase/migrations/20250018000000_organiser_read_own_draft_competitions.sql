-- Organisers (and admins) could not read their own draft competitions: the only
-- SELECT policy hides drafts from everyone, so the page opened right after
-- creating a competition returned 404.
DROP POLICY IF EXISTS "owner or admin read comp_instances" ON comp_instances;
CREATE POLICY "owner or admin read comp_instances" ON comp_instances
  FOR SELECT USING (deleted_at IS NULL AND (organiser_id = auth.uid() OR is_admin()));
