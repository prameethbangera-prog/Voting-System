
import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle, Vote } from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';
import ProfileSummaryCard from '@/components/profile/ProfileSummaryCard';
import VotingInformationCard from '@/components/profile/VotingInformationCard';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const {
    profile,
    isLoadingProfile,
    hasVoted,
    isEditing,
    setIsEditing,
    isChangingPhoto,
    setIsChangingPhoto,
    editedName,
    setEditedName,
    editedEmail,
    votingDetails
  } = useProfileData();
  
  const { user } = useAuth();
  const [isBiometricsRegistered, setIsBiometricsRegistered] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(false);
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [isLoadingVotes, setIsLoadingVotes] = useState(false);

  // Check biometrics registration status
  useEffect(() => {
    const checkBiometrics = async () => {
      if (!user?.id) return;
      
      try {
        setIsCheckingBiometrics(true);
        const { data, error } = await supabase
          .from('user_biometrics')
          .select('face_image_url')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setIsBiometricsRegistered(!!data?.face_image_url);
      } catch (error) {
        console.error('Error checking biometrics:', error);
      } finally {
        setIsCheckingBiometrics(false);
      }
    };
    
    checkBiometrics();
  }, [user]);
  
  // Fetch user voting history
  useEffect(() => {
    const fetchVotingHistory = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoadingVotes(true);
        
        // Get user's voting history
        const { data, error } = await supabase
          .from('votes')
          .select(`
            election_id,
            candidate_id,
            created_at,
            elections:election_id (title),
            candidates:candidate_id (name, party)
          `)
          .eq('voter_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setUserVotes(data || []);
      } catch (error) {
        console.error('Error fetching voting history:', error);
      } finally {
        setIsLoadingVotes(false);
      }
    };
    
    fetchVotingHistory();
  }, [user]);

  if (isLoadingProfile) {
    return (
      <Layout>
        <div className="container mx-auto py-6 flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Summary Card */}
          <Card className="md:col-span-1">
            <ProfileSummaryCard
              profile={profile}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              editedName={editedName}
              setEditedName={setEditedName}
              isChangingPhoto={isChangingPhoto}
              setIsChangingPhoto={setIsChangingPhoto}
            />
          </Card>

          {/* Voting Information */}
          <Card className="md:col-span-2">
            <VotingInformationCard
              isEditing={isEditing}
              editedName={editedName}
              setEditedName={setEditedName}
              editedEmail={editedEmail}
              hasVoted={hasVoted}
              votingDetails={votingDetails}
            />
          </Card>
        </div>
        
        {/* Biometrics Registration Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Biometric Security Status</CardTitle>
            <CardDescription>Status of your biometric registration for secure voting</CardDescription>
          </CardHeader>
          <CardContent>
            {isCheckingBiometrics ? (
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Checking biometrics status...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert variant={isBiometricsRegistered ? "default" : "destructive"} className={isBiometricsRegistered ? "bg-green-50 border-green-200" : ""}>
                  {isBiometricsRegistered ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>{isBiometricsRegistered ? "Biometrics Registered" : "Biometrics Not Registered"}</AlertTitle>
                  <AlertDescription>
                    {isBiometricsRegistered 
                      ? "Your biometrics are registered and ready for secure voting." 
                      : "You need to register your biometrics before you can vote securely."}
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Voting History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Vote className="mr-2 h-5 w-5" />
              Your Voting History
            </CardTitle>
            <CardDescription>Record of your past votes in elections</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingVotes ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userVotes.length > 0 ? (
              <div className="space-y-4">
                {userVotes.map((vote, index) => (
                  <div key={index} className="border rounded-md p-4 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{vote.elections?.title || "Unknown Election"}</h4>
                        <p className="text-sm text-muted-foreground">
                          You voted for: <span className="font-medium">{vote.candidates?.name || "Unknown Candidate"}</span>
                          {vote.candidates?.party && <span className="ml-1">({vote.candidates.party})</span>}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(vote.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-2 bg-green-50 text-green-700 rounded px-2 py-1 text-xs inline-flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vote Recorded Successfully
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertTitle>No Voting History</AlertTitle>
                <AlertDescription>You haven't voted in any elections yet.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
