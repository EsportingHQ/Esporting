-- Organiser tiers: trial (unverified), community, business (CAC-registered).
-- Trial organisers: 1 live tournament at a time, max 8 teams per tournament.

CREATE TABLE IF NOT EXISTS organiser_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'trial' CHECK (tier IN ('trial', 'community', 'business')),
  org_name TEXT,
  tier_set_by UUID,
  tier_set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tier_note TEXT
);
ALTER TABLE organiser_profiles ENABLE ROW LEVEL SECURITY;
-- The tier and organisation name are shown publicly on tournaments, so reads are open.
CREATE POLICY "public read organiser_profiles" ON organiser_profiles FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS tier_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_tier TEXT NOT NULL CHECK (requested_tier IN ('community', 'business')),
  org_name TEXT,
  registration_no TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tier_upgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read tier requests" ON tier_upgrade_requests FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Existing organisers were already hand-approved by Esporting: community tier.
INSERT INTO organiser_profiles (user_id, tier)
SELECT DISTINCT ura.user_id, 'community'
  FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id
 WHERE r.name = 'organiser' AND ura.revoked_at IS NULL AND ura.comp_instance_id IS NULL
ON CONFLICT DO NOTHING;

-- Anyone given the organiser role without a profile (admin invite) starts at community.
CREATE OR REPLACE FUNCTION trg_organiser_profile() RETURNS trigger AS $$
BEGIN
  IF NEW.comp_instance_id IS NULL AND EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND name = 'organiser') THEN
    INSERT INTO organiser_profiles (user_id, tier) VALUES (NEW.user_id, 'community') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_organiser_profile ON user_role_assignments;
CREATE TRIGGER trg_organiser_profile AFTER INSERT ON user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION trg_organiser_profile();

-- Approved applications start on the trial tier.
CREATE OR REPLACE FUNCTION review_organiser_application(p_id UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE a organiser_applications%ROWTYPE; rid INT;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO a FROM organiser_applications WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF a.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;

  UPDATE organiser_applications
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_id;

  IF p_approve THEN
    INSERT INTO organiser_profiles (user_id, tier, org_name, tier_set_by)
    VALUES (a.user_id, 'trial', a.org_name, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET org_name = coalesce(organiser_profiles.org_name, EXCLUDED.org_name);
    SELECT id INTO rid FROM roles WHERE name = 'organiser';
    IF NOT EXISTS (SELECT 1 FROM user_role_assignments
                   WHERE user_id = a.user_id AND role_id = rid AND comp_instance_id IS NULL AND revoked_at IS NULL) THEN
      INSERT INTO user_role_assignments (user_id, role_id, granted_by) VALUES (a.user_id, rid, auth.uid());
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION request_tier_upgrade(p_tier TEXT, p_org_name TEXT, p_registration_no TEXT, p_evidence TEXT)
RETURNS VOID AS $$
DECLARE cur TEXT;
BEGIN
  SELECT tier INTO cur FROM organiser_profiles WHERE user_id = auth.uid();
  IF cur IS NULL THEN RAISE EXCEPTION 'Only organisers can request an upgrade'; END IF;
  IF p_tier NOT IN ('community', 'business') THEN RAISE EXCEPTION 'Unknown tier'; END IF;
  IF (p_tier = 'community' AND cur <> 'trial') OR (p_tier = 'business' AND cur = 'business') THEN
    RAISE EXCEPTION 'You are already at or above that tier';
  END IF;
  IF coalesce(trim(p_evidence), '') = '' THEN RAISE EXCEPTION 'Add links or details so we can verify you'; END IF;
  IF p_tier = 'business' AND coalesce(trim(p_registration_no), '') = '' THEN
    RAISE EXCEPTION 'Enter your CAC registration number';
  END IF;
  IF EXISTS (SELECT 1 FROM tier_upgrade_requests WHERE user_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a request waiting for review';
  END IF;
  INSERT INTO tier_upgrade_requests (user_id, requested_tier, org_name, registration_no, evidence)
  VALUES (auth.uid(), p_tier, nullif(trim(p_org_name), ''), nullif(trim(p_registration_no), ''), trim(p_evidence));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION list_tier_requests()
RETURNS TABLE (id UUID, user_id UUID, display_name TEXT, requested_tier TEXT, current_tier TEXT, org_name TEXT,
               registration_no TEXT, evidence TEXT, status TEXT, review_note TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT r.id, r.user_id, coalesce(p.display_name, p.username), r.requested_tier, op.tier, r.org_name,
         r.registration_no, r.evidence, r.status, r.review_note, r.created_at
    FROM tier_upgrade_requests r
    JOIN profiles p ON p.id = r.user_id
    LEFT JOIN organiser_profiles op ON op.user_id = r.user_id
   ORDER BY (r.status = 'pending') DESC, r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION list_organiser_tiers()
RETURNS TABLE (user_id UUID, display_name TEXT, org_name TEXT, tier TEXT, live_count BIGINT) AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT op.user_id, coalesce(p.display_name, p.username), op.org_name, op.tier,
         (SELECT count(*) FROM comp_instances c WHERE c.organiser_id = op.user_id AND c.deleted_at IS NULL
             AND c.status IN ('registration', 'ongoing'))
    FROM organiser_profiles op JOIN profiles p ON p.id = op.user_id
   ORDER BY op.tier, p.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_organiser_tier(p_user UUID, p_tier TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_tier NOT IN ('trial', 'community', 'business') THEN RAISE EXCEPTION 'Unknown tier'; END IF;
  UPDATE organiser_profiles SET tier = p_tier, tier_set_by = auth.uid(), tier_set_at = now(), tier_note = p_note
   WHERE user_id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'That user is not an organiser'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION review_tier_request(p_id UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE r tier_upgrade_requests%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO r FROM tier_upgrade_requests WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'Already reviewed'; END IF;
  UPDATE tier_upgrade_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_id;
  IF p_approve THEN
    UPDATE organiser_profiles
       SET tier = r.requested_tier, org_name = coalesce(r.org_name, org_name),
           tier_set_by = auth.uid(), tier_set_at = now(), tier_note = p_note
     WHERE user_id = r.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trial limits (admins and service calls are exempt)
CREATE OR REPLACE FUNCTION enforce_trial_live_limit() RETURNS trigger AS $$
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN RETURN NEW; END IF;
  IF NEW.status IN ('registration', 'ongoing')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND EXISTS (SELECT 1 FROM organiser_profiles WHERE user_id = NEW.organiser_id AND tier = 'trial')
     AND EXISTS (SELECT 1 FROM comp_instances c WHERE c.organiser_id = NEW.organiser_id AND c.id <> NEW.id
                  AND c.deleted_at IS NULL AND c.status IN ('registration', 'ongoing')) THEN
    RAISE EXCEPTION 'Trial organisers can run one live tournament at a time. Finish the current one or request an upgrade on your profile page.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_trial_live_limit ON comp_instances;
CREATE TRIGGER trg_trial_live_limit BEFORE INSERT OR UPDATE OF status ON comp_instances
  FOR EACH ROW EXECUTE FUNCTION enforce_trial_live_limit();

CREATE OR REPLACE FUNCTION enforce_trial_team_limit() RETURNS trigger AS $$
DECLARE org UUID;
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN RETURN NEW; END IF;
  SELECT organiser_id INTO org FROM comp_instances WHERE id = NEW.comp_instance_id;
  IF EXISTS (SELECT 1 FROM organiser_profiles WHERE user_id = org AND tier = 'trial')
     AND (SELECT count(*) FROM comp_registrations WHERE comp_instance_id = NEW.comp_instance_id) >= 8 THEN
    RAISE EXCEPTION 'Trial organisers can add up to 8 teams per tournament. Request an upgrade on your profile page.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
DROP TRIGGER IF EXISTS trg_trial_team_limit ON comp_registrations;
CREATE TRIGGER trg_trial_team_limit BEFORE INSERT ON comp_registrations
  FOR EACH ROW EXECUTE FUNCTION enforce_trial_team_limit();

REVOKE EXECUTE ON FUNCTION request_tier_upgrade(TEXT, TEXT, TEXT, TEXT), list_tier_requests(), list_organiser_tiers(),
  set_organiser_tier(UUID, TEXT, TEXT), review_tier_request(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION request_tier_upgrade(TEXT, TEXT, TEXT, TEXT), list_tier_requests(), list_organiser_tiers(),
  set_organiser_tier(UUID, TEXT, TEXT), review_tier_request(UUID, BOOLEAN, TEXT) TO authenticated;
