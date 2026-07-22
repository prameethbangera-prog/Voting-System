
import { useState } from 'react';
import { Election, Candidate } from '@/utils/VotingContract';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook that manages the voting state
 */
export const useVotingState = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [isBiometricsRegistered, setIsBiometricsRegistered] = useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  return {
    user,
    step,
    setStep,
    isLoading, 
    setIsLoading,
    elections,
    setElections,
    selectedElection,
    setSelectedElection,
    selectedCandidate,
    setSelectedCandidate,
    transactionHash,
    setTransactionHash,
    isBiometricsRegistered,
    setIsBiometricsRegistered,
    isCheckingEligibility,
    setIsCheckingEligibility,
    voteCounts,
    setVoteCounts
  };
};
