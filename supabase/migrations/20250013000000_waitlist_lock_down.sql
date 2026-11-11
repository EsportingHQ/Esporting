-- -------------------------------------------------------------
-- MIGRATION: 20250013000000_waitlist_lock_down.sql
-- Stop anonymous visitors from reading the waitlist.
-- -------------------------------------------------------------
-- The original waitlist migration added a SELECT policy with
-- USING (true) for anon and authenticated roles, "for social proof".
-- Because the Supabase publishable key ships in the browser bundle,
-- that policy let anyone list every signup email through the API.
--
-- Nothing in the app reads this table (signups go through
-- /api/waitlist, which only inserts), so the policy can simply go.
-- Inserts stay open so the signup form keeps working.
-- -------------------------------------------------------------

DROP POLICY IF EXISTS "allow_public_count_waitlist" ON public.waitlist;

-- Belt and braces: remove table-level read access for the public roles.
-- (RLS already blocks reads once the policy above is gone.)
REVOKE SELECT ON public.waitlist FROM anon, authenticated;

-- If a public signup counter is wanted later, expose only the number,
-- never the rows:
--
-- CREATE OR REPLACE FUNCTION public.waitlist_count()
-- RETURNS bigint
-- LANGUAGE sql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$ SELECT count(*) FROM public.waitlist $$;
-- GRANT EXECUTE ON FUNCTION public.waitlist_count() TO anon, authenticated;
