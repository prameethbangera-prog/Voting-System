
-- Enable Row Level Security on votes table if not already enabled
ALTER TABLE IF EXISTS public.votes ENABLE ROW LEVEL SECURITY;

-- Make sure tables use the REPLICA IDENTITY FULL for proper change tracking
ALTER TABLE IF EXISTS public.votes REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.candidates REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.elections REPLICA IDENTITY FULL;

-- Add realtime support for votes table
-- Use DO block to check if tables are already in publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'votes' 
        AND schemaname = 'public'
    ) THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'candidates' 
        AND schemaname = 'public'
    ) THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.candidates;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'elections' 
        AND schemaname = 'public'
    ) THEN
ALTER PUBLICATION supabase_realtime ADD TABLE public.elections;
    END IF;
END $$;

-- Create policy to allow authenticated users to insert their own votes
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.votes;
CREATE POLICY "Users can insert their own votes" 
ON public.votes 
FOR INSERT 
WITH CHECK (auth.uid()::text = voter_id::text);

-- Create policy to allow users to view their own votes
DROP POLICY IF EXISTS "Users can view their own votes" ON public.votes;
CREATE POLICY "Users can view their own votes" 
ON public.votes 
FOR SELECT 
USING (auth.uid()::text = voter_id::text);

-- Create policy to allow users to view all votes (for results display)
DROP POLICY IF EXISTS "Users can view all votes for results" ON public.votes;
CREATE POLICY "Users can view all votes for results" 
ON public.votes 
FOR SELECT 
USING (true);

-- Create a function to check if a user has voted in an election
CREATE OR REPLACE FUNCTION public.has_user_voted(p_user_id TEXT, p_election_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE voter_id = p_user_id::UUID 
    AND election_id = p_election_id::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get vote counts for a candidate
CREATE OR REPLACE FUNCTION public.get_candidate_votes(p_candidate_id TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM public.votes 
    WHERE candidate_id = p_candidate_id::UUID
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
