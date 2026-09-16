-- Access-code voting: voters join with election code (no login)
-- Run in Supabase SQL Editor after prior migrations

-- 1) Unique join code per election
ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS elections_access_code_uidx
ON public.elections (access_code)
WHERE access_code IS NOT NULL;

COMMENT ON COLUMN public.elections.access_code IS
'Public join code voters enter instead of logging in. Unique when set.';

-- 2) Ephemeral voter sessions (no auth.users required)
CREATE TABLE IF NOT EXISTS public.voter_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  face_verified BOOLEAN NOT NULL DEFAULT false,
  palm_verified BOOLEAN NOT NULL DEFAULT false,
  face_image_url TEXT,
  has_voted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '12 hours')
);

CREATE INDEX IF NOT EXISTS voter_sessions_election_idx
ON public.voter_sessions (election_id);

ALTER TABLE public.voter_sessions ENABLE ROW LEVEL SECURITY;

-- No direct table access for anon/authenticated — only SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "No direct voter_sessions access" ON public.voter_sessions;

-- 3) Helper: random 8-char code (no ambiguous 0/O/1/I)
CREATE OR REPLACE FUNCTION public.generate_election_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-fill access_code on insert when missing
CREATE OR REPLACE FUNCTION public.elections_set_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  candidate TEXT;
  tries INT := 0;
BEGIN
  IF NEW.access_code IS NULL OR NEW.access_code = '' THEN
    LOOP
      candidate := public.generate_election_access_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.elections e WHERE e.access_code = candidate
      );
      tries := tries + 1;
      IF tries > 20 THEN
        RAISE EXCEPTION 'Could not generate unique access code';
      END IF;
    END LOOP;
    NEW.access_code := candidate;
  ELSE
    NEW.access_code := upper(trim(NEW.access_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS elections_access_code_trg ON public.elections;
CREATE TRIGGER elections_access_code_trg
BEFORE INSERT ON public.elections
FOR EACH ROW
EXECUTE FUNCTION public.elections_set_access_code();

-- Backfill existing elections missing a code
UPDATE public.elections
SET access_code = public.generate_election_access_code()
WHERE access_code IS NULL;

-- 4) RPC: join with code → create session
CREATE OR REPLACE FUNCTION public.join_election_with_code(p_code TEXT)
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
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) < 4 THEN
    RAISE EXCEPTION 'Invalid access code';
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

  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.voter_sessions (election_id, session_token)
  VALUES (el.id, tok)
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

GRANT EXECUTE ON FUNCTION public.join_election_with_code(TEXT) TO anon, authenticated;

-- 5) RPC: mark face/palm complete for session
CREATE OR REPLACE FUNCTION public.complete_session_biometrics(
  p_token TEXT,
  p_face_verified BOOLEAN DEFAULT NULL,
  p_palm_verified BOOLEAN DEFAULT NULL,
  p_face_image_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
BEGIN
  SELECT * INTO sess
  FROM public.voter_sessions
  WHERE session_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  IF sess.expires_at < now() THEN
    RAISE EXCEPTION 'Session expired. Enter the election code again.';
  END IF;

  IF sess.has_voted THEN
    RAISE EXCEPTION 'You have already voted in this session';
  END IF;

  UPDATE public.voter_sessions
  SET
    face_verified = COALESCE(p_face_verified, face_verified),
    palm_verified = COALESCE(p_palm_verified, palm_verified),
    face_image_url = COALESCE(p_face_image_url, face_image_url)
  WHERE id = sess.id
  RETURNING * INTO sess;

  RETURN jsonb_build_object(
    'session_id', sess.id,
    'face_verified', sess.face_verified,
    'palm_verified', sess.palm_verified,
    'has_voted', sess.has_voted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_session_biometrics(TEXT, BOOLEAN, BOOLEAN, TEXT) TO anon, authenticated;

-- 6) RPC: ballot (candidates) for a valid session
CREATE OR REPLACE FUNCTION public.get_session_ballot(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess RECORD;
  el RECORD;
  cands JSONB;
BEGIN
  SELECT * INTO sess
  FROM public.voter_sessions
  WHERE session_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid session';
  END IF;

  IF sess.expires_at < now() THEN
    RAISE EXCEPTION 'Session expired';
  END IF;

  SELECT * INTO el FROM public.elections WHERE id = sess.election_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'party', c.party,
      'bio', c.bio,
      'photo_url', c.photo_url
    ) ORDER BY c.name
  ), '[]'::jsonb)
  INTO cands
  FROM public.candidates c
  WHERE c.election_id = el.id;

  RETURN jsonb_build_object(
    'session', jsonb_build_object(
      'id', sess.id,
      'face_verified', sess.face_verified,
      'palm_verified', sess.palm_verified,
      'has_voted', sess.has_voted,
      'expires_at', sess.expires_at
    ),
    'election', jsonb_build_object(
      'id', el.id,
      'title', el.title,
      'description', el.description,
      'start_date', el.start_date,
      'end_date', el.end_date,
      'is_active', el.is_active
    ),
    'candidates', cands
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_session_ballot(TEXT) TO anon, authenticated;

-- 7) RPC: cast vote with session (requires face + palm, one vote)
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

  tx_hash := 'tx-' || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.votes (voter_id, election_id, candidate_id, transaction_hash)
  VALUES (sess.id, el.id, cand.id, tx_hash)
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
