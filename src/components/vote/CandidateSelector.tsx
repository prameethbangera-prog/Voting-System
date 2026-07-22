
import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Election, Candidate } from '@/utils/VotingContract';
import { supabase } from '@/integrations/supabase/client';

interface CandidateSelectorProps {
  election: Election;
  selectedCandidate: Candidate | null;
  onSelectCandidate: (candidate: Candidate) => void;
  onVote: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const CandidateSelector = ({
  election,
  selectedCandidate,
  onSelectCandidate,
  onVote,
  onBack,
  isLoading
}: CandidateSelectorProps) => {
  const [candidatesWithVotes, setCandidatesWithVotes] = useState<Candidate[]>(election.candidates);
  const [loadingVotes, setLoadingVotes] = useState(true);

  // Fetch actual vote counts for candidates
  useEffect(() => {
    const fetchVoteCounts = async () => {
      try {
        setLoadingVotes(true);
        
        // For each candidate, get their vote count
        const updatedCandidates = await Promise.all(
          election.candidates.map(async (candidate) => {
            const strCandidateId = String(candidate.id);
            
            // Get vote count from database
            const { count, error } = await supabase
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('candidate_id', strCandidateId);
              
            if (error) {
              console.error(`Error fetching votes for candidate ${strCandidateId}:`, error);
              return candidate; // Return original candidate if there's an error
            }
            
            // Return candidate with updated vote count
            return {
              ...candidate,
              voteCount: count || 0
            };
          })
        );
        
        setCandidatesWithVotes(updatedCandidates);
      } catch (error) {
        console.error('Error fetching vote counts:', error);
      } finally {
        setLoadingVotes(false);
      }
    };
    
    fetchVoteCounts();
    
    // Set up real-time listener for vote updates
    const channel = supabase.channel(`election-votes-${election.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'votes',
          filter: `election_id=eq.${election.id}`
        }, 
        (payload) => {
          console.log('Vote change detected:', payload);
          // Refresh vote counts when a new vote is cast
          fetchVoteCounts();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [election]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>{election.title}</CardTitle>
            <CardDescription className="mt-1">Select a candidate to cast your vote</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onBack}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to elections
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {candidatesWithVotes.map((candidate) => (
            <div
              key={String(candidate.id)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedCandidate?.id === candidate.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelectCandidate(candidate)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{candidate.name}</h3>
                  <p className="text-sm text-muted-foreground">{candidate.party}</p>
                </div>
                {selectedCandidate?.id === candidate.id && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
              
              <Separator className="my-3" />
              
              <div className="text-xs text-muted-foreground">
                {loadingVotes ? (
                  <span className="flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" /> Loading votes...
                  </span>
                ) : (
                  <span>Current votes: {candidate.voteCount}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onVote} 
          disabled={!selectedCandidate || isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
            </>
          ) : (
            'Cast Vote'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CandidateSelector;
