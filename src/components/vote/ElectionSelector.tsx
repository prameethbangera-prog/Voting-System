
import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Election } from '@/utils/VotingContract';

interface ElectionSelectorProps {
  elections: Election[];
  isLoading: boolean;
  onSelectElection: (election: Election) => void;
}

const ElectionSelector = ({ 
  elections, 
  isLoading, 
  onSelectElection 
}: ElectionSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select an Election</CardTitle>
        <CardDescription>
          Choose an election to cast your vote.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 mb-4"></div>
              <div className="h-4 w-48 bg-primary/20 rounded mb-2"></div>
              <div className="h-3 w-32 bg-primary/10 rounded"></div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {elections.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-2" />
                <p className="text-lg font-medium">No Active Elections</p>
                <p className="text-sm text-muted-foreground">
                  There are no active elections available at this time.
                </p>
              </div>
            ) : (
              elections.map((election) => (
                <Card 
                  key={election.id} 
                  className="hover:border-primary/50 cursor-pointer transition-colors" 
                  onClick={() => onSelectElection(election)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{election.title}</CardTitle>
                    <CardDescription className="text-xs">
                      {new Date(election.endDate).toLocaleDateString()} - {election.candidates.length} candidates
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-3">
                    <p className="text-sm">{election.description}</p>
                  </CardContent>
                  <CardFooter className="pt-0 border-t flex justify-between items-center text-xs text-muted-foreground">
                    <span>
                      {election.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                      Select <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ElectionSelector;
