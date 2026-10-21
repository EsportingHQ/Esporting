-- -------------------------------------------------------------
-- MIGRATION: 20250012000000_waitlist.sql
-- Waitlist email capture for Coming Soon launch
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    source TEXT NOT NULL DEFAULT 'landing_page'
);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated visitors to submit their email
CREATE POLICY "allow_anon_insert_waitlist"
    ON public.waitlist
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow reading count for social proof
CREATE POLICY "allow_public_count_waitlist"
    ON public.waitlist
    FOR SELECT
    TO anon, authenticated
    USING (true);
