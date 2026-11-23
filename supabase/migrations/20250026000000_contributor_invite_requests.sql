-- Organisers request contributors for their own tournaments; Esporting approves before the invite email goes out.
CREATE TABLE IF NOT EXISTS contributor_invite_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_instance_id UUID NOT NULL REFERENCES comp_instances(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contributor_invite_pending_unique
  ON contributor_invite_requests (comp_instance_id, lower(email)) WHERE status = 'pending';
ALTER TABLE contributor_invite_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read contributor requests" ON contributor_invite_requests FOR SELECT
  USING (requested_by = auth.uid() OR is_admin());

CREATE OR REPLACE FUNCTION reject_contributor_request(p_id UUID, p_note TEXT DEFAULT NULL) RETURNS VOID AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE contributor_invite_requests
     SET status = 'rejected', review_note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = p_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or already reviewed'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE EXECUTE ON FUNCTION reject_contributor_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_contributor_request(UUID, TEXT) TO authenticated;
