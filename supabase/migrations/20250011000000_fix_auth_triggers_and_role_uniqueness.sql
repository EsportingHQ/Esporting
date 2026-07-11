-- ============================================================
-- Migration 011: Fix Auth Trigger Search Path & Role Uniqueness
-- ============================================================
-- Run order: AFTER 010. Hotfix migration.
--
-- CONTEXT:
-- Two bugs were discovered during live testing of the invite-organiser
-- flow and are fixed here:
--
-- BUG 1: handle_new_user() and assign_default_role() are SECURITY
-- DEFINER functions. Postgres does not guarantee these inherit the
-- caller's search_path, so "profiles", "roles" etc. resolved to
-- nothing, causing "relation does not exist" errors and silent
-- failures when new users (including invited organisers) signed up.
-- Fixed by explicitly setting search_path = public on both functions
-- and fully qualifying every table reference with public.*
--
-- BUG 2: user_role_assignments had a UNIQUE (user_id, role_id,
-- comp_instance_id) constraint intended to prevent duplicate role
-- grants. However Postgres treats NULL <> NULL in unique constraints,
-- so two rows with the same user_id/role_id but comp_instance_id = NULL
-- (i.e. global roles like organiser/admin/contributor/viewer) were NOT
-- caught as duplicates. This allowed the same role to be inserted
-- twice for the same user, causing duplicate rows to render in any
-- UI that lists role assignments (e.g. admin invites page).
-- Fixed by replacing the single constraint with two partial unique
-- indexes that correctly enforce uniqueness for both the NULL
-- (global) and NOT NULL (scoped) cases.
-- ============================================================

-- --------------------------------
-- FIX 1: handle_new_user — set search_path explicitly
-- --------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
  organiser_role_id INT;
  invited_as TEXT;
  invited_by_id UUID;
BEGIN
  -- Build a unique username from the email prefix
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '_', 'g'));
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || '_' || counter;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  -- If this user was invited as an organiser, assign the role immediately
  invited_as    := NEW.raw_user_meta_data->>'invited_as';
  invited_by_id := (NEW.raw_user_meta_data->>'invited_by')::UUID;

  IF invited_as = 'organiser' THEN
    SELECT id INTO organiser_role_id FROM public.roles WHERE name = 'organiser';
    IF organiser_role_id IS NOT NULL THEN
      INSERT INTO public.user_role_assignments (user_id, role_id, granted_by)
      VALUES (NEW.id, organiser_role_id, invited_by_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but do not block user creation
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------
-- FIX 2: assign_default_role — set search_path explicitly
-- --------------------------------

CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER
SET search_path = public
AS $$
DECLARE
  viewer_role_id INT;
BEGIN
  SELECT id INTO viewer_role_id FROM public.roles WHERE name = 'viewer';

  IF viewer_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments (user_id, role_id, granted_by)
    VALUES (NEW.id, viewer_role_id, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'assign_default_role error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------
-- FIX 3: NULL-safe uniqueness on user_role_assignments
-- --------------------------------
-- The original UNIQUE (user_id, role_id, comp_instance_id) constraint
-- from migration 008 does not catch duplicates when comp_instance_id
-- is NULL, because NULL <> NULL in standard SQL comparison.
-- Two partial unique indexes replace it, correctly covering both
-- global roles (comp_instance_id IS NULL) and competition-scoped
-- roles (comp_instance_id IS NOT NULL).

ALTER TABLE user_role_assignments
  DROP CONSTRAINT IF EXISTS user_role_assignments_unique_active;

CREATE UNIQUE INDEX IF NOT EXISTS user_role_assignments_unique_global
  ON user_role_assignments (user_id, role_id)
  WHERE comp_instance_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_role_assignments_unique_scoped
  ON user_role_assignments (user_id, role_id, comp_instance_id)
  WHERE comp_instance_id IS NOT NULL;

-- --------------------------------
-- CLEANUP: remove any duplicate global role rows that existed
-- before this fix was applied (keeps the earliest granted_at per
-- user_id + role_id where comp_instance_id IS NULL)
-- --------------------------------

DELETE FROM user_role_assignments a
USING user_role_assignments b
WHERE a.user_id = b.user_id
  AND a.role_id = b.role_id
  AND a.comp_instance_id IS NULL
  AND b.comp_instance_id IS NULL
  AND a.granted_at > b.granted_at;
