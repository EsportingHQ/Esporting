-- Public sign-up + Verified Tournament Organiser approval
--
-- 1. SECURITY: sign-up metadata is client-controlled, so the "invited_as" metadata
--    can no longer grant roles on its own. Roles from invites are only applied when
--    the account was really created by an invite (auth.users.invited_at is set, which
--    only the admin API does) AND the inviter is a super_admin.
-- 2. organiser_applications: anyone signs up as a normal user; a TO applies, and
--    Esporting approves. Approval grants the organiser role (= Verified TO).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
  target_role_id INT;
  invited_as TEXT;
  invited_by_id UUID;
  invite_comp_instance_id UUID;
  inviter_is_admin BOOLEAN := false;
BEGIN
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '_', 'g'));
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, final_username,
          COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  -- Only trust invite metadata on genuinely invited accounts, from a real admin.
  IF NEW.invited_at IS NOT NULL THEN
    invited_as := NEW.raw_user_meta_data->>'invited_as';
    BEGIN
      invited_by_id := (NEW.raw_user_meta_data->>'invited_by')::UUID;
    EXCEPTION WHEN OTHERS THEN invited_by_id := NULL;
    END;
    SELECT EXISTS (
      SELECT 1 FROM public.user_role_assignments ura JOIN public.roles r ON r.id = ura.role_id
      WHERE ura.user_id = invited_by_id AND r.name = 'super_admin' AND ura.revoked_at IS NULL
    ) INTO inviter_is_admin;

    IF inviter_is_admin AND invited_as = 'organiser' THEN
      SELECT id INTO target_role_id FROM public.roles WHERE name = 'organiser';
      IF target_role_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_id, granted_by)
        VALUES (NEW.id, target_role_id, invited_by_id) ON CONFLICT DO NOTHING;
      END IF;
    ELSIF inviter_is_admin AND invited_as = 'contributor' THEN
      invite_comp_instance_id := (NEW.raw_user_meta_data->>'comp_instance_id')::UUID;
      SELECT id INTO target_role_id FROM public.roles WHERE name = 'contributor';
      IF target_role_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_id, comp_instance_id, granted_by)
        VALUES (NEW.id, target_role_id, invite_comp_instance_id, invited_by_id) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Dead trigger: read a column profiles does not have, and could grant organiser from
-- client-controlled metadata.
DROP TRIGGER IF EXISTS trg_handle_invite_role ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_invite_role();

CREATE TABLE IF NOT EXISTS organiser_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_name    TEXT NOT NULL,
  games       TEXT[] NOT NULL DEFAULT '{}',
  experience  TEXT,
  links       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  review_note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_org_app_one_pending
  ON organiser_applications(user_id) WHERE status = 'pending';

ALTER TABLE organiser_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read own or admin applications" ON organiser_applications;
CREATE POLICY "read own or admin applications" ON organiser_applications
  FOR SELECT USING (user_id = auth.uid() OR is_admin());
-- No direct INSERT/UPDATE/DELETE policies: everything goes through the functions below.

CREATE OR REPLACE FUNCTION apply_as_organiser(
  p_org_name TEXT, p_games TEXT[], p_experience TEXT DEFAULT NULL, p_links TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN RAISE EXCEPTION 'Enter your organisation or brand name'; END IF;
  IF coalesce(array_length(p_games, 1), 0) = 0 THEN RAISE EXCEPTION 'Choose at least one game'; END IF;
  IF EXISTS (
    SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid() AND ura.revoked_at IS NULL AND r.name IN ('organiser','super_admin')
  ) THEN RAISE EXCEPTION 'You are already a verified organiser'; END IF;

  UPDATE organiser_applications
     SET org_name = trim(p_org_name), games = p_games, experience = p_experience, links = p_links
   WHERE user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    INSERT INTO organiser_applications (user_id, org_name, games, experience, links)
    VALUES (auth.uid(), trim(p_org_name), p_games, p_experience, p_links);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION list_organiser_applications()
RETURNS TABLE (id UUID, user_id UUID, email TEXT, display_name TEXT, org_name TEXT, games TEXT[],
               experience TEXT, links TEXT, status TEXT, review_note TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
    SELECT a.id, a.user_id, u.email::text, p.display_name, a.org_name, a.games,
           a.experience, a.links, a.status, a.review_note, a.created_at
    FROM organiser_applications a
    JOIN profiles p ON p.id = a.user_id
    JOIN auth.users u ON u.id = a.user_id
    ORDER BY (a.status = 'pending') DESC, a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

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
    SELECT id INTO rid FROM roles WHERE name = 'organiser';
    IF NOT EXISTS (SELECT 1 FROM user_role_assignments
                   WHERE user_id = a.user_id AND role_id = rid AND comp_instance_id IS NULL AND revoked_at IS NULL) THEN
      INSERT INTO user_role_assignments (user_id, role_id, granted_by) VALUES (a.user_id, rid, auth.uid());
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION apply_as_organiser(TEXT, TEXT[], TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION list_organiser_applications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION review_organiser_application(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_as_organiser(TEXT, TEXT[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION list_organiser_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION review_organiser_application(UUID, BOOLEAN, TEXT) TO authenticated;
