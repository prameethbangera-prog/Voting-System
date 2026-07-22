
import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Vote, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

interface VotingInformationCardProps {
  isEditing: boolean;
  editedName: string;
  setEditedName: (name: string) => void;
  editedEmail: string;
  hasVoted: boolean;
  votingDetails: {
    electionName?: string;
    candidateName?: string;
    timestamp?: string;
    transactionHash?: string;
  } | null;
}

const VotingInformationCard = ({
  isEditing,
  editedName,
  setEditedName,
  editedEmail,
  hasVoted,
  votingDetails
}: VotingInformationCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };

  const handleVoteNow = () => {
    navigate('/vote');
  };

  return (
    <>
      <CardHeader>
        <CardTitle>User Information</CardTitle>
        <CardDescription>Your personal and voting information</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={editedEmail} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Full Name
                </Label>
                <p className="font-medium">{editedName || 'Not set'}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="font-medium">{editedEmail || 'Not available'}</p>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-sm font-medium">
                  Voting Status
                  <div className="h-[0.5px] w-full bg-gray-200 my-2"></div>
                </Label>
                
                {hasVoted ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">You have voted</span>
                    </div>
                    
                    <Alert className="bg-green-50 text-green-700 border-green-200">
                      <AlertDescription>
                        <div className="space-y-2">
                          <div>
                            <span className="font-medium">Election:</span>{' '}
                            {votingDetails?.electionName || 'Unknown election'}
                          </div>
                          <div>
                            <span className="font-medium">Voted for:</span>{' '}
                            {votingDetails?.candidateName || 'Unknown candidate'}
                          </div>
                          <div>
                            <span className="font-medium">When:</span>{' '}
                            {formatDate(votingDetails?.timestamp)}
                          </div>
                          {votingDetails?.transactionHash && (
                            <div className="pt-1">
                              <span className="font-medium">Transaction:</span>{' '}
                              <span className="font-mono text-xs bg-green-100 p-1 rounded">
                                {votingDetails.transactionHash.substring(0, 10)}...
                              </span>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">You have not voted yet</span>
                    </div>
                    
                    <Button 
                      onClick={handleVoteNow} 
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <Vote className="h-4 w-4" />
                      Vote Now
                    </Button>
                    
                    <p className="text-sm text-muted-foreground">
                      Exercise your democratic right by casting your vote in the current election.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </>
  );
};

export default VotingInformationCard;
