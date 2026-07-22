-- Row Level Security (RLS) Policies
-- This migration enables RLS and creates policies for all tables

-- Enable Row Level Security on all tables
ALTER TABLE IF EXISTS public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ELECTIONS TABLE POLICIES
-- ============================================

-- Allow authenticated users to read all elections
DROP POLICY IF EXISTS "Anyone can view elections" ON public.elections;
CREATE POLICY "Anyone can view elections"
ON public.elections
FOR SELECT
USING (true);

-- Allow authenticated users to insert elections (for admin)
-- Note: In production, you may want to restrict this to admin users only
DROP POLICY IF EXISTS "Authenticated users can create elections" ON public.elections;
CREATE POLICY "Authenticated users can create elections"
ON public.elections
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update elections (for admin)
DROP POLICY IF EXISTS "Authenticated users can update elections" ON public.elections;
CREATE POLICY "Authenticated users can update elections"
ON public.elections
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete elections (for admin)
DROP POLICY IF EXISTS "Authenticated users can delete elections" ON public.elections;
CREATE POLICY "Authenticated users can delete elections"
ON public.elections
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================
-- CANDIDATES TABLE POLICIES
-- ============================================

-- Allow authenticated users to read all candidates
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
CREATE POLICY "Anyone can view candidates"
ON public.candidates
FOR SELECT
USING (true);

-- Allow authenticated users to insert candidates (for admin)
DROP POLICY IF EXISTS "Authenticated users can create candidates" ON public.candidates;
CREATE POLICY "Authenticated users can create candidates"
ON public.candidates
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update candidates (for admin)
DROP POLICY IF EXISTS "Authenticated users can update candidates" ON public.candidates;
CREATE POLICY "Authenticated users can update candidates"
ON public.candidates
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete candidates (for admin)
DROP POLICY IF EXISTS "Authenticated users can delete candidates" ON public.candidates;
CREATE POLICY "Authenticated users can delete candidates"
ON public.candidates
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================
-- VOTES TABLE POLICIES
-- ============================================

-- Allow authenticated users to insert their own votes
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.votes;
CREATE POLICY "Users can insert their own votes"
ON public.votes
FOR INSERT
WITH CHECK (auth.uid()::text = voter_id::text);

-- Allow users to view their own votes
DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
CREATE POLICY "Users can view their own votes"
ON public.votes
FOR SELECT
USING (auth.uid()::text = voter_id::text);

-- Allow users to view all votes (for results display)
DROP POLICY IF EXISTS "Users can view all votes for results" ON public.votes;
CREATE POLICY "Users can view all votes for results"
ON public.votes
FOR SELECT
USING (true);

-- ============================================
-- USER_BIOMETRICS TABLE POLICIES
-- ============================================

-- Allow users to view their own biometric data
DROP POLICY IF EXISTS "Users can view their own biometrics" ON public.user_biometrics;
CREATE POLICY "Users can view their own biometrics"
ON public.user_biometrics
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own biometric data
DROP POLICY IF EXISTS "Users can insert their own biometrics" ON public.user_biometrics;
CREATE POLICY "Users can insert their own biometrics"
ON public.user_biometrics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own biometric data
DROP POLICY IF EXISTS "Users can update their own biometrics" ON public.user_biometrics;
CREATE POLICY "Users can update their own biometrics"
ON public.user_biometrics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own biometric data
DROP POLICY IF EXISTS "Users can delete their own biometrics" ON public.user_biometrics;
CREATE POLICY "Users can delete their own biometrics"
ON public.user_biometrics
FOR DELETE
USING (auth.uid() = user_id);

-- Allow authenticated users to view all biometrics (for admin)
DROP POLICY IF EXISTS "Authenticated users can view all biometrics" ON public.user_biometrics;
CREATE POLICY "Authenticated users can view all biometrics"
ON public.user_biometrics
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete any biometrics (for admin)
DROP POLICY IF EXISTS "Authenticated users can delete any biometrics" ON public.user_biometrics;
CREATE POLICY "Authenticated users can delete any biometrics"
ON public.user_biometrics
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Allow users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to view all profiles (for admin/user listing)
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to delete profiles (for admin)
DROP POLICY IF EXISTS "Authenticated users can delete profiles" ON public.profiles;
CREATE POLICY "Authenticated users can delete profiles"
ON public.profiles
FOR DELETE
USING (auth.role() = 'authenticated');

-- ============================================
-- REPLICA IDENTITY (for Realtime)
-- ============================================

-- Make sure tables use the REPLICA IDENTITY FULL for proper change tracking
ALTER TABLE IF EXISTS public.votes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.candidates REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.elections REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.user_biometrics REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.profiles REPLICA IDENTITY FULL;

-- Add realtime support for tables
-- Note: ALTER PUBLICATION doesn't support IF NOT EXISTS, so we use DO blocks to check first
DO $$
BEGIN
    -- Add votes table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'votes' 
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
    END IF;
    
    -- Add candidates table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'candidates' 
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
    END IF;
    
    -- Add elections table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'elections' 
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;
    END IF;
    
    -- Add user_biometrics table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_biometrics' 
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_biometrics;
    END IF;
    
    -- Add profiles table to realtime publication if not already added
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles' 
        AND schemaname = 'public'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;

