
import React, { useRef, useEffect, useState } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { useFaceVerification } from '@/hooks/useFaceVerification';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, CheckCircle2, XCircle, Loader2, RotateCcw, UserPlus, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FaceRecognitionProps {
  onVerified: () => void;
  onError?: () => void;
  className?: string;
  isRegistrationMode?: boolean;
}

const FaceRecognition = ({ onVerified, onError, className, isRegistrationMode = false }: FaceRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceLandmarks, setFaceLandmarks] = useState<string[]>([]);
  const [registrationModeState, setRegistrationModeState] = useState(isRegistrationMode);
  const [isScanning, setIsScanning] = useState(false);

  const { 
    isCaptured, 
    isVerifying, 
    verificationStatus, 
    captureImage, 
    retryCapture,
    hasReferenceImage,
    isRegistering,
    isLivenessChecking,
    currentGesture,
    processLivenessGesture
  } = useFaceVerification({ 
    onVerified,
    onError,
    isRegistrationMode: registrationModeState
  });

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    const initializeCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
            toast({
              title: "Camera Ready",
              description: "Your camera is now ready for facial verification.",
            });
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Could not access camera. Please ensure you have granted camera permissions.');
        if (onError) onError();
      }
    };

    initializeCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  // Simulate face detection with landmarks
  const simulateFaceDetection = () => {
    if (!isCameraReady || !videoRef.current) return;
    
    setIsScanning(true);
    
    // Simulate finding facial landmarks
    setTimeout(() => {
      setFaceLandmarks(['eyes', 'nose', 'mouth', 'jawline']);
      setIsScanning(false);
      
      toast({
        title: "Face Detected",
        description: "Your face is now properly positioned. You can proceed with verification.",
      });
    }, 1500);
  };

  // Run simulated face detection when camera is ready
  useEffect(() => {
    if (isCameraReady && !isCaptured) {
      const interval = setInterval(simulateFaceDetection, 3000);
      return () => clearInterval(interval);
    }
  }, [isCameraReady, isCaptured]);

  const handleCapture = () => {
    if (registrationModeState) {
      captureImage(videoRef, canvasRef);
      return;
    }

    if (!hasReferenceImage) {
      setError('You need to register your face first before attempting to vote.');
      toast({
        title: "Face Not Registered",
        description: "Please register your face first using the Register Face button.",
        variant: "destructive", // Changed from "warning" to "destructive" to match allowed variants
      });
      return;
    }
    
    setIsScanning(true);
    toast({
      title: "Face Detection",
      description: "Scanning facial features...",
    });
    
    setTimeout(() => {
      setIsScanning(false);
      captureImage(videoRef, canvasRef);
    }, 1800);
  };

  const handleRegistrationMode = () => {
    setRegistrationModeState(true);
    setError(null);
    toast({
      title: "Face Registration Mode",
      description: "Position your face in the frame and click 'Register Face'",
    });
  };

  const simulateLivenessSuccess = () => {
    if (isLivenessChecking) {
      processLivenessGesture(true);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4", className)}>
      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            isCaptured && "hidden"
          )}
        />
      
        <canvas 
          ref={canvasRef} 
          className={cn(
            "w-full h-full object-cover",
            !isCaptured && "hidden"
          )}
        />
        
        {/* Face detection overlay */}
        {faceLandmarks.length > 0 && !isCaptured && !isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/3 w-48 h-48 border-2 border-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute left-[45%] top-[28%] w-3 h-3 bg-green-400 rounded-full"></div>
            <div className="absolute left-[55%] top-[28%] w-3 h-3 bg-green-400 rounded-full"></div>
            <div className="absolute left-1/2 top-[35%] w-3 h-3 bg-green-400 rounded-full transform -translate-x-1/2"></div>
            <div className="absolute left-1/2 top-[42%] w-10 h-2 bg-green-400 rounded-full transform -translate-x-1/2"></div>
          </div>
        )}
        
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-56 h-56 border-2 border-blue-400 rounded-full relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 border-t-2 border-blue-400 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
            </div>
          </div>
        )}
        
        {verificationStatus === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
        )}
        
        {verificationStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
        )}

        {isLivenessChecking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white">
            <p className="text-lg font-semibold mb-2">Liveness Check</p>
            <p className="text-md mb-4">Please {formatGestureInstruction(currentGesture)}</p>
            {/* FOR DEMO PURPOSES ONLY: In a real app, this would be detected automatically */}
            <Button onClick={simulateLivenessSuccess} variant="outline" className="mt-2">
              Simulate {currentGesture?.replace('_', ' ')}
            </Button>
          </div>
        )}
      </div>
            
      {error && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {!hasReferenceImage && !registrationModeState && (
          <Button
            onClick={handleRegistrationMode}
            variant="default"
            className="gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register Your Face
          </Button>
        )}
        
        {(hasReferenceImage || registrationModeState) && !isCaptured && (
          <Button
            onClick={handleCapture}
            disabled={!isCameraReady || isVerifying || isRegistering || isScanning}
            className="gap-2"
          >
            {isVerifying || isRegistering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {registrationModeState ? "Registering..." : "Verifying..."}
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                {registrationModeState ? "Register Face" : "Capture Face"}
              </>
            )}
          </Button>
        )}
        
        {isCaptured && (
          <Button
            onClick={retryCapture}
            variant="outline"
            disabled={isVerifying || isRegistering}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}

        {registrationModeState && !isCaptured && (
          <Button
            onClick={() => setRegistrationModeState(false)}
            variant="outline"
            disabled={isVerifying || isRegistering}
          >
            Cancel
          </Button>
        )}
      </div>

      {!hasReferenceImage && !registrationModeState && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertDescription>
            You need to register your face before you can vote. Please click the "Register Your Face" button above.
          </AlertDescription>
        </Alert>
      )}

      {isLivenessChecking && (
        <Alert className="w-full max-w-md bg-blue-50 text-blue-600 border-blue-200">
          <AlertDescription>
            <p className="font-semibold">Liveness check in progress</p>
            <p className="mt-1">This helps prevent spoofing attacks using photos or videos.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {faceLandmarks.length > 0 && !isCaptured && !isScanning && (
        <Alert className="w-full max-w-md bg-green-50 text-green-600 border-green-200">
          <AlertDescription>
            <p className="font-semibold">Face detected</p>
            <p className="mt-1">Facial features identified: {faceLandmarks.join(', ')}</p>
            <p className="text-xs mt-1">Position your face within the frame and click "Capture Face"</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Helper function to format gesture instructions
function formatGestureInstruction(gesture: string | null): string {
  if (!gesture) return "follow the instructions";
  
  switch(gesture) {
    case 'blink': return "blink your eyes";
    case 'smile': return "smile at the camera";
    case 'turn_left': return "turn your head slightly to the left";
    case 'turn_right': return "turn your head slightly to the right";
    case 'nod': return "nod your head up and down";
    case 'raise_eyebrows': return "raise your eyebrows";
    default: return "follow the instructions";
  }
}

export default FaceRecognition;
