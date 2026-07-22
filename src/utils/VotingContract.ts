
import { supabase } from "@/integrations/supabase/client";
import { storeVotingHistory } from "./supabaseStorage";
import ElectionService from "./voting/ElectionService";
import VotingService from "./voting/VotingService";

export interface Candidate {
  id: string;
  name: string;
  party: string;
  voteCount: number;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  candidates: Candidate[];
  isActive: boolean;
}

export interface VoteTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
  voter: string;
  electionId: string;
  candidateId: string;
}

// Main class that integrates all voting functionality
class VotingContract {
  private static instance: VotingContract;
  private electionService: ElectionService;
  private votingService: VotingService;
  
  private constructor() {
    this.electionService = new ElectionService();
    this.votingService = new VotingService();
  }
  
  public static getInstance(): VotingContract {
    if (!VotingContract.instance) {
      VotingContract.instance = new VotingContract();
    }
    return VotingContract.instance;
  }
  
  // Delegate to ElectionService
  public async getElections(): Promise<Election[]> {
    return this.electionService.getElections();
  }
  
  public async getElection(id: string): Promise<Election | undefined> {
    return this.electionService.getElection(id);
  }
  
  // Delegate to VotingService
  public async castVote(userId: string, electionId: string, candidateId: string): Promise<VoteTransaction> {
    // Always use string IDs for consistency
    return this.votingService.castVote(userId, electionId, candidateId);
  }
  
  public async getVoteTransactions(): Promise<VoteTransaction[]> {
    return this.votingService.getVoteTransactions();
  }
  
  // Check if a user has voted in a specific election
  public async hasUserVoted(userId: string, electionId: string): Promise<boolean> {
    return this.electionService.hasUserVoted(userId, electionId);
  }
}

export default VotingContract;
