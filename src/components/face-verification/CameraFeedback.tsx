
import React from 'react';
import { User, CameraOff } from 'lucide-react';

interface CameraFeedbackProps {
  cameraError: boolean;
}

const CameraFeedback: React.FC<CameraFeedbackProps> = ({ cameraError }) => {
  return (
    <div className="flex h-64 items-center justify-center bg-muted">
      {cameraError ? (
        <div className="text-center p-4">
          <CameraOff className="h-16 w-16 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">Camera access denied</p>
          <p className="text-xs mt-2">Please check your browser permissions and try again</p>
        </div>
      ) : (
        <div className="text-center">
          <User className="h-16 w-16 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground/60">Initializing camera...</p>
        </div>
      )}
    </div>
  );
};

export default CameraFeedback;
