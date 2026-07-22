
import React from 'react';
import { ChevronRight, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface VoteWelcomeProps {
  onNext: () => void;
}

const VoteWelcome = ({ onNext }: VoteWelcomeProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Secure Voting</CardTitle>
        <CardDescription>
          To ensure the integrity of the voting process, we need to verify your identity.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <ShieldCheck className="w-16 h-16 text-primary mb-4" />
        <p className="text-center mb-4">
          Our system uses multi-factor authentication including facial recognition
          and one-time password verification.
        </p>
        <div className="flex flex-col gap-2 text-sm w-full max-w-md">
          <div className="flex items-start gap-2">
            <div className="bg-primary/10 rounded-full p-1">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span>Secure blockchain-based voting system</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary/10 rounded-full p-1">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span>Your vote is anonymous and tamper-proof</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="bg-primary/10 rounded-full p-1">
              <Check className="w-3 h-3 text-primary" />
            </div>
            <span>Results are cryptographically verifiable</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext} className="w-full">
          Begin Identity Verification
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VoteWelcome;
