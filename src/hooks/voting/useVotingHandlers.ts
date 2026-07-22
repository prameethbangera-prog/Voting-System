import VotingContract from '@/utils/VotingContract';
import { Election, Candidate } from '@/utils/VotingContract';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { voteServiceDB } from '@/utils/vote/VoteServiceDB';

/**
 * Hook that provides voting-related action handlers
 */
export const useVotingHandlers = (state: ReturnType<typeof import('./useVotingState').useVotingState>) => {
  const {
    user,
    setStep,
    setIsLoading,
    selectedElection,
    selectedCandidate,
    setSelectedElection,
    setSelectedCandidate,
    setTransactionHash,
    isBiometricsRegistered
  } = state;
  
  const handleFaceVerificationSuccess = () => {
    toast({
      title: "Face Verification Successful",
      description: "Your identity has been verified.",
    });
    setStep(3); // Move to palm verification step
  };
  
  const handleFaceVerificationError = () => {
    toast({
      title: "Face Verification Failed",
      description: "We couldn't verify your identity. Please try again.",
      variant: "destructive",
    });
    setStep(1); // Reset to step 1
  };
  
  const handlePalmVerificationSuccess = () => {
    toast({
      title: "Palm Verification Successful",
      description: "Your identity has been verified.",
    });
    setStep(4); // Move to OTP verification step
  };
  
  const handlePalmVerificationError = () => {
    toast({
      title: "Palm Verification Failed", 
      description: "We couldn't verify your palm. Please try again.",
      variant: "destructive",
    });
    setStep(2); // Reset to face verification
  };
  
  const handleOTPVerificationSuccess = () => {
    toast({
      title: "OTP Verification Successful",
      description: "You can now access the voting system.",
    });
    setStep(5); // Move to election selection
  };
  
  const handleOTPVerificationError = () => {
    toast({
      title: "OTP Verification Failed",
      description: "The OTP you entered is incorrect. Please try again.",
      variant: "destructive",
    });
  };
  
  const handleSelectElection = (election: Election) => {
    setSelectedElection(election);
    setStep(6); // Move to candidate selection
  };
  
  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };
  
  const handleCastVote = async () => {
    if (!selectedElection || !selectedCandidate || !user) {
      toast({
        title: "Error",
        description: "Missing required information. Please select an election and candidate.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if biometrics are registered
    if (!isBiometricsRegistered) {
      toast({
        title: "Registration Required",
        description: "You must register your biometrics before voting. Please complete the registration process.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Log data being sent
      console.log('Casting vote with data:', {
        electionId: selectedElection.id,
        candidateId: selectedCandidate.id,
        userId: user.id
      });
      
      // First, check if the user has already voted in this election
      const { data: existingVotes, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('election_id', String(selectedElection.id))
        .eq('voter_id', String(user.id))
        .limit(1);
        
      if (checkError) {
        console.error('Error checking existing votes:', checkError);
        toast({
          title: "Error",
          description: "Could not verify your voting status. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (existingVotes && existingVotes.length > 0) {
        toast({
          title: "Already Voted",
          description: "You have already cast a vote in this election.",
        });
        return;
      }
          
      // Cast vote in blockchain (simulation)
      // Converting all IDs to strings to ensure consistency
      const mockBlockchainResponse = await VotingContract.getInstance().castVote(
        String(user.id),
        String(selectedElection.id),
        String(selectedCandidate.id)
      );
      
      console.log('Mock blockchain response:', mockBlockchainResponse);
      
      // Store the transaction hash for the confirmation screen
      setTransactionHash(mockBlockchainResponse.transactionHash);
      
      // Now record vote in database - Ensure all IDs are passed as strings
      const dbResult = await voteServiceDB.recordVote({
        electionId: String(selectedElection.id),
        candidateId: String(selectedCandidate.id),
        voterId: String(user.id),
        transactionHash: mockBlockchainResponse.transactionHash
      });
      
      console.log('Database vote record result:', dbResult);
      
      if (dbResult.error) {
        throw new Error(`Failed to record vote in database: ${dbResult.error.message}`);
      }
      
      // Update the selectedCandidate to include the new vote
      setSelectedCandidate({
        ...selectedCandidate,
        voteCount: (selectedCandidate.voteCount || 0) + 1
      });
      
      // Move to confirmation step
      setStep(7);
      
      toast({
        title: "Vote Cast Successfully",
        description: "Your vote has been recorded securely.",
      });
      
    } catch (error) {
      console.error('Error casting vote:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cast your vote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    handleFaceVerificationSuccess,
    handleFaceVerificationError,
    handlePalmVerificationSuccess,
    handlePalmVerificationError,
    handleOTPVerificationSuccess,
    handleOTPVerificationError,
    handleSelectElection,
    handleSelectCandidate,
    handleCastVote
  };
};
