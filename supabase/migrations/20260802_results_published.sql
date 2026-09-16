-- Admin-controlled results release
-- Run in Supabase SQL Editor

ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS results_published BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.elections.results_published IS
'When true, election results are visible on the public Results page.';

-- Public RPC: only returns tallies for published elections (no voter identities)
CREATE OR REPLACE FUNCTION public.get_published_election_results()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(election_row ORDER BY published_at DESC NULLS LAST), '[]'::jsonb)
  INTO result
  FROM (
    SELECT
      jsonb_build_object(
        'id', e.id,
        'title', e.title,
        'description', e.description,
        'end_date', e.end_date,
        'results_published_at', e.results_published_at,
        'candidates', (
          SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'name', c.name,
              'party', c.party,
              'voteCount', (
                SELECT COUNT(*)::int
                FROM public.votes v
                WHERE v.candidate_id = c.id
              )
            ) ORDER BY c.name
          ), '[]'::jsonb)
          FROM public.candidates c
          WHERE c.election_id = e.id
        )
      ) AS election_row,
      e.results_published_at AS published_at
    FROM public.elections e
    WHERE e.results_published = true
  ) sub;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_election_results() TO anon, authenticated;

-- Admin helper: publish / unpublish (callable by authenticated admin UI via update, or RPC)
CREATE OR REPLACE FUNCTION public.set_election_results_published(
  p_election_id UUID,
  p_published BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  el RECORD;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Only signed-in admins can publish results';
  END IF;

  UPDATE public.elections
  SET
    results_published = p_published,
    results_published_at = CASE WHEN p_published THEN now() ELSE NULL END
  WHERE id = p_election_id
  RETURNING * INTO el;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Election not found';
  END IF;

  RETURN jsonb_build_object(
    'id', el.id,
    'title', el.title,
    'results_published', el.results_published,
    'results_published_at', el.results_published_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_election_results_published(UUID, BOOLEAN) TO authenticated;
