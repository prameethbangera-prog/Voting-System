
import { supabase } from "@/integrations/supabase/client";
import { VoteTransaction } from "../VotingContract";
import { storeVotingHistory } from "../storage/supabaseStorageService";

class VotingService {
  private transactions: VoteTransaction[] = [];
  private hasVoted: Record<string, Set<string>> = {}; // userId -> set of electionIds (changed to strings for UUIDs)
  
  /**
   * Cast a vote in a specific election
   */
  public async castVote(userId: string, electionId: string, candidateId: string): Promise<VoteTransaction> {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Convert any IDs to strings to ensure consistent comparison with UUIDs
          const strElectionId = String(electionId);
          const strCandidateId = String(candidateId);
          
          console.log(`Casting vote: User ${userId}, Election ${strElectionId}, Candidate ${strCandidateId}`);
          
          // Find the election
          const { data: electionData, error: electionError } = await supabase
            .from('elections')
            .select('id, title, is_active')
            .eq('id', strElectionId)
            .maybeSingle();
          
          if (electionError) {
            console.error('Error fetching election:', electionError);
            reject(new Error("Failed to fetch election data"));
            return;
          }
          
          if (!electionData) {
            console.error('Election not found:', strElectionId);
            reject(new Error("Election not found"));
            return;
          }
          
          if (!electionData.is_active) {
            console.error('Election is not active:', strElectionId);
            reject(new Error("Election is not active"));
            return;
          }
          
          // Find the candidate
          const { data: candidateData, error: candidateError } = await supabase
            .from('candidates')
            .select('id, name, party')
            .eq('id', strCandidateId)
            .eq('election_id', strElectionId)
            .maybeSingle();
          
          if (candidateError) {
            console.error('Error fetching candidate:', candidateError);
            reject(new Error("Failed to fetch candidate data"));
            return;
          }
          
          if (!candidateData) {
            console.error('Candidate not found:', strCandidateId, 'for election:', strElectionId);
            reject(new Error("Candidate not found"));
            return;
          }
          
          // Check if user has already voted in this election
          if (!this.hasVoted[userId]) {
            this.hasVoted[userId] = new Set();
          }
          
          if (this.hasVoted[userId].has(strElectionId)) {
            reject(new Error("You have already cast your vote in this election"));
            return;
          }
          
          // Check if user has already voted in the database
          const { count, error: voteCheckError } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('voter_id', userId)
            .eq('election_id', strElectionId);
            
          if (voteCheckError) {
            console.error('Error checking previous votes:', voteCheckError);
            reject(new Error("Failed to verify voting status"));
            return;
          }
          
          if (count && count > 0) {
            reject(new Error("You have already cast your vote in this election"));
            return;
          }
          
          // Record the vote in memory
          this.hasVoted[userId].add(strElectionId);
          
          // Create transaction record
          const transactionHash = `tx-${Math.random().toString(16).substring(2, 42)}`;
          const transaction: VoteTransaction = {
            transactionHash,
            blockNumber: Math.floor(Math.random() * 1000000),
            timestamp: new Date(),
            voter: userId,
            electionId: strElectionId,
            candidateId: strCandidateId
          };
          
          this.transactions.push(transaction);
          
          // Store voting history in Supabase
          try {
            // Store vote in database
            await supabase.from('votes').insert({
              voter_id: userId,
              election_id: strElectionId,
              candidate_id: strCandidateId,
              transaction_hash: transaction.transactionHash
            });

            // Store voting history in Supabase storage
            const votingHistoryData = {
              election: {
                id: strElectionId,
                title: electionData.title
              },
              candidate: {
                id: strCandidateId,
                name: candidateData.name,
                party: candidateData.party || 'Independent',
              },
              timestamp: new Date().toISOString(),
              transaction: {
                hash: transaction.transactionHash,
                blockNumber: transaction.blockNumber
              },
              voter: {
                id: userId
              }
            };
            
            // Store the voting history asynchronously (don't await)
            // Note: Storage is optional - failures won't block voting
            storeVotingHistory(strCandidateId, strElectionId, votingHistoryData)
              .then(() => console.log('Voting history stored successfully'))
              .catch(err => console.warn('Failed to store voting history (non-critical):', err));
          } catch (error) {
            console.error('Error storing vote or voting history:', error);
            // Don't reject the promise, just log the error as this is a non-critical operation
          }
          
          resolve(transaction);
        } catch (error) {
          console.error('Error in castVote:', error);
          reject(error);
        }
      }, 1000); // Shorter delay to simulate faster blockchain confirmation
    });
  }
  
  /**
   * Get all vote transactions
   */
  public async getVoteTransactions(): Promise<VoteTransaction[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.transactions), 300);
    });
  }
}

export default VotingService;
