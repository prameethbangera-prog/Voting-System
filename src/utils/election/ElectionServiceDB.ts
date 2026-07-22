
import { supabase } from "@/integrations/supabase/client";
import { Election, Candidate, VoteStatistics } from "@/VotingContract";

export class ElectionServiceDB {
  private getVoteCount(votes: any[], candidateId: string): number {
    return votes.filter(vote => vote.candidate_id === String(candidateId)).length;
  }

  private async getElection(electionId: string): Promise<Election | null> {
    try {
      const { data, error } = await supabase
        .from('elections')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          is_active,
          candidates (
            id,
            name,
            party
          ),
          votes (
            candidate_id
          )
        `)
        .eq('id', String(electionId))
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        description: data.description,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        isActive: data.is_active,
        candidates: data.candidates.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          voteCount: this.getVoteCount(data.votes, candidate.id)
        }))
      };
    } catch (error) {
      console.error('Error fetching election:', error);
      return null;
    }
  }

  /**
   * Get all elections with real-time vote counts
   */
  public async getElections(): Promise<Election[]> {
    try {
      // Fetch elections from Supabase
      const { data: elections, error } = await supabase
        .from('elections')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          is_active,
          candidates (
            id,
            name,
            party
          ),
          votes (
            candidate_id
          )
        `);

      if (error) throw error;

      return elections.map((election: any) => ({
        id: election.id,
        title: election.title,
        description: election.description,
        startDate: new Date(election.start_date),
        endDate: new Date(election.end_date),
        isActive: election.is_active,
        candidates: election.candidates.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.name,
          party: candidate.party,
          voteCount: this.getVoteCount(election.votes, candidate.id)
        }))
      }));
    } catch (error) {
      console.error('Error fetching elections:', error);
      return [];
    }
  }

  /**
   * Get vote statistics
   */
  public async getVoteStatistics(electionId: string): Promise<VoteStatistics | null> {
    try {
      const { data, error } = await supabase
        .from('vote_results')
        .select('*')
        .eq('election_id', String(electionId))
        .single();

      if (error) throw error;

      return {
        totalVotes: data.vote_count,
        voterTurnout: data.vote_count, // You might want to calculate this based on total registered voters
        candidateStats: {
          name: data.candidate_name,
          party: data.party,
          votes: data.vote_count
        }
      };
    } catch (error) {
      console.error('Error fetching vote statistics:', error);
      return null;
    }
  }
}

export const electionServiceDB = new ElectionServiceDB();
