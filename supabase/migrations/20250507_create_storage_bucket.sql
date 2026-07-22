-- Create voting_history storage bucket
-- Used by supabaseStorageService for optional vote history uploads

INSERT INTO storage.buckets (id, name, public)
VALUES ('voting_history', 'voting_history', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload voting history" ON storage.objects;
CREATE POLICY "Authenticated users can upload voting history"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voting_history'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can read voting history" ON storage.objects;
CREATE POLICY "Authenticated users can read voting history"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voting_history'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can update voting history" ON storage.objects;
CREATE POLICY "Authenticated users can update voting history"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'voting_history'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'voting_history'
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete voting history" ON storage.objects;
CREATE POLICY "Authenticated users can delete voting history"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voting_history'
  AND auth.role() = 'authenticated'
);
