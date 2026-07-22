
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

export const useProfileData = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [votingDetails, setVotingDetails] = useState<{
    electionName?: string;
    candidateName?: string;
    timestamp?: string;
    transactionHash?: string;
  } | null>(null);
  
  // Fetch user profile data
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        return data as UserProfile;
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: "Error loading profile",
          description: "Could not load profile data. Please try again later.",
          variant: "destructive",
        });
        return null;
      }
    },
    enabled: !!user,
  });

  // Fetch user voting status and details - using the votes table with joined data
  const { data: voteData, isLoading: isLoadingVotes } = useQuery({
    queryKey: ['userVoteDetails', user?.id],
    queryFn: async () => {
      if (!user) return { hasVoted: false, details: null };
      
      try {
        // First check if user has voted
        const { data: voteResult, error: voteError } = await supabase
          .from('votes')
          .select(`
            id, 
            created_at, 
            transaction_hash, 
            election_id, 
            candidate_id, 
            elections!inner(title), 
            candidates!inner(name)
          `)
          .eq('voter_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (voteError) {
          if (voteError.code === 'PGRST116') {
            // No vote found
            return { hasVoted: false, details: null };
          }
          throw voteError;
        }
        
        // Format vote details
        const details = {
          electionName: voteResult.elections?.title,
          candidateName: voteResult.candidates?.name,
          timestamp: voteResult.created_at,
          transactionHash: voteResult.transaction_hash,
        };
        
        return { hasVoted: true, details };
      } catch (error) {
        console.error('Error fetching user votes:', error);
        return { hasVoted: false, details: null };
      }
    },
    enabled: !!user,
  });

  // Set hasVoted and votingDetails from the query result
  const hasVoted = voteData?.hasVoted || false;

  useEffect(() => {
    if (voteData?.details) {
      setVotingDetails(voteData.details);
    }
  }, [voteData]);

  useEffect(() => {
    if (profile) {
      setEditedName(profile.full_name || '');
      setEditedEmail(user?.email || '');
    }
  }, [profile, user]);

  return {
    profile,
    isLoadingProfile,
    hasVoted,
    votingDetails,
    isEditing,
    setIsEditing,
    isChangingPhoto, 
    setIsChangingPhoto,
    editedName,
    setEditedName,
    editedEmail
  };
};
