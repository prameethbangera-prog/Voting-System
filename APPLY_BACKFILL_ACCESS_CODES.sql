-- Backfill access codes for elections that don't have one yet
-- Also safe if the column/functions already exist from APPLY_ACCESS_CODE_MIGRATION.sql

ALTER TABLE public.elections
ADD COLUMN IF NOT EXISTS access_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS elections_access_code_uidx
ON public.elections (access_code)
WHERE access_code IS NOT NULL;

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

-- Assign a unique code to every election missing one
DO $$
DECLARE
  r RECORD;
  candidate TEXT;
  tries INT;
BEGIN
  FOR r IN SELECT id FROM public.elections WHERE access_code IS NULL OR access_code = '' LOOP
    tries := 0;
    LOOP
      candidate := public.generate_election_access_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.elections e WHERE e.access_code = candidate);
      tries := tries + 1;
      IF tries > 30 THEN
        RAISE EXCEPTION 'Could not generate unique access code';
      END IF;
    END LOOP;
    UPDATE public.elections SET access_code = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- RPC so admin UI can generate a code for one election
CREATE OR REPLACE FUNCTION public.ensure_election_access_code(p_election_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing TEXT;
  candidate TEXT;
  tries INT := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'Only signed-in admins can generate access codes';
  END IF;

  SELECT access_code INTO existing
  FROM public.elections
  WHERE id = p_election_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Election not found';
  END IF;

  IF existing IS NOT NULL AND existing <> '' THEN
    RETURN existing;
  END IF;

  LOOP
    candidate := public.generate_election_access_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.elections e WHERE e.access_code = candidate);
    tries := tries + 1;
    IF tries > 30 THEN
      RAISE EXCEPTION 'Could not generate unique access code';
    END IF;
  END LOOP;

  UPDATE public.elections
  SET access_code = candidate
  WHERE id = p_election_id;

  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_election_access_code(UUID) TO authenticated;

-- Show codes after backfill (check results in Table Editor / SQL)
SELECT id, title, access_code FROM public.elections ORDER BY created_at DESC;
