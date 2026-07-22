
import { supabase } from '@/integrations/supabase/client';

interface VoteRecord {
  electionId: string;
  candidateId: string;
  voterId: string;
  transactionHash: string;
}

interface VoteResult {
  success: boolean;
  error?: {
    message: string;
    details?: any;
  };
}

class VoteServiceDB {
  /**
   * Records a vote in the database
   * @param voteData The vote data to record
   * @returns A promise that resolves to the result of the operation
   */
  async recordVote(voteData: VoteRecord): Promise<VoteResult> {
    try {
      console.log('Recording vote in database with data:', voteData);
      
      // Validate input data
      if (!voteData.electionId || !voteData.candidateId || !voteData.voterId) {
        console.error('Invalid vote data - missing required fields:', voteData);
        return {
          success: false,
          error: {
            message: 'Missing required fields in vote data',
            details: { missingFields: this.getMissingFields(voteData) }
          }
        };
      }
      
      // First verify that the election exists
      const { data: electionData, error: electionError } = await supabase
        .from('elections')
        .select('id, title')
        .eq('id', voteData.electionId)
        .maybeSingle();
        
      if (electionError) {
        console.error('Error verifying election:', electionError);
        return {
          success: false,
          error: {
            message: 'Error verifying election',
            details: electionError
          }
        };
      }
      
      if (!electionData) {
        console.error('Election not found:', voteData.electionId);
        return {
          success: false,
          error: {
            message: `Election with ID ${voteData.electionId} not found`
          }
        };
      }
      
      // Verify that the candidate exists for this election
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id, name')
        .eq('id', voteData.candidateId)
        .eq('election_id', voteData.electionId)
        .maybeSingle();
        
      if (candidateError) {
        console.error('Error verifying candidate:', candidateError);
        return {
          success: false,
          error: {
            message: 'Error verifying candidate',
            details: candidateError
          }
        };
      }
      
      if (!candidateData) {
        console.error('Candidate not found:', voteData.candidateId, 'for election:', voteData.electionId);
        return {
          success: false,
          error: {
            message: `Candidate with ID ${voteData.candidateId} not found for election ${voteData.electionId}`
          }
        };
      }
      
      // Note: The duplicate vote check is handled in the handler (useVotingHandlers.ts)
      // to avoid race conditions. The database has unique constraints to prevent duplicates.
      
      // Insert the vote record
      console.log('Inserting vote record:', {
        election_id: voteData.electionId,
        candidate_id: voteData.candidateId,
        voter_id: voteData.voterId,
        transaction_hash: voteData.transactionHash
      });
      
      const { data: voteResponse, error: voteError } = await supabase
        .from('votes')
        .insert({
          election_id: voteData.electionId,
          candidate_id: voteData.candidateId,
          voter_id: voteData.voterId,
          transaction_hash: voteData.transactionHash
        })
        .select();
      
      if (voteError) {
        console.error('Error recording vote:', voteError);
        
        // Check if this is a unique constraint violation (duplicate vote)
        // This can happen in edge cases with real-time subscriptions or race conditions
        // If the vote already exists in the database, treat it as a success
        if (voteError.code === '23505' || voteError.message?.includes('duplicate')) {
          console.warn('Vote already exists in database - treating as successful:', voteError);
          return {
            success: true,
            error: undefined
          };
        }
        
        return {
          success: false,
          error: {
            message: 'Error recording vote in database',
            details: voteError
          }
        };
      }
      
      console.log('Vote successfully recorded:', voteResponse);
      
      // Update vote_results view/table (if needed)
      // In a real application, this would typically be handled by database triggers
      
      return { success: true };
    } catch (error) {
      console.error('Unexpected error in recordVote:', error);
      return {
        success: false,
        error: {
          message: 'Unexpected error recording vote',
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }
  
  /**
   * Gets the missing required fields from vote data
   * @param voteData The vote data to check
   * @returns An array of missing field names
   */
  private getMissingFields(voteData: Partial<VoteRecord>): string[] {
    const missingFields: string[] = [];
    
    if (!voteData.electionId) missingFields.push('electionId');
    if (!voteData.candidateId) missingFields.push('candidateId');
    if (!voteData.voterId) missingFields.push('voterId');
    
    return missingFields;
  }
}

// Export a singleton instance
export const voteServiceDB = new VoteServiceDB();
