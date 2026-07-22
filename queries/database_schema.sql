-- Create elections table
CREATE TABLE IF NOT EXISTS public.elections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    party TEXT,
    bio TEXT,
    photo_url TEXT,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create votes table
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voter_id UUID NOT NULL,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(voter_id, election_id) -- Prevent double voting
);

-- Create user_biometrics table for face recognition
CREATE TABLE IF NOT EXISTS public.user_biometrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    face_image TEXT NOT NULL, -- Base64 encoded image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create vote_results view
CREATE OR REPLACE VIEW public.vote_results AS
SELECT 
    e.id as election_id,
    e.title as election_title,
    c.id as candidate_id,
    c.name as candidate_name,
    c.party,
    COUNT(v.id) as vote_count
FROM public.elections e
LEFT JOIN public.candidates c ON c.election_id = e.id
LEFT JOIN public.votes v ON v.candidate_id = c.id
GROUP BY e.id, e.title, c.id, c.name, c.party;

-- Create cast_vote function
CREATE OR REPLACE FUNCTION public.cast_vote(
    p_voter_id UUID,
    p_election_id UUID,
    p_candidate_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if election exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.elections 
        WHERE id = p_election_id 
        AND is_active = true 
        AND CURRENT_TIMESTAMP BETWEEN start_date AND end_date
    ) THEN
        RAISE EXCEPTION 'Election not found or not active';
    END IF;

    -- Check if candidate exists in the election
    IF NOT EXISTS (
        SELECT 1 FROM public.candidates 
        WHERE id = p_candidate_id 
        AND election_id = p_election_id
    ) THEN
        RAISE EXCEPTION 'Candidate not found in this election';
    END IF;

    -- Check if user has already voted
    IF EXISTS (
        SELECT 1 FROM public.votes 
        WHERE voter_id = p_voter_id 
        AND election_id = p_election_id
    ) THEN
        RAISE EXCEPTION 'User has already voted in this election';
    END IF;

    -- Insert the vote
    INSERT INTO public.votes (voter_id, election_id, candidate_id)
    VALUES (p_voter_id, p_election_id, p_candidate_id);

    RETURN true;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$; 