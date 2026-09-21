-- Eligible voters + palm biometrics + authenticated join
-- Run in Supabase SQL Editor after APPLY_ACCESS_CODE_MIGRATION.sql / APPLY_FIX_GEN_RANDOM.sql

-- 1) Palm columns on user_biometrics
ALTER TABLE public.user_biometrics
ADD COLUMN IF NOT EXISTS palm_image_url TEXT;

ALTER TABLE public.user_biometrics
ADD COLUMN IF NOT EXISTS face_descriptor JSONB;

ALTER TABLE public.user_biometrics
ADD COLUMN IF NOT EXISTS palm_descriptor JSONB;

-- 2) Eligible emails per election
CREATE TABLE IF NOT EXISTS public.election_eligible_voters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, email)
);

CREATE INDEX IF NOT EXISTS election_eligible_voters_election_idx
ON public.election_eligible_voters (election_id);

CREATE INDEX IF NOT EXISTS election_eligible_voters_email_idx
ON public.election_eligible_voters (lower(email));

ALTER TABLE public.election_eligible_voters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage eligible voters" ON public.election_eligible_voters;
CREATE POLICY "Authenticated can manage eligible voters"
ON public.election_eligible_voters
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can read eligible emails for join check" ON public.election_eligible_voters;
-- Join check is done via SECURITY DEFINER RPC; no public SELECT needed

-- 3) Link voter_sessions to auth user + email
ALTER TABLE public.voter_sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.voter_sessions
ADD COLUMN IF NOT EXISTS voter_email TEXT;

-- Unique: one vote session row per user per election that has voted
CREATE UNIQUE INDEX IF NOT EXISTS voter_sessions_user_election_voted_uidx
ON public.voter_sessions (user_id, election_id)
WHERE has_voted = true AND user_id IS NOT NULL;

-- 4) Join with code + email (must be logged in as that email, eligible, biometrics registered)
CREATE OR REPLACE FUNCTION public.join_election_with_code_and_email(
  p_code TEXT,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  el RECORD;
  tok TEXT;
  sess RECORD;
  now_ts TIMESTAMPTZ := now();
  email_norm TEXT;
  bio RECORD;
  uid UUID;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Please log in before joining an election';
  END IF;

  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RAISE EXCEPTION 'Invalid access code';
  END IF;

  email_norm := lower(trim(COALESCE(p_email, '')));
  IF email_norm = '' OR position('@' in email_norm) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email';
  END IF;

  -- Logged-in email must match entered email
  IF lower(trim(COALESCE(auth.jwt() ->> 'email', ''))) <> email_norm THEN
    RAISE EXCEPTION 'Email must match your logged-in account';
  END IF;

  SELECT *
  INTO el
  FROM public.elections
  WHERE upper(trim(access_code)) = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Election not found for this code';
  END IF;

  IF el.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'This election is not active';
  END IF;

  IF now_ts < el.start_date THEN
    RAISE EXCEPTION 'This election has not started yet';
  END IF;

  IF now_ts > el.end_date THEN
    RAISE EXCEPTION 'This election has ended';
  END IF;

  -- Must be on eligible list
  IF NOT EXISTS (
    SELECT 1 FROM public.election_eligible_voters ev
    WHERE ev.election_id = el.id AND lower(ev.email) = email_norm
  ) THEN
    RAISE EXCEPTION 'This email is not eligible for this election';
  END IF;

  -- Must have face + palm registered
  SELECT * INTO bio
  FROM public.user_biometrics
  WHERE user_id = uid
  LIMIT 1;

  IF NOT FOUND OR bio.face_image_url IS NULL OR bio.palm_image_url IS NULL THEN
    RAISE EXCEPTION 'Register your face and palm first before voting';
  END IF;

  -- Already voted?
  IF EXISTS (
    SELECT 1 FROM public.votes v
    WHERE v.election_id = el.id AND v.voter_id = uid
  ) THEN
    RAISE EXCEPTION 'You have already voted in this election';
  END IF;

  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.voter_sessions (election_id, session_token, user_id, voter_email)
  VALUES (el.id, tok, uid, email_norm)
  RETURNING * INTO sess;

  RETURN jsonb_build_object(
    'session_token', sess.session_token,
    'session_id', sess.id,
    'expires_at', sess.expires_at,
    'election', jsonb_build_object(
      'id', el.id,
      'title', el.title,
      'description', el.description,
      'start_date', el.start_date,
      'end_date', el.end_date,
      'access_code', el.access_code
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_election_with_code_and_email(TEXT, TEXT) TO authenticated;

-- 5) Cast vote: use auth user id as voter_id when available
CREATE OR REPLACE FUNCTION public.cast_vote_with_session(
  p_token TEXT,
  p_candidate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
  el RECORD;
  cand RECORD;
  vote_id UUID;
  tx_hash TEXT;
  voter_uuid UUID;
BEGIN
  SELECT * INTO sess
  FROM public.voter_sessions
  WHERE session_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  IF sess.expires_at < now() THEN
    RAISE EXCEPTION 'Session expired';
  END IF;

  IF sess.has_voted THEN
    RAISE EXCEPTION 'You have already cast your vote';
  END IF;

  IF NOT sess.face_verified OR NOT sess.palm_verified THEN
    RAISE EXCEPTION 'Complete face and palm verification before voting';
  END IF;

  SELECT * INTO el FROM public.elections WHERE id = sess.election_id;

  IF el.is_active IS NOT TRUE OR now() < el.start_date OR now() > el.end_date THEN
    RAISE EXCEPTION 'Election is not open for voting';
  END IF;

  SELECT * INTO cand
  FROM public.candidates
  WHERE id = p_candidate_id AND election_id = el.id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid candidate for this election';
  END IF;

  voter_uuid := COALESCE(sess.user_id, sess.id);

  IF EXISTS (
    SELECT 1 FROM public.votes v
    WHERE v.election_id = el.id AND v.voter_id = voter_uuid
  ) THEN
    RAISE EXCEPTION 'You have already cast your vote';
  END IF;

  tx_hash := 'tx-' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.votes (voter_id, election_id, candidate_id, transaction_hash)
  VALUES (voter_uuid, el.id, cand.id, tx_hash)
  RETURNING id INTO vote_id;

  UPDATE public.voter_sessions
  SET has_voted = true
  WHERE id = sess.id;

  RETURN jsonb_build_object(
    'vote_id', vote_id,
    'transaction_hash', tx_hash,
    'election_id', el.id,
    'candidate_id', cand.id
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already cast your vote';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_vote_with_session(TEXT, UUID) TO anon, authenticated;

-- 6) Helper: list eligible emails for an election (admin UI)
CREATE OR REPLACE FUNCTION public.list_election_eligible_voters(p_election_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Only signed-in admins can list eligible voters';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', ev.id, 'email', ev.email, 'created_at', ev.created_at)
    ORDER BY ev.email
  ), '[]'::jsonb)
  INTO result
  FROM public.election_eligible_voters ev
  WHERE ev.election_id = p_election_id;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_election_eligible_voters(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_election_eligible_voter(
  p_election_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_norm TEXT;
  row_rec RECORD;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Only signed-in admins can add eligible voters';
  END IF;

  email_norm := lower(trim(COALESCE(p_email, '')));
  IF email_norm = '' OR position('@' in email_norm) = 0 THEN
    RAISE EXCEPTION 'Enter a valid email';
  END IF;

  INSERT INTO public.election_eligible_voters (election_id, email)
  VALUES (p_election_id, email_norm)
  ON CONFLICT (election_id, email) DO NOTHING
  RETURNING * INTO row_rec;

  IF NOT FOUND THEN
    SELECT * INTO row_rec
    FROM public.election_eligible_voters
    WHERE election_id = p_election_id AND email = email_norm;
  END IF;

  RETURN jsonb_build_object('id', row_rec.id, 'email', row_rec.email, 'election_id', row_rec.election_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_election_eligible_voter(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_election_eligible_voter(
  p_election_id UUID,
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_norm TEXT;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Only signed-in admins can remove eligible voters';
  END IF;

  email_norm := lower(trim(COALESCE(p_email, '')));

  DELETE FROM public.election_eligible_voters
  WHERE election_id = p_election_id AND lower(email) = email_norm;

  RETURN jsonb_build_object('removed', true, 'email', email_norm);
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_election_eligible_voter(UUID, TEXT) TO authenticated;
