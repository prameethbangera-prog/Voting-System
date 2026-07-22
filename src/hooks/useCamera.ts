
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseCameraProps {
  onError?: () => void;
}

export function useCamera({ onError }: UseCameraProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(document.createElement('video'));
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Create and configure the video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      videoRef.current.muted = true;
      videoRef.current.className = "w-full h-full object-cover";
    }
  }, []);

  // Start the webcam with improved error handling and video setup
  const startWebcam = async () => {
    try {
      setCameraError(false);
      
      // Stop any existing streams first
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      // Request camera with specific constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      
      setCameraStream(stream);
      
      // Make sure videoRef.current exists before trying to set srcObject
      if (videoRef.current) {
        // Set stream to video element
        videoRef.current.srcObject = stream;
        
        // Play the video immediately
        try {
          await videoRef.current.play();
          setIsCapturing(true);
        } catch (playError) {
          console.error('Error playing video:', playError);
          setCameraError(true);
          throw new Error('Failed to play video stream');
        }
      } else {
        console.error("Video element reference is null");
        setCameraError(true);
        toast({
          title: "Camera Error",
          description: "Could not initialize video element. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      setCameraError(true);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to continue with facial verification.",
        variant: "destructive",
      });
      if (onError) {
        onError(); // Notify about the error
      }
    }
  };
  
  // Stop the webcam with improved cleanup
  const stopWebcam = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsCapturing(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Automatic camera start is now handled by the component

  return {
    videoRef,
    isCapturing,
    cameraError,
    startWebcam,
    stopWebcam
  };
}
