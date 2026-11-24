-- Security hardening from the Supabase advisor (Nov 2026).
--  1. Trigger and internal helper functions are no longer callable through the public API.
--     (Triggers keep working: a trigger function's privilege is only checked when the trigger is created.)
--     Functions used inside row level security policies (is_admin, auth_role, ...) are left alone.
--  2. Fixed search_path on the helper and trigger functions that had none.
--  3. The two quota views now respect the caller's permissions instead of the owner's.
--  4. Duplicate index on news_articles removed.

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'assign_default_role()', 'enforce_fixture_time_rule()', 'enforce_trial_live_limit()',
    'enforce_trial_team_limit()', 'handle_new_user()', 'log_audit()', 'rls_auto_enable()',
    'trg_advance_bracket()', 'trg_organiser_profile()', 'trg_set_winner_on_complete()',
    'trg_standings_from_match()', 'trg_standings_from_score()', 'trg_bracket_needs_teams()',
    'update_match_scores()', 'void_corrected_event()', 'block_contrib_on_external_match()',
    '_can_run_fixtures(uuid)', 'compute_match_winner(uuid)'
  ] LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skipped %', f;
    END;
  END LOOP;
END $$;

ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_organiser_of(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_assigned_contributor(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.auth_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_match_scores() SET search_path = public, pg_temp;
ALTER FUNCTION public.void_corrected_event() SET search_path = public, pg_temp;
ALTER FUNCTION public.block_contrib_on_external_match() SET search_path = public, pg_temp;

ALTER VIEW public.quota_metrics_24h SET (security_invoker = true);
ALTER VIEW public.quota_metrics_hourly SET (security_invoker = true);

DROP INDEX IF EXISTS public.news_articles_status_idx;
