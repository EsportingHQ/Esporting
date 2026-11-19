-- =====================================================================
-- EsportingHQ: clean slate before launch
-- Run by hand in the Supabase SQL editor. NOT a migration (it is never auto-run).
--
-- Removes ALL competitions, matches, teams, players and standings (including
-- anything imported from PandaScore). Keeps: accounts and roles, the waitlist,
-- news, the game catalogue (maps, modes, scoring) and the BR points template.
--
-- Do it in this order:
--   STEP 0  Stop the import that fills this data (ask your developers where it runs).
--   STEP 1  Run the PREVIEW block. Check the numbers are what you expect.
--   STEP 2  Take a backup (Supabase dashboard > Database > Backups), or at least
--           export the tables you care about.
--   STEP 3  Run the DELETE block (it is one transaction: all or nothing).
--   STEP 4  Run the CATALOGUE block to switch off non-launch games.
-- =====================================================================


-- ---------------------------------------------------------------------
-- STEP 1: PREVIEW (read-only)
-- ---------------------------------------------------------------------
select 'competitions'  as what, count(*) from comp_instances
union all select 'matches',            count(*) from matches
union all select 'live matches',       count(*) from matches where status = 'live'
union all select 'teams',              count(*) from teams
union all select 'players',            count(*) from players
union all select 'registrations',      count(*) from comp_registrations
union all select 'accounts kept',      count(*) from profiles
union all select 'waitlist kept',      count(*) from waitlist
union all select 'news kept',          count(*) from news_articles;


-- ---------------------------------------------------------------------
-- STEP 3: DELETE (one transaction; children first so nothing is orphaned)
-- Select from "begin;" to "commit;" and run together.
-- ---------------------------------------------------------------------
begin;

-- match data
delete from br_match_results;
delete from match_scores;
delete from match_events;
delete from match_status_log;
delete from match_participants;
delete from match_lineups;
delete from match_maps;
delete from matches;

-- competition data
delete from standings;
delete from br_points_config;            -- per-competition config (the template table is kept)
delete from comp_registrations;
delete from player_game_assignments;
delete from comp_groups;
delete from comp_stages;
delete from comp_game_titles;

-- things that point at a competition but must survive
update news_articles set comp_instance_id = null where comp_instance_id is not null;
delete from user_role_assignments where comp_instance_id is not null;  -- contributors scoped to a deleted competition

delete from comp_instances;
delete from comp_series;

-- teams and players
delete from team_rosters;
delete from players;
delete from teams;

commit;


-- ---------------------------------------------------------------------
-- STEP 4: CATALOGUE. Keep only the seven launch games switched on.
-- First look at what exists:
-- ---------------------------------------------------------------------
select name, slug, short_code, is_active from game_titles order by name;

-- Then switch off everything that is not one of the seven.
-- (Adjust the patterns if your titles are named differently.)
update game_titles
set is_active = (
     lower(name) ~ '\mfc\s?\d{2}\M'          -- EA FC 26, FC 27 ...
  or lower(name) like '%fc mobile%'
  or lower(name) like '%efootball%'
  or lower(name) like '%call of duty%'
  or lower(name) like '%codm%'
  or lower(name) like '%pubg%'
  or lower(name) like '%free fire%'
  or lower(name) like '%mobile legends%'
  or lower(name) like '%mlbb%'
);

select name, is_active from game_titles order by is_active desc, name;
