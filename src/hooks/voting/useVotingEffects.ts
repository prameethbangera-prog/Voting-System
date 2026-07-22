
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Election } from '@/utils/VotingContract';

/**
 * Hook that handles side effects for the voting process
 */
export const useVotingEffects = (state: ReturnType<typeof import('./useVotingState').useVotingState>) => {
  const {
    user,
    setElections,
    setIsLoading,
    setIsBiometricsRegistered,
    setIsCheckingEligibility
  } = state;

  // Check if user is eligible to vote (has biometric registration)
  useEffect(() => {
    const checkVoterEligibility = async () => {
      if (!user) return;
      
      try {
        setIsCheckingEligibility(true);
        
        // Check if user has registered biometrics in the database
        const { data, error } = await supabase
          .from('user_biometrics')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking biometric registration:', error);
          return;
        }
        
        // If we found a record, the user has registered their biometrics
        setIsBiometricsRegistered(!!data);
        
        console.log('Biometrics registration status:', !!data);
      } catch (error) {
        console.error('Error checking voter eligibility:', error);
      } finally {
        setIsCheckingEligibility(false);
      }
    };
    
    checkVoterEligibility();
  }, [user, setIsBiometricsRegistered, setIsCheckingEligibility]);
  
  // Fetch elections from the database
  useEffect(() => {
    const fetchElections = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        console.log('Fetching elections from database...');
        
        // Fetch active elections from the database
        const { data: electionData, error: electionError } = await supabase
          .from('elections')
          .select(`
            id, 
            title, 
            description, 
            start_date, 
            end_date, 
            is_active
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (electionError) {
          console.error('Error fetching elections:', electionError);
          toast({
            title: "Error",
            description: "Failed to load elections. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('Fetched elections:', electionData);
        
        if (!electionData || electionData.length === 0) {
          console.log('No active elections found');
          setElections([]);
          return;
        }
        
        // For each election, fetch its candidates
        const electionsWithCandidates = await Promise.all(
          electionData.map(async (election) => {
            // Fetch candidates for this election
            const { data: candidatesData, error: candidatesError } = await supabase
              .from('candidates')
              .select('id, name, party, photo_url')
              .eq('election_id', election.id);
              
            if (candidatesError) {
              console.error(`Error fetching candidates for election ${election.id}:`, candidatesError);
              return null;
            }
            
            // Map the database election to our application Election type
            return {
              id: election.id,
              title: election.title,
              description: election.description || '',
              startDate: new Date(election.start_date),
              endDate: new Date(election.end_date),
              isActive: election.is_active,
              candidates: candidatesData.map(candidate => ({
                id: candidate.id,
                name: candidate.name,
                party: candidate.party || 'Independent',
                voteCount: 0 // We'll update this later if needed
              }))
            };
          })
        );
        
        // Filter out any null values from elections that failed to load candidates
        const validElections = electionsWithCandidates.filter(election => election !== null) as Election[];
        
        console.log('Elections with candidates:', validElections);
        setElections(validElections);
        
      } catch (error) {
        console.error('Error in fetchElections:', error);
        toast({
          title: "Error",
          description: "Failed to load election data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchElections();
  }, [user, setElections, setIsLoading]);
};
