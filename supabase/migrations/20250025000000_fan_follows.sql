-- Fan accounts: follow teams and competitions, saved to the account.
CREATE TABLE IF NOT EXISTS follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('team', 'competition')),
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own follows read" ON follows FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "own follows insert" ON follows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "own follows delete" ON follows FOR DELETE USING (user_id = auth.uid());
