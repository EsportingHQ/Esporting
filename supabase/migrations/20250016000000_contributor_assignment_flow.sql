-- Contributor assignment flow
--
-- Lets an organiser decide who reports each match (assign / leave open to claim /
-- report it themselves), and lets contributors confirm, release or claim matches.
--
--   assigned  -> a primary (and optional backup) contributor is named
--   open      -> shows in every contributor's "Open" tab, first to claim gets it
--   self      -> the organiser reports it themselves
--
-- Rules, enforced here in the database so they cannot be skipped from the browser:
--   * A contributor cannot hold two matches that start less than 90 minutes apart.
--   * An organiser cannot change who reports a match in the last 6 hours before
--     kickoff, or once it is live / finished (admins can).
--   * Releasing a match turns it into an open match flagged "needs cover".

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS backup_contrib_id    UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS assignment_mode      TEXT NOT NULL DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS contrib_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS needs_cover          BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_assignment_mode_valid;
ALTER TABLE matches
  ADD CONSTRAINT matches_assignment_mode_valid
  CHECK (assignment_mode IN ('assigned', 'open', 'self'));

CREATE INDEX IF NOT EXISTS idx_matches_backup_contrib ON matches(backup_contrib_id);

-- Organisers can update matches in their own competitions (reschedule, assign).
DROP POLICY IF EXISTS "organiser update matches" ON matches;
CREATE POLICY "organiser update matches"
ON matches FOR UPDATE
USING (auth_role() IN ('organiser', 'super_admin') AND is_organiser_of(comp_instance_id))
WITH CHECK (auth_role() IN ('organiser', 'super_admin') AND is_organiser_of(comp_instance_id));

-- ------------------------------------------------------------
-- Helper: does this user already hold a match within 90 minutes of this one?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION contributor_has_clash(p_user UUID, p_match UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM matches me
    JOIN matches other
      ON other.id <> me.id
     AND other.contrib_id = p_user
     AND other.deleted_at IS NULL
     AND other.status NOT IN ('completed', 'cancelled')
     AND other.scheduled_at IS NOT NULL
     AND abs(extract(epoch FROM (other.scheduled_at - me.scheduled_at))) < 90 * 60
    WHERE me.id = p_match
      AND me.scheduled_at IS NOT NULL
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_contributor(p_user UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user
      AND ura.revoked_at IS NULL
      AND r.name = 'contributor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ------------------------------------------------------------
-- Organisers need to see who they can pick, but cannot read other users' roles.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION list_contributors()
RETURNS TABLE (id UUID, name TEXT) AS $$
BEGIN
  IF auth_role() NOT IN ('organiser', 'super_admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN QUERY
    SELECT DISTINCT p.id, COALESCE(p.display_name, p.username, 'Unknown')
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE r.name = 'contributor' AND ura.revoked_at IS NULL
    ORDER BY 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ------------------------------------------------------------
-- Organiser / admin: choose who reports a match.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_match_reporting(
  p_match_id UUID,
  p_mode     TEXT,
  p_primary  UUID DEFAULT NULL,
  p_backup   UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  m matches%ROWTYPE;
  admin BOOLEAN := is_admin();
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF NOT (admin OR (auth_role() = 'organiser' AND is_organiser_of(m.comp_instance_id))) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF p_mode NOT IN ('assigned', 'open', 'self') THEN
    RAISE EXCEPTION 'Unknown mode %', p_mode;
  END IF;

  IF NOT admin THEN
    IF m.status IN ('live', 'completed', 'cancelled') THEN
      RAISE EXCEPTION 'This match is % and can no longer be changed', m.status;
    END IF;
    -- Only locks a match that already has someone on it; a brand-new match can always be set up.
    IF m.contrib_id IS NOT NULL AND m.scheduled_at IS NOT NULL
       AND m.scheduled_at - now() < interval '6 hours' THEN
      RAISE EXCEPTION 'This match starts in under 6 hours, so the contributor is locked. Ask an admin to change it.';
    END IF;
  END IF;

  IF p_mode = 'assigned' THEN
    IF p_primary IS NULL THEN RAISE EXCEPTION 'Choose a primary contributor'; END IF;
    IF p_backup IS NOT NULL AND p_backup = p_primary THEN
      RAISE EXCEPTION 'Backup must be a different person';
    END IF;
    IF NOT is_contributor(p_primary) THEN RAISE EXCEPTION 'Primary is not a contributor'; END IF;
    IF p_backup IS NOT NULL AND NOT is_contributor(p_backup) THEN
      RAISE EXCEPTION 'Backup is not a contributor';
    END IF;
    IF contributor_has_clash(p_primary, p_match_id) THEN
      RAISE EXCEPTION 'That contributor already has a match within 90 minutes of this one';
    END IF;
    UPDATE matches
       SET assignment_mode = 'assigned', contrib_id = p_primary, backup_contrib_id = p_backup,
           contrib_confirmed_at = NULL, needs_cover = false
     WHERE id = p_match_id;
  ELSIF p_mode = 'open' THEN
    UPDATE matches
       SET assignment_mode = 'open', contrib_id = NULL, backup_contrib_id = NULL,
           contrib_confirmed_at = NULL, needs_cover = false
     WHERE id = p_match_id;
  ELSE
    -- 'self': the person doing this reports it
    UPDATE matches
       SET assignment_mode = 'self', contrib_id = auth.uid(), backup_contrib_id = NULL,
           contrib_confirmed_at = now(), needs_cover = false
     WHERE id = p_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Contributor: confirm "I will cover this".
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_match(p_match_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE matches
     SET contrib_confirmed_at = now()
   WHERE id = p_match_id AND contrib_id = auth.uid() AND deleted_at IS NULL
     AND status NOT IN ('completed', 'cancelled');
  IF NOT FOUND THEN RAISE EXCEPTION 'This match is not assigned to you'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Contributor: "Can't make it". Hands it back as an open match that needs cover.
-- A named backup is promoted first.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_match(p_match_id UUID) RETURNS VOID AS $$
DECLARE
  m matches%ROWTYPE;
BEGIN
  SELECT * INTO m FROM matches
   WHERE id = p_match_id AND contrib_id = auth.uid() AND deleted_at IS NULL
     AND status NOT IN ('live', 'completed', 'cancelled');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'You cannot release this match (not yours, or already live)';
  END IF;

  IF m.backup_contrib_id IS NOT NULL THEN
    UPDATE matches
       SET contrib_id = m.backup_contrib_id, backup_contrib_id = NULL,
           contrib_confirmed_at = NULL, needs_cover = false
     WHERE id = p_match_id;
  ELSE
    UPDATE matches
       SET contrib_id = NULL, assignment_mode = 'open',
           contrib_confirmed_at = NULL, needs_cover = true
     WHERE id = p_match_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- Contributor: claim an open match. First to claim wins (the row is locked).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_match(p_match_id UUID) RETURNS VOID AS $$
DECLARE
  m matches%ROWTYPE;
BEGIN
  IF NOT (is_contributor(auth.uid()) OR is_admin()) THEN
    RAISE EXCEPTION 'Only contributors can claim matches';
  END IF;

  SELECT * INTO m FROM matches
   WHERE id = p_match_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  IF m.contrib_id IS NOT NULL OR m.assignment_mode <> 'open'
     OR m.status IN ('live', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Someone else already has this match';
  END IF;

  IF contributor_has_clash(auth.uid(), p_match_id) THEN
    RAISE EXCEPTION 'This clashes with another match of yours';
  END IF;

  UPDATE matches
     SET contrib_id = auth.uid(), contrib_confirmed_at = now(), needs_cover = false
   WHERE id = p_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION list_contributors()                               TO authenticated;
GRANT EXECUTE ON FUNCTION assign_match_reporting(UUID, TEXT, UUID, UUID)    TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_match(UUID)                               TO authenticated;
GRANT EXECUTE ON FUNCTION release_match(UUID)                               TO authenticated;
GRANT EXECUTE ON FUNCTION claim_match(UUID)                                 TO authenticated;
