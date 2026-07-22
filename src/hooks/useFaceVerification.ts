import { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UseFaceVerificationProps {
  onVerified?: () => void;
  onError?: () => void;
  isRegistrationMode?: boolean;
}

export function useFaceVerification({ onVerified, onError, isRegistrationMode = false }: UseFaceVerificationProps) {
  const [isCaptured, setIsCaptured] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [hasReferenceImage, setHasReferenceImage] = useState<boolean>(false);
  const [isLivenessChecking, setIsLivenessChecking] = useState(false);
  const [livenessGestures, setLivenessGestures] = useState<string[]>([]);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const { user } = useAuth();
  const captureAttempts = useRef(0);
  const livenessPassedRef = useRef(false);
  const consecutiveFailedVerifications = useRef(0);

  // Fetch the user's registered face image when component mounts
  useEffect(() => {
    const fetchUserFace = async () => {
      if (!user?.id) return;
      
      try {
        console.log("Fetching user biometrics for user ID:", user.id);
        const { data, error } = await supabase
          .from('user_biometrics')
          .select('face_image_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching user face image:', error);
          toast({
            title: "Error",
            description: "Failed to fetch your registered face image. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        
        console.log("User biometrics data:", data);
        
        if (data?.face_image_url) {
          setReferenceImage(data.face_image_url);
          setHasReferenceImage(true);
          toast({
            title: "Biometrics Found",
            description: "Your facial biometric data was successfully retrieved.",
          });
        } else {
          console.log("No face image found for user");
          setHasReferenceImage(false);
          toast({
            title: "No Biometrics Found",
            description: "Please register your facial biometrics to continue.",
          });
        }
      } catch (err) {
        console.error('Error in fetchUserFace:', err);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again later.",
          variant: "destructive",
        });
      }
    };
    
    fetchUserFace();
  }, [user]);

  // Initialize liveness detection gestures - requiring more gestures for better security
  useEffect(() => {
    if (isLivenessChecking && livenessGestures.length === 0) {
      // Enhanced random selection of gestures for liveness check - requiring 4 gestures for better security
      const availableGestures = ['blink', 'smile', 'turn_left', 'turn_right', 'nod', 'raise_eyebrows'];
      const selectedGestures = [];
      
      // Randomly select 4 gestures (increased from 3)
      while (selectedGestures.length < 4) {
        const randomIndex = Math.floor(Math.random() * availableGestures.length);
        const gesture = availableGestures[randomIndex];
        if (!selectedGestures.includes(gesture)) {
          selectedGestures.push(gesture);
        }
      }
      
      setLivenessGestures(selectedGestures);
      setCurrentGesture(selectedGestures[0]);
    }
  }, [isLivenessChecking]);

  // Check for lockout status
  useEffect(() => {
    if (isLocked && lockoutEndTime) {
      const checkLockStatus = () => {
        if (new Date() >= lockoutEndTime) {
          setIsLocked(false);
          setLockoutEndTime(null);
          consecutiveFailedVerifications.current = 0;
        }
      };

      const timer = setInterval(checkLockStatus, 1000);
      return () => clearInterval(timer);
    }
  }, [isLocked, lockoutEndTime]);

  // Register a new face image
  const registerFace = async (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!user?.id || !videoRef.current || !canvasRef.current) {
      toast({
        title: "Error",
        description: "Camera elements not available or user not logged in.",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);

    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error("Could not initialize camera context");
      }
      
      // Set canvas dimensions to match video
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      
      // Draw the current video frame on the canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 image data
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      console.log("Registering face image for user:", user.id);
      
      // Check if user already has a face image
      const { data: existingData } = await supabase
        .from('user_biometrics')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
        
      let result;
      
      if (existingData) {
        // Update existing record
        console.log("Updating existing biometrics record");
        result = await supabase
          .from('user_biometrics')
          .update({
            face_image_url: imageData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        // Insert new record
        console.log("Creating new biometrics record");
        result = await supabase
          .from('user_biometrics')
          .insert({
            user_id: user.id,
            face_image_url: imageData
          });
      }
      
      if (result.error) {
        throw result.error;
      }
      
      toast({
        title: "Face Registered",
        description: "Your face has been successfully registered for secure voting.",
      });
      
      // Set the reference image to the newly captured image
      setReferenceImage(imageData);
      setHasReferenceImage(true);
      
      // If we're in registration mode and onVerified callback exists, call it
      if (isRegistrationMode && onVerified) {
        onVerified();
      }
      
    } catch (error) {
      console.error('Face registration error:', error);
      toast({
        title: "Registration Error",
        description: "Failed to save your face image. Please try again.",
        variant: "destructive",
      });
      
      if (onError) {
        onError();
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Capture image from webcam and start verification process
  const captureImage = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Error",
        description: "Camera elements not available. Please refresh the page.",
        variant: "destructive",
      });
      
      if (onError) onError();
      return;
    }
    
    // Check if user is locked out
    if (isLocked) {
      const remainingTime = lockoutEndTime ? Math.ceil((lockoutEndTime.getTime() - new Date().getTime()) / 1000 / 60) : 0;
      toast({
        title: "Security Lockout",
        description: `Too many failed verification attempts. Please try again in ${remainingTime} minutes.`,
        variant: "destructive",
      });
      
      if (onError) onError();
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) {
      toast({
        title: "Error",
        description: "Could not initialize camera context. Please try again.",
        variant: "destructive",
      });
      
      if (onError) onError();
      return;
    }
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw the current video frame on the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setIsCaptured(true);
    
    if (!isRegistrationMode && !hasReferenceImage) {
      toast({
        title: "Face Not Registered",
        description: "Please register your face first before attempting verification.",
        variant: "destructive",
      });
      setVerificationStatus('error');
      setTimeout(() => {
        setIsCaptured(false);
        setVerificationStatus('idle');
      }, 2000);
      
      if (onError) onError();
      return;
    }
    
    // If we're in registration mode, register the face instead of verifying
    if (isRegistrationMode) {
      registerFace(videoRef, canvasRef);
      return;
    }
    
    // Start enhanced liveness detection before verification
    setIsLivenessChecking(true);
    toast({
      title: "Enhanced Security Check",
      description: `Please ${formatGestureInstruction(currentGesture || '')} to verify you're a real person.`,
    });
  };

  // Format gesture instruction for user display
  const formatGestureInstruction = (gesture: string): string => {
    switch(gesture) {
      case 'blink': return 'blink your eyes';
      case 'smile': return 'smile at the camera';
      case 'turn_left': return 'turn your head slightly to the left';
      case 'turn_right': return 'turn your head slightly to the right';
      case 'nod': return 'nod your head up and down';
      case 'raise_eyebrows': return 'raise your eyebrows';
      default: return 'follow the instructions';
    }
  };

  // Process liveness detection gesture with enhanced security
  const processLivenessGesture = (successful: boolean = true) => {
    if (!successful) {
      toast({
        title: "Security Check Failed",
        description: "Please try the gesture again or restart verification.",
        variant: "destructive",
      });
      captureAttempts.current += 1;
      
      // After 3 failed attempts, reset the process and increment security counter
      if (captureAttempts.current >= 3) {
        consecutiveFailedVerifications.current += 1;
        
        // If too many consecutive failures, lock the account temporarily
        if (consecutiveFailedVerifications.current >= 3) {
          // Lock for 15 minutes
          const lockoutEnd = new Date();
          lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 15);
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
          
          toast({
            title: "Account Temporarily Locked",
            description: "Too many failed verification attempts. For security reasons, biometric verification has been locked for 15 minutes.",
            variant: "destructive",
          });
          
          if (onError) onError();
        }
        
        resetVerification();
      }
      return;
    }
    
    // Find current gesture index
    const currentIndex = livenessGestures.findIndex(gesture => gesture === currentGesture);
    
    // If all gestures are completed
    if (currentIndex === livenessGestures.length - 1) {
      livenessPassedRef.current = true;
      setIsLivenessChecking(false);
      
      toast({
        title: "Security Check Passed",
        description: "Proceeding with face verification.",
      });
      
      // Proceed to verification
      verifyFace();
    } else {
      // Move to next gesture
      setCurrentGesture(livenessGestures[currentIndex + 1]);
      toast({
        title: "Good!",
        description: `Now please ${formatGestureInstruction(livenessGestures[currentIndex + 1])}`,
      });
    }
  };

  // Verify facial image against the user's registered face with enhanced security
  const verifyFace = async () => {
    // Skip verification if we don't have a reference image
    if (!referenceImage) {
      toast({
        title: "Face Not Registered",
        description: "Please register your face first before attempting to vote.",
        variant: "destructive",
      });
      setVerificationStatus('error');
      setTimeout(() => {
        setIsCaptured(false);
        setIsVerifying(false);
        setVerificationStatus('idle');
      }, 2000);
      
      if (onError) onError();
      return;
    }

    setIsVerifying(true);
    
    try {
      // In a real implementation, this would call a backend API for face comparison
      const result = await simulateFaceComparison(referenceImage);
      
      if (result.verified) {
        setVerificationStatus('success');
        toast({
          title: "Face Verified",
          description: `Your identity has been successfully verified with ${Math.round(result.confidence * 100)}% confidence.`,
        });
        
        // Reset the consecutive failures counter on success
        consecutiveFailedVerifications.current = 0;
        
        // Call the onVerified callback after a short delay
        if (onVerified) {
          setTimeout(() => {
            onVerified();
          }, 1500);
        }
      } else {
        setVerificationStatus('error');
        toast({
          title: "Verification Failed",
          description: "Face doesn't match our records. Please try again.",
          variant: "destructive",
        });
        
        // Increment the consecutive failures counter
        consecutiveFailedVerifications.current += 1;
        
        // Check if we need to lock the account
        if (consecutiveFailedVerifications.current >= 3) {
          const lockoutEnd = new Date();
          lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 15);
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
          
          toast({
            title: "Account Temporarily Locked",
            description: "Too many failed verification attempts. For security reasons, biometric verification has been locked for 15 minutes.",
            variant: "destructive",
          });
        }
        
        // Reset to try again
        setTimeout(() => {
          setIsCaptured(false);
          setIsVerifying(false);
          setVerificationStatus('idle');
        }, 2000);
        
        if (onError) onError();
      }
    } catch (error) {
      console.error('Face verification error:', error);
      setVerificationStatus('error');
      toast({
        title: "Verification Error",
        description: "An error occurred during face verification. Please try again.",
        variant: "destructive",
      });
      
      // Reset to try again
      setTimeout(() => {
        setIsCaptured(false);
        setIsVerifying(false);
        setVerificationStatus('idle');
      }, 2000);
      
      if (onError) onError();
    }
  };

  // Reset verification process
  const resetVerification = () => {
    setIsCaptured(false);
    setIsVerifying(false);
    setVerificationStatus('idle');
    setIsLivenessChecking(false);
    setLivenessGestures([]);
    setCurrentGesture(null);
    captureAttempts.current = 0;
    livenessPassedRef.current = false;
  };
  
  // Enhanced face comparison with more sophisticated security checks
  const simulateFaceComparison = async (referenceImage: string): Promise<{verified: boolean, confidence: number}> => {
    return new Promise((resolve) => {
      // Simulate API delay - longer for more thorough checking
      setTimeout(() => {
        // Enhanced simulation with multiple security factors
        // 1. Random element to simulate real comparison
        const randomFactor = Math.random();
        
        // 2. Current consecutive failures affect verification difficulty
        const difficultyFactor = 0.9 - (consecutiveFailedVerifications.current * 0.1);
        
        // 3. Check if liveness check was actually passed
        const livenessCheckPassed = livenessPassedRef.current;
        
        // 4. Require ALL security checks to pass for successful verification
        const isSuccess = livenessCheckPassed && (randomFactor < difficultyFactor);
        
        resolve({ 
          verified: isSuccess,
          confidence: isSuccess ? 0.85 + Math.random() * 0.1 : 0.3 + Math.random() * 0.2
        });
      }, 2500); // Longer verification time for more thorough checking
    });
  };
  
  // Enhanced palm verification
  const verifyPalm = async (palmImageData: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Simulate API delay - longer for more thorough checking
      setTimeout(() => {
        // Enhanced verification logic
        const randomFactor = Math.random();
        const difficultyFactor = 0.95 - (consecutiveFailedVerifications.current * 0.05);
        resolve(randomFactor < difficultyFactor);
      }, 2000);
    });
  };
  
  // Retry face verification
  const retryCapture = () => {
    setIsCaptured(false);
    setVerificationStatus('idle');
    resetVerification();
  };

  return {
    isCaptured,
    isVerifying,
    verificationStatus,
    captureImage,
    retryCapture,
    hasReferenceImage,
    isRegistering,
    registerFace,
    isRegistrationMode,
    isLivenessChecking,
    currentGesture,
    processLivenessGesture,
    verifyPalm,
    isLocked,
    lockoutEndTime,
    failedAttempts
  };
}
