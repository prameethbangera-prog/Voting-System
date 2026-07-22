
// This file now re-exports all the refactored services
// for backward compatibility

import { storeVotingHistory, getVotingHistory, listCandidateVotingHistory, listAllVotingHistory } from "./storage/supabaseStorageService";
import { getUserVotingHistory, getAllVotes } from "./vote/voteService";
import { ElectionServiceDB, electionServiceDB } from "./election/ElectionServiceDB";
import { voteServiceDB } from "./vote/VoteServiceDB";

// Re-export all the functions and classes
export {
  storeVotingHistory,
  getVotingHistory,
  listCandidateVotingHistory,
  listAllVotingHistory,
  getUserVotingHistory,
  getAllVotes
};

// Export the service instance
export const electionService = electionServiceDB;
