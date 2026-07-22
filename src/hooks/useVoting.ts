
import { useVotingState } from './voting/useVotingState';
import { useVotingEffects } from './voting/useVotingEffects';
import { useVotingHandlers } from './voting/useVotingHandlers';

/**
 * Main voting hook that composes state, effects, and handlers
 */
export const useVoting = () => {
  // Initialize voting state
  const state = useVotingState();
  
  // Set up voting effects
  useVotingEffects(state);
  
  // Get voting handlers
  const handlers = useVotingHandlers(state);
  
  // Return combined state and handlers
  return {
    ...state,
    ...handlers
  };
};
