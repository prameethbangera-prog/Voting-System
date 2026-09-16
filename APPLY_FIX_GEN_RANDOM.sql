-- Fix: gen_random_bytes is not available without pgcrypto
-- Run this in Supabase SQL Editor, then try joining with the access code again

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
