import React, { useEffect, useRef, useState } from "react";
import { useFaceVerification } from "@/hooks/useFaceVerification";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { gestureInstruction } from "@/utils/face/liveness";
import type { FaceDetectionFrame } from "@/utils/face/mediapipeFace";

interface FaceRecognitionProps {
  onVerified: () => void;
  onError?: () => void;
  className?: string;
  isRegistrationMode?: boolean;
}

const FaceRecognition = ({
  onVerified,
  onError,
  className,
  isRegistrationMode = false,
}: FaceRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isCaptured,
    isVerifying,
    verificationStatus,
    captureImage,
    retryCapture,
    isRegistering,
    isLivenessChecking,
    currentGesture,
    modelReady,
    modelError,
    liveFrame,
    detectFromVideo,
    processLiveFrame,
  } = useFaceVerification({
    onVerified,
    onError,
    isRegistrationMode,
  });

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsCameraReady(true);
        }
      } catch (err) {
        console.error(err);
        setError("Could not access camera. Allow camera permission and refresh.");
        onError?.();
      }
    };

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onError]);

  useEffect(() => {
    if (!isCameraReady || !modelReady || isCaptured) return;

    const loop = async () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (video && overlay) {
        const frame = await detectFromVideo(video);
        if (frame) {
          drawOverlay(overlay, video, frame, isLivenessChecking);
          if (isLivenessChecking && canvasRef.current) {
            await processLiveFrame(frame, video, canvasRef.current);
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCameraReady, modelReady, isCaptured, detectFromVideo, processLiveFrame, isLivenessChecking]);

  const handleCapture = () => {
    if (modelError) {
      toast({ title: "Model not ready", description: modelError, variant: "destructive" });
      return;
    }
    captureImage(videoRef, canvasRef);
  };

  const faceOk = Boolean(liveFrame?.detected && liveFrame.centered && liveFrame.closeEnough);
  const loading = !isCameraReady || !modelReady;

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4", className)}>
      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">{!isCameraReady ? "Starting camera…" : "Loading face model…"}</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn("w-full h-full object-cover", isCaptured && "hidden")}
        />

        <canvas
          ref={overlayRef}
          className={cn("absolute inset-0 w-full h-full pointer-events-none", isCaptured && "hidden")}
        />

        <canvas ref={canvasRef} className={cn("w-full h-full object-cover", !isCaptured && "hidden")} />

        {verificationStatus === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <XCircle className="w-16 h-16 text-red-500" />
          </div>
        )}

        {isLivenessChecking && currentGesture && (
          <div className="absolute bottom-3 left-3 right-3 rounded-md bg-black/70 text-white text-center px-3 py-2 text-sm">
            {gestureInstruction(currentGesture)}
          </div>
        )}
      </div>

      {(error || modelError) && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertDescription>{error || modelError}</AlertDescription>
        </Alert>
      )}

      {!loading && !isCaptured && !isLivenessChecking && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {faceOk
            ? "Face in position. Click continue, then blink, smile, and turn left."
            : liveFrame?.detected
              ? "Center your face and move a little closer."
              : "Look at the camera so your face is visible."}
        </p>
      )}

      <div className="flex gap-2">
        {!isCaptured && (
          <Button
            onClick={handleCapture}
            disabled={loading || isVerifying || isRegistering || isLivenessChecking || !faceOk}
            className="gap-2"
          >
            {isVerifying || isRegistering || isLivenessChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isLivenessChecking ? "Follow the prompt…" : "Working…"}
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                {isRegistrationMode ? "Continue with this face" : "Verify face"}
              </>
            )}
          </Button>
        )}

        {isCaptured && verificationStatus !== "success" && (
          <Button onClick={retryCapture} variant="outline" disabled={isVerifying || isRegistering}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
};

function drawOverlay(
  overlay: HTMLCanvasElement,
  video: HTMLVideoElement,
  frame: FaceDetectionFrame | null,
  liveness: boolean
) {
  const w = video.videoWidth || overlay.clientWidth;
  const h = video.videoHeight || overlay.clientHeight;
  if (!w || !h) return;
  if (overlay.width !== w) overlay.width = w;
  if (overlay.height !== h) overlay.height = h;

  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  if (!frame?.detected || !frame.box) return;

  const { x, y, width, height } = frame.box;
  const ready = frame.centered && frame.closeEnough;
  ctx.strokeStyle = liveness ? "#60a5fa" : ready ? "#22c55e" : "#f59e0b";
  ctx.lineWidth = Math.max(3, w / 180);
  ctx.strokeRect(x * w, y * h, width * w, height * h);

  const points = [33, 263, 1, 61, 291, 13];
  ctx.fillStyle = ctx.strokeStyle;
  for (const i of points) {
    const p = frame.landmarks[i];
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default FaceRecognition;
