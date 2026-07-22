
export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  party: string;
  voteCount: number;
}

export interface Vote {
  id: string;
  voterId: string;
  electionId: string;
  candidateId: string;
  transactionHash: string;
  createdAt: Date;
}

export interface VoteStatistics {
  totalVotes: number;
  voterTurnout: number;
  candidateStats: {
    name: string;
    party: string;
    votes: number;
  };
}
