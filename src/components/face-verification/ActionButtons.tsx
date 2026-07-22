
import React from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';

interface ActionButtonsProps {
  isCapturing: boolean;
  isCaptured: boolean;
  cameraError: boolean;
  isVerifying: boolean;
  verificationStatus: 'idle' | 'success' | 'error';
  onStartCamera: () => void;
  onCaptureImage: () => void;
  onRetryCapture: () => void;
  onStopCamera: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isCapturing,
  isCaptured,
  cameraError,
  isVerifying,
  verificationStatus,
  onStartCamera,
  onCaptureImage,
  onRetryCapture,
  onStopCamera
}) => {
  return (
    <div className="flex gap-2">
      {!isCapturing && !cameraError && (
        <Button onClick={onStartCamera} className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Start Camera
        </Button>
      )}
      
      {cameraError && (
        <Button onClick={onStartCamera} className="w-full">
          <Camera className="mr-2 h-4 w-4" />
          Retry Camera Access
        </Button>
      )}
      
      {isCapturing && !isCaptured && (
        <Button onClick={onCaptureImage} className="w-full">
          Capture
        </Button>
      )}
      
      {isCaptured && verificationStatus === 'idle' && (
        <Button variant="outline" onClick={onRetryCapture} disabled={isVerifying}>
          Retake
        </Button>
      )}
      
      {isCapturing && (
        <Button variant="destructive" onClick={onStopCamera} disabled={isVerifying}>
          Cancel
        </Button>
      )}
    </div>
  );
};

export default ActionButtons;
