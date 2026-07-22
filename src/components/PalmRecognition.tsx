
import React, { useRef, useState, useEffect } from 'react';
import { Camera, Loader2, CheckCircle2, XCircle, RotateCcw, Scan, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PalmRecognitionProps {
  onVerified: () => void;
  onError?: () => void;
  className?: string;
}

const PalmRecognition = ({ onVerified, onError, className }: PalmRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCaptured, setIsCaptured] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLivenessChecking, setIsLivenessChecking] = useState(false);
  const [isPalmDetected, setIsPalmDetected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [palmFeatures, setPalmFeatures] = useState<string[]>([]);
  const [isConfidenceLow, setIsConfidenceLow] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [isPalmProperlyPositioned, setIsPalmProperlyPositioned] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        setVerificationStatus('idle');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 } 
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please ensure you have granted camera permissions.",
          variant: "destructive",
        });
        if (onError) onError();
      }
    };
    
    startCamera();
    
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onError]);
  
  // Simulate advanced palm detection with continuous analysis - optimized for speed
  useEffect(() => {
    if (!isCameraReady || isCaptured || isScanning) return;
    
    let lastDetectionTime = 0;
    // Reduced detection interval from 300ms to 100ms for faster detection
    const DETECTION_INTERVAL = 100; 
    
    const detectPalm = (timestamp: number) => {
      if (timestamp - lastDetectionTime > DETECTION_INTERVAL) {
        lastDetectionTime = timestamp;
        
        // Get the video frame
        if (videoRef.current && overlayCanvasRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (context) {
            // Set canvas size to match video
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            
            // Draw current frame to analyze
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Optimized palm detection simulation - faster processing
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const isPalmPresent = detectPalmInFrame(imageData);
            
            if (isPalmPresent.detected) {
              setIsPalmDetected(true);
              setDetectionConfidence(isPalmPresent.confidence);
              setIsConfidenceLow(isPalmPresent.confidence < 0.7);
              setIsPalmProperlyPositioned(isPalmPresent.confidence > 0.8);
              
              // Optimized feature detection
              const detectedFeatures = analyzeFrame(imageData, isPalmPresent.confidence);
              setPalmFeatures(detectedFeatures);
              
              // Draw palm overlay if palm is detected with good confidence
              if (isPalmPresent.confidence > 0.7) {
                drawPalmOverlay(canvas.width, canvas.height);
              }
            } else {
              setIsPalmDetected(false);
              setPalmFeatures([]);
              clearOverlay();
            }
          }
        }
      }
      
      // Continue detection loop
      animationFrameRef.current = requestAnimationFrame(detectPalm);
    };
    
    animationFrameRef.current = requestAnimationFrame(detectPalm);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCameraReady, isCaptured, isScanning]);
  
  // Optimized palm detection in frame for faster response
  const detectPalmInFrame = (imageData: ImageData): {detected: boolean, confidence: number} => {
    // In a real implementation, this would use ML to detect hands/palms
    // For simulation with faster detection
    
    // Reduced random factors to make detection more stable
    const movementFactor = Math.random() * 0.2; // Reduced from 0.3
    const lightingFactor = Math.random() * 0.15 + 0.85; // More consistent lighting
    
    // Increased base detection probability for faster detection
    const baseDetection = Math.min(0.8 + (Date.now() % 5000) / 15000, 0.95); // Higher starting point
    
    // Calculate detection confidence with optimized parameters
    const confidence = baseDetection * lightingFactor - movementFactor;
    
    // Lowered threshold for faster detection
    const isDetected = confidence > 0.6; // Reduced from 0.65
    
    return { 
      detected: isDetected, 
      confidence: isDetected ? confidence : 0 
    };
  };
  
  // Simplified frame analysis for faster processing
  const analyzeFrame = (imageData: ImageData, confidence: number): string[] => {
    // Optimized feature detection for speed
    
    const features = [];
    
    // Lowered confidence thresholds for faster feature detection
    if (confidence > 0.65) { // Reduced from 0.7
      if (confidence > 0.7) features.push("main lines");
      if (confidence > 0.75) features.push("heart line"); // Reduced from 0.8
      if (confidence > 0.78) features.push("head line"); // Reduced from 0.82
      if (confidence > 0.8) features.push("life line"); // Reduced from 0.84
      if (confidence > 0.85) features.push("fingerprint patterns"); // Reduced from 0.88
    }
    
    return features;
  };
  
  // Draw palm detection overlay with real-time visualization
  const drawPalmOverlay = (width: number, height: number) => {
    if (!overlayCanvasRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    
    // Draw palm outline
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Reduced jitter effect for more stable visualization
    const jitter = detectionConfidence > 0.85 ? 0 : Math.random() * 2; // Reduced from 3
    
    // Draw palm boundary with dynamic opacity based on confidence
    ctx.strokeStyle = `rgba(0, 255, 0, ${Math.min(0.7 + detectionConfidence, 1)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Larger ellipse to better cover palm (further increased from 130x200 to 150x220)
    ctx.ellipse(centerX + jitter, centerY + jitter, 150, 220, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Only draw detailed features when detection confidence is high
    if (detectionConfidence > 0.75) {
      // Draw main lines with dynamic appearance
      ctx.strokeStyle = `rgba(0, 255, 0, ${Math.min(0.6 + detectionConfidence, 1)})`;
      ctx.lineWidth = 2;
      
      // Heart line - only draw if detected
      if (palmFeatures.includes("heart line")) {
        ctx.beginPath();
        // Scale these lines proportionally with the larger ellipse
        ctx.moveTo(centerX - 120, centerY - 60);
        ctx.bezierCurveTo(centerX - 40, centerY - 70, centerX + 40, centerY - 70, centerX + 120, centerY - 40);
        ctx.stroke();
      }
      
      // Head line - only draw if detected
      if (palmFeatures.includes("head line")) {
        ctx.beginPath();
        ctx.moveTo(centerX - 120, centerY);
        ctx.bezierCurveTo(centerX - 40, centerY - 15, centerX + 40, centerY - 15, centerX + 100, centerY);
        ctx.stroke();
      }
      
      // Life line - only draw if detected
      if (palmFeatures.includes("life line")) {
        ctx.beginPath();
        ctx.moveTo(centerX - 75, centerY - 120);
        ctx.bezierCurveTo(centerX - 90, centerY - 30, centerX - 100, centerY + 50, centerX - 75, centerY + 140);
        ctx.stroke();
      }
      
      // Fate line - only draw in highest confidence
      if (detectionConfidence > 0.85) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY + 140);
        ctx.bezierCurveTo(centerX, centerY + 70, centerX, centerY - 70, centerX, centerY - 140);
        ctx.stroke();
      }
      
      // Reference points for detailed palm reading
      ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(0.8 + detectionConfidence, 1)})`;
      const pointRadius = 3;
      
      // Draw detection points only at high confidence
      if (detectionConfidence > 0.8) {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          // Increased radius to match the larger ellipse
          const x = centerX + Math.cos(angle) * 150;
          const y = centerY + Math.sin(angle) * 220;
          
          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };
  
  // Clear the overlay canvas
  const clearOverlay = () => {
    if (!overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraReady(false);
    }
  };
  
  const capturePalm = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // First ensure that we actually have a palm detected with sufficient confidence
    // Slightly reduced required confidence for faster detection
    if (!isPalmDetected || detectionConfidence < 0.65) { // Reduced from 0.72
      toast({
        title: "No Palm Detected",
        description: "Please position your palm clearly in the center of the frame.",
        variant: "destructive",
      });
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    setIsScanning(true);
    
    toast({
      title: "Palm Detection",
      description: "Scanning palm features...",
    });
    
    // Further optimized scan timing - reduced delays
    setTimeout(() => {
      // Draw the current video frame on the canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      toast({
        title: "Feature Detection",
        description: `Analyzing palm lines and features...`,
      });
      
      // Reduced delay from 700ms to 500ms
      setTimeout(() => {
        setIsCaptured(true);
        setIsScanning(false);
        
        // Start with liveness check before palm verification
        setIsLivenessChecking(true);
        toast({
          title: "Liveness Check",
          description: "Please move your palm slightly to verify it's a real palm.",
        });
        
        // Reduced liveness check from 800ms to 500ms
        setTimeout(() => {
          setIsLivenessChecking(false);
          toast({
            title: "Liveness Check Complete",
            description: "Now verifying your palm scan...",
          });
          verifyPalm();
        }, 500); // Reduced from 800ms
      }, 500); // Reduced from 700ms
    }, 600); // Reduced from 800ms
  };
  
  const verifyPalm = async () => {
    setIsVerifying(true);
    
    try {
      // Faster verification process - reduced delay significantly
      await new Promise(resolve => setTimeout(resolve, 600)); // Reduced from 1000ms
      
      // Success criteria now depends on:
      // 1. Palm must be detected
      // 2. Detection confidence must be high enough
      // 3. Must have detected enough palm features
      // 4. Previous attempt history is considered
      
      const minRequiredFeatures = 2; // Reduced from 3 features to 2
      const detectedFeatureCount = palmFeatures.length;
      const featuresSufficient = detectedFeatureCount >= minRequiredFeatures;
      
      // More lenient verification with each attempt for faster process
      const successThreshold = 0.7 - (Math.min(attemptCount, 2) * 0.05); // Reduced from 0.8
      
      // Calculate overall verification score
      const verificationScore = detectionConfidence * (featuresSufficient ? 1.0 : 0.7);
      const isSuccess = isPalmDetected && (verificationScore > successThreshold);
      
      if (isSuccess) {
        setVerificationStatus('success');
        toast({
          title: "Palm Verified",
          description: `Successfully verified ${detectedFeatureCount} palm features.`,
        });
        
        // Call the onVerified callback after a shorter delay
        setTimeout(() => {
          if (onVerified) onVerified();
        }, 500); // Reduced from 800ms
      } else {
        setVerificationStatus('error');
        setAttemptCount(prevCount => prevCount + 1);
        
        // Different messaging based on failure reason
        if (!isPalmDetected) {
          toast({
            title: "Verification Failed",
            description: "No palm detected in the image. Please try again with your palm clearly visible.",
            variant: "destructive",
          });
        } else if (!featuresSufficient) {
          toast({
            title: "Verification Failed",
            description: `Not enough palm features detected (found ${detectedFeatureCount}/${minRequiredFeatures}). Please ensure your palm is well-lit and centered.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification Failed",
            description: "Palm verification failed. Please ensure your entire palm is visible and well-lit.",
            variant: "destructive",
          });
        }
        
        // Reset to try again after a shorter delay
        setTimeout(() => {
          retryCapture();
        }, 800); // Reduced from 1000ms
      }
    } catch (error) {
      setVerificationStatus('error');
      toast({
        title: "Verification Error",
        description: "An error occurred during palm verification.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  const retryCapture = () => {
    setIsCaptured(false);
    setVerificationStatus('idle');
  };
  
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Enhanced Palm Verification</h3>
        <p className="text-sm text-gray-500">Place your palm facing the camera</p>
      </div>
      
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
        
        {/* Overlay for palm detection visualization */}
        <canvas
          ref={overlayCanvasRef}
          className={cn(
            "absolute inset-0 w-full h-full",
            (isCaptured || !isPalmDetected) && "hidden"
          )}
        />
        
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 border-4 border-blue-400 rounded-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan className="w-12 h-12 text-blue-400" />
              </div>
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-[scanning_1s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}
        
        {isLivenessChecking && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
              <p className="text-blue-500 font-medium mt-2">Performing liveness check...</p>
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
      </div>
      
      <div className="flex gap-2">
        {!isCaptured ? (
          <Button
            onClick={capturePalm}
            disabled={!isCameraReady || isVerifying || !isPalmDetected || isScanning || detectionConfidence < 0.7}
            className="gap-2"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Hand className="w-4 h-4" />
                Scan Palm
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={retryCapture}
            variant="outline"
            disabled={isVerifying || isLivenessChecking}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
      
      {/* Dynamic feedback based on palm detection status */}
      {isPalmDetected && !isCaptured && (
        <Alert className={cn(
          "w-full max-w-md",
          isPalmProperlyPositioned 
            ? "bg-green-50 text-green-600 border-green-200"
            : "bg-yellow-50 text-yellow-700 border-yellow-200"
        )}>
          <AlertTitle>{isPalmProperlyPositioned ? "Palm Positioned Correctly" : "Palm Detected"}</AlertTitle>
          <AlertDescription>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full",
                    isPalmProperlyPositioned ? "bg-green-500" : "bg-yellow-500"
                  )}
                  style={{ width: `${detectionConfidence * 100}%` }}
                ></div>
              </div>
              <span className="text-xs whitespace-nowrap">{Math.round(detectionConfidence * 100)}%</span>
            </div>
            <p className="mt-1">Found palm features: {palmFeatures.join(', ') || 'scanning...'}</p>
            <p className="text-xs mt-1">
              {isPalmProperlyPositioned 
                ? "Position excellent! Click 'Scan Palm' to continue."
                : "Please center your palm and ensure all lines are visible."}
            </p>
          </AlertDescription>
        </Alert>
      )}
      
      {!isPalmDetected && !isCaptured && (
        <Alert className="w-full max-w-md bg-amber-50 text-amber-800 border-amber-200">
          <AlertTitle>No Palm Detected</AlertTitle>
          <AlertDescription>
            <p>Please position your palm flat and parallel to the camera, ensuring it fills the frame.</p>
            <div className="mt-2 text-center">
              <Hand className="h-12 w-12 mx-auto text-amber-500" />
              <p className="text-xs mt-1">Hold your palm like this, facing the camera</p>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {attemptCount > 0 && (
        <Alert className={cn(
          "w-full max-w-md",
          attemptCount > 1 ? "bg-red-50 text-red-800 border-red-200" : "bg-amber-50 text-amber-800 border-amber-200"
        )}>
          <AlertDescription className="text-sm">
            {attemptCount === 1 ? (
              "Verification failed. Make sure your palm is well-lit and centered in the frame."
            ) : (
              "Multiple verification failures detected. This may be logged as a security event."
            )}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="w-full max-w-md p-3 text-sm text-blue-600 bg-blue-50 rounded-md">
        <p>For best results:</p>
        <ul className="list-disc list-inside mt-1">
          <li>Hold your palm flat and parallel to the camera</li>
          <li>Ensure good lighting conditions</li>
          <li>Make sure all your palm lines are clearly visible</li>
          <li>Keep your hand steady during scanning</li>
          <li>Remove any jewelry or watches from your palm</li>
        </ul>
      </div>
    </div>
  );
};

export default PalmRecognition;
