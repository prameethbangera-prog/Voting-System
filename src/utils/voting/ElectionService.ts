
import { supabase } from "@/integrations/supabase/client";
import { Election, Candidate } from "../VotingContract";

class ElectionService {
  /**
   * Get all elections
   */
  public async getElections(): Promise<Election[]> {
    try {
      // Fetch real elections from the database
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
        .eq('is_active', true);
      
      if (electionError) {
        console.error('Error fetching elections:', electionError);
        return this.elections; // Fall back to mock data
      }
      
      if (!electionData || electionData.length === 0) {
        return this.elections; // Fall back to mock data if no elections found
      }
      
      // Map database elections to our application format
      const mappedElections: Election[] = await Promise.all(
        electionData.map(async (election) => {
          // Fetch candidates for this election
          const { data: candidatesData, error: candidatesError } = await supabase
            .from('candidates')
            .select('id, name, party')
            .eq('election_id', election.id);
            
          if (candidatesError) {
            console.error(`Error fetching candidates for election ${election.id}:`, candidatesError);
            return null;
          }
          
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
              voteCount: 0 // We'll update this later
            }))
          };
        })
      );
      
      const validElections = mappedElections.filter(election => election !== null);
      return validElections.length > 0 ? validElections : this.elections;
    } catch (error) {
      console.error('Error in getElections:', error);
      return this.elections; // Fall back to mock data
    }
  }
  
  /**
   * Get a specific election by ID
   */
  public async getElection(id: string): Promise<Election | undefined> {
    try {
      const strId = String(id);
      
      // Try to fetch the election from the database
      const { data: election, error } = await supabase
        .from('elections')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          is_active
        `)
        .eq('id', strId)
        .maybeSingle();
      
      if (error) {
        console.error(`Error fetching election ${strId}:`, error);
        // Fall back to mock data
        return this.elections.find(e => String(e.id) === strId);
      }
      
      if (!election) {
        console.error('Election not found:', strId);
        return undefined;
      }
      
      // Fetch candidates for this election
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('id, name, party')
        .eq('election_id', strId);
        
      if (candidatesError) {
        console.error(`Error fetching candidates for election ${strId}:`, candidatesError);
        return undefined;
      }
      
      // Get vote counts for each candidate
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('candidate_id')
        .eq('election_id', strId);
        
      if (votesError) {
        console.error(`Error fetching votes for election ${strId}:`, votesError);
      }
      
      // Count votes per candidate
      const voteCounts: Record<string, number> = {};
      if (votes && votes.length > 0) {
        votes.forEach(vote => {
          const candidateId = vote.candidate_id;
          voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
        });
      }
      
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
          voteCount: voteCounts[candidate.id] || 0
        }))
      };
    } catch (error) {
      console.error('Error in getElection:', error);
      // Fall back to mock data
      return this.elections.find(e => String(e.id) === String(id));
    }
  }
  
  /**
   * Check if a user has voted in a specific election
   */
  public async hasUserVoted(userId: string, electionId: string): Promise<boolean> {
    try {
      // Ensure electionId is a string for database query
      const strElectionId = String(electionId);
      
      console.log(`Checking if user ${userId} has voted in election ${strElectionId}`);
      
      // Check in Supabase if the user has voted
      const { count, error } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('voter_id', userId)
        .eq('election_id', strElectionId);
      
      if (error) {
        console.error('Error checking vote status:', error);
        // Fall back to local check if database query fails
        return this.hasVoted[userId]?.has(strElectionId) || false;
      }
      
      console.log(`Vote count for user ${userId} in election ${strElectionId}: ${count}`);
      return count !== null && count > 0;
    } catch (error) {
      console.error('Error checking user vote status:', error);
      // Fall back to local check
      return this.hasVoted[userId]?.has(String(electionId)) || false;
    }
  }

  // Mock data storage - will be used as fallback if database queries fail
  private elections: Election[] = [
    {
      id: "1",
      title: "Student Body President Election",
      description: "Vote for your student body president for the 2025-2026 academic year",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      candidates: [
        { id: "1", name: "Candidate 1", party: "Party 1", voteCount: 10},
        { id: "2", name: "Candidate 2", party: "Party 2", voteCount: 20},
        { id: "3", name: "Candidate 3", party: "Party 3", voteCount: 30}
      ],
      isActive: true
    },
    {
      id: "2",
      title: "Department Representative Election",
      description: "Select your department representative for the academic council",
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      candidates: [
        { id: "1", name: "Candidate 1", party: "Party 1", voteCount: 30 },
        { id: "2", name: "Candidate 2", party: "Party 2", voteCount: 40}
      ],
      isActive: true
    }
  ];
  
  private hasVoted: Record<string, Set<string>> = {}; // userId -> set of electionIds (changed to strings for UUIDs)
}

export default ElectionService;
