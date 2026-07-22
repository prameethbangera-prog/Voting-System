
import React from 'react';
import { Loader2, AlertCircle, ThumbsUp } from 'lucide-react';

interface VerificationStatusProps {
  isVerifying: boolean;
  status: 'idle' | 'success' | 'error';
}

const VerificationStatus: React.FC<VerificationStatusProps> = ({ isVerifying, status }) => {
  if (!isVerifying) return null;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
      {status === 'idle' && (
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      )}
      {status === 'success' && (
        <ThumbsUp className="h-10 w-10 text-green-500" />
      )}
      {status === 'error' && (
        <AlertCircle className="h-10 w-10 text-destructive" />
      )}
    </div>
  );
};

export default VerificationStatus;
