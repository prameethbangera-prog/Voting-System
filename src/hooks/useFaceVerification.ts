import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  cosineSimilarity,
  detectFaceOnDataUrl,
  detectFaceOnVideo,
  getFaceLandmarker,
  type FaceDetectionFrame,
} from "@/utils/face/mediapipeFace";
import {
  LivenessTracker,
  gestureInstruction,
  pickLivenessGestures,
  type LivenessGesture,
} from "@/utils/face/liveness";

const DESCRIPTOR_KEY = "securevote_face_descriptor";
const MATCH_THRESHOLD = 0.88;

interface UseFaceVerificationProps {
  onVerified?: () => void;
  onError?: () => void;
  isRegistrationMode?: boolean;
}

function loadLocalDescriptor(): number[] | null {
  try {
    const raw = sessionStorage.getItem(DESCRIPTOR_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveLocalDescriptor(descriptor: number[]) {
  sessionStorage.setItem(DESCRIPTOR_KEY, JSON.stringify(descriptor));
}

export function useFaceVerification({
  onVerified,
  onError,
  isRegistrationMode = false,
}: UseFaceVerificationProps) {
  const [isCaptured, setIsCaptured] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasReferenceImage, setHasReferenceImage] = useState(false);
  const [isLivenessChecking, setIsLivenessChecking] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<LivenessGesture | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<Date | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [liveFrame, setLiveFrame] = useState<FaceDetectionFrame | null>(null);

  const { user } = useAuth();
  const referenceDescriptor = useRef<number[] | null>(loadLocalDescriptor());
  const livenessQueue = useRef<LivenessGesture[]>([]);
  const livenessTracker = useRef(new LivenessTracker());
  const consecutiveFailedVerifications = useRef(0);
  const lastDetectTs = useRef(0);
  const detecting = useRef(false);
  const livenessBusy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getFaceLandmarker()
      .then(() => {
        if (!cancelled) setModelReady(true);
      })
      .catch((err) => {
        console.error("Face model load failed:", err);
        if (!cancelled) {
          setModelError("Could not load the face detection model. Check your internet connection.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (referenceDescriptor.current?.length) {
      setHasReferenceImage(true);
    }
  }, []);

  useEffect(() => {
    const fetchUserFace = async () => {
      if (!user?.id || isRegistrationMode) return;

      try {
        const { data, error } = await supabase
          .from("user_biometrics")
          .select("face_image_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !data?.face_image_url) return;

        const frame = await detectFaceOnDataUrl(data.face_image_url);
        if (frame.descriptor.length) {
          referenceDescriptor.current = frame.descriptor;
          saveLocalDescriptor(frame.descriptor);
          setHasReferenceImage(true);
        }
      } catch (err) {
        console.error("Error loading registered face:", err);
      }
    };

    fetchUserFace();
  }, [user, isRegistrationMode]);

  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;
    const timer = setInterval(() => {
      if (new Date() >= lockoutEndTime) {
        setIsLocked(false);
        setLockoutEndTime(null);
        consecutiveFailedVerifications.current = 0;
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isLocked, lockoutEndTime]);

  const detectFromVideo = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video || !modelReady || video.readyState < 2 || detecting.current) return;
    detecting.current = true;
    try {
      const now = performance.now();
      if (now - lastDetectTs.current < 66) return;
      lastDetectTs.current = now;
      const frame = await detectFaceOnVideo(video, now);
      setLiveFrame(frame);
      return frame;
    } catch (err) {
      console.error("Face detect error:", err);
      return null;
    } finally {
      detecting.current = false;
    }
  }, [modelReady]);

  const lockTemporarily = () => {
    const lockoutEnd = new Date();
    lockoutEnd.setMinutes(lockoutEnd.getMinutes() + 5);
    setIsLocked(true);
    setLockoutEndTime(lockoutEnd);
    toast({
      title: "Temporarily locked",
      description: "Too many failed face checks. Try again in 5 minutes.",
      variant: "destructive",
    });
  };

  const compareToReference = async (
    video: HTMLVideoElement
  ): Promise<{ verified: boolean; confidence: number }> => {
    const live = await detectFaceOnVideo(video, performance.now());
    if (!live.detected || !live.descriptor.length) {
      return { verified: false, confidence: 0 };
    }

    let reference = referenceDescriptor.current;
    if (!reference?.length) {
      reference = loadLocalDescriptor();
    }
    if (!reference?.length) {
      return { verified: false, confidence: 0 };
    }

    const score = cosineSimilarity(live.descriptor, reference);
    return { verified: score >= MATCH_THRESHOLD, confidence: score };
  };

  const finishSuccess = (confidence?: number) => {
    setVerificationStatus("success");
    consecutiveFailedVerifications.current = 0;
    toast({
      title: "Face verified",
      description:
        confidence != null
          ? `Match score ${Math.round(confidence * 100)}%.`
          : "Your face was detected and liveness passed.",
    });
    if (onVerified) {
      setTimeout(() => onVerified(), 600);
    }
  };

  const registerFromVideo = async (video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
    setIsRegistering(true);
    try {
      const frame = await detectFaceOnVideo(video, performance.now());
      if (!frame.detected || !frame.closeEnough || !frame.descriptor.length) {
        throw new Error("No clear face found. Face the camera and try again.");
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture camera frame.");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);

      referenceDescriptor.current = frame.descriptor;
      saveLocalDescriptor(frame.descriptor);
      setHasReferenceImage(true);

      if (user?.id) {
        const { data: existingData } = await supabase
          .from("user_biometrics")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        const result = existingData
          ? await supabase
              .from("user_biometrics")
              .update({ face_image_url: imageData, updated_at: new Date().toISOString() })
              .eq("user_id", user.id)
          : await supabase.from("user_biometrics").insert({
              user_id: user.id,
              face_image_url: imageData,
            });

        if (result.error) {
          console.warn("Could not save face to database:", result.error);
        }
      }

      setIsCaptured(true);
      finishSuccess();
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Try again.",
        variant: "destructive",
      });
      if (onError) onError();
    } finally {
      setIsRegistering(false);
    }
  };

  const verifyAgainstReference = async (video: HTMLVideoElement) => {
    setIsVerifying(true);
    try {
      const result = await compareToReference(video);
      if (result.verified) {
        setIsCaptured(true);
        finishSuccess(result.confidence);
      } else {
        consecutiveFailedVerifications.current += 1;
        setVerificationStatus("error");
        toast({
          title: "Face did not match",
          description: "Look at the camera in good lighting and try again.",
          variant: "destructive",
        });
        if (consecutiveFailedVerifications.current >= 5) lockTemporarily();
        setTimeout(() => {
          setIsCaptured(false);
          setIsVerifying(false);
          setVerificationStatus("idle");
        }, 1600);
        if (onError) onError();
      }
    } catch (error) {
      console.error(error);
      setVerificationStatus("error");
      if (onError) onError();
    } finally {
      setIsVerifying(false);
    }
  };

  const startLiveness = () => {
    livenessQueue.current = pickLivenessGestures();
    livenessTracker.current.reset();
    setCurrentGesture(livenessQueue.current[0]);
    setIsLivenessChecking(true);
    toast({
      title: "Liveness check",
      description: `Please ${gestureInstruction(livenessQueue.current[0])}.`,
    });
  };

  const processLiveFrame = useCallback(
    async (frame: FaceDetectionFrame, video: HTMLVideoElement, canvas: HTMLCanvasElement) => {
      if (!isLivenessChecking || !currentGesture || isLocked || livenessBusy.current) return;
      const passed = livenessTracker.current.update(frame, currentGesture);
      if (!passed) return;

      livenessBusy.current = true;
      try {
        const idx = livenessQueue.current.indexOf(currentGesture);
        if (idx < livenessQueue.current.length - 1) {
          const next = livenessQueue.current[idx + 1];
          livenessTracker.current.reset();
          setCurrentGesture(next);
          toast({ title: "Good", description: `Now ${gestureInstruction(next)}.` });
          return;
        }

        setIsLivenessChecking(false);
        setCurrentGesture(null);

        if (isRegistrationMode) {
          await registerFromVideo(video, canvas);
        } else {
          await verifyAgainstReference(video);
        }
      } finally {
        livenessBusy.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLivenessChecking, currentGesture, isLocked, isRegistrationMode]
  );

  const captureImage = (
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>
  ) => {
    if (!videoRef.current || !canvasRef.current) {
      toast({
        title: "Camera not ready",
        description: "Please wait for the camera, then try again.",
        variant: "destructive",
      });
      if (onError) onError();
      return;
    }

    if (isLocked) {
      toast({
        title: "Temporarily locked",
        description: "Wait a few minutes before trying again.",
        variant: "destructive",
      });
      return;
    }

    const frame = liveFrame;
    if (!frame?.detected) {
      toast({
        title: "No face detected",
        description: "Look at the camera with your face clearly visible.",
        variant: "destructive",
      });
      return;
    }
    if (!frame.closeEnough || !frame.centered) {
      toast({
        title: "Adjust your position",
        description: "Center your face and move a bit closer.",
        variant: "destructive",
      });
      return;
    }

    if (!isRegistrationMode && !hasReferenceImage && !referenceDescriptor.current) {
      toast({
        title: "Face not registered",
        description: "Register your face first, then verify.",
        variant: "destructive",
      });
      return;
    }

    startLiveness();
  };

  const retryCapture = () => {
    setIsCaptured(false);
    setIsVerifying(false);
    setIsRegistering(false);
    setVerificationStatus("idle");
    setIsLivenessChecking(false);
    setCurrentGesture(null);
    livenessTracker.current.reset();
  };

  return {
    isCaptured,
    isVerifying,
    verificationStatus,
    captureImage,
    retryCapture,
    hasReferenceImage,
    isRegistering,
    isRegistrationMode,
    isLivenessChecking,
    currentGesture,
    isLocked,
    lockoutEndTime,
    modelReady,
    modelError,
    liveFrame,
    detectFromVideo,
    processLiveFrame,
  };
}
