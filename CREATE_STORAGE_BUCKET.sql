-- Create voting_history storage bucket
-- Run this in Supabase Dashboard SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voting_history', 'voting_history', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for authenticated users
-- Allow authenticated users to upload voting history
DROP POLICY IF EXISTS "Authenticated users can upload voting history" ON storage.objects;
CREATE POLICY "Authenticated users can upload voting history"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voting_history' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to read voting history
DROP POLICY IF EXISTS "Authenticated users can read voting history" ON storage.objects;
CREATE POLICY "Authenticated users can read voting history"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voting_history' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update voting history
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

-- Allow authenticated users to delete voting history
DROP POLICY IF EXISTS "Authenticated users can delete voting history" ON storage.objects;
CREATE POLICY "Authenticated users can delete voting history"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voting_history' 
  AND auth.role() = 'authenticated'
);

