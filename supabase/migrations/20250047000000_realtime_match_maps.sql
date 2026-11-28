-- The live feed shows BREAK between games of a series, so it needs to hear about game status changes.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'match_maps') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_maps;
  END IF;
END $$;
