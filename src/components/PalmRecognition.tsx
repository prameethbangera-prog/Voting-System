import React, { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  detectHandOnVideo,
  getHandLandmarker,
  HAND_CONNECTIONS,
  type HandFrame,
} from "@/utils/face/mediapipeHand";

interface PalmRecognitionProps {
  onVerified: () => void;
  onError?: () => void;
  className?: string;
}

const PalmRecognition = ({ onVerified, onError, className }: PalmRecognitionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const detectingRef = useRef(false);
  const lastTsRef = useRef(0);
  const stableCountRef = useRef(0);
  const lastReadyRef = useRef(false);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [palmReady, setPalmReady] = useState(false);
  const [hint, setHint] = useState("Hold an open palm toward the camera.");
  const [isCapturing, setIsCapturing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHandLandmarker()
      .then(() => {
        if (!cancelled) setModelReady(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setModelError("Could not load the hand model. Check your internet connection.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!isCameraReady || !modelReady || done) return;

    const loop = async () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (video && overlay && !detectingRef.current) {
        const now = performance.now();
        if (now - lastTsRef.current >= 80) {
          lastTsRef.current = now;
          detectingRef.current = true;
          try {
            const frame = await detectHandOnVideo(video, now);
            drawHandOverlay(overlay, video, frame);

            const ready = Boolean(frame.detected && frame.openPalm && frame.closeEnough);
            if (ready) {
              stableCountRef.current += 1;
            } else {
              stableCountRef.current = 0;
            }
            const stable = stableCountRef.current >= 6;
            if (stable !== lastReadyRef.current) {
              lastReadyRef.current = stable;
              setPalmReady(stable);
            }

            if (!frame.detected) setHint("Show an open palm to the camera.");
            else if (!frame.openPalm) setHint("Open your hand — fingers spread, palm facing the camera.");
            else if (!frame.closeEnough) setHint("Move your palm a bit closer.");
            else if (!stable) setHint("Hold still…");
            else setHint("Palm ready. Click Scan palm.");
          } catch (err) {
            console.error(err);
          } finally {
            detectingRef.current = false;
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCameraReady, modelReady, done]);

  const handleScan = () => {
    if (!palmReady) {
      toast({
        title: "Palm not ready",
        description: "Hold an open palm in the frame until the box turns green.",
        variant: "destructive",
      });
      return;
    }
    setIsCapturing(true);
    setTimeout(() => {
      setDone(true);
      setIsCapturing(false);
      toast({ title: "Palm verified", description: "You can continue to vote." });
      onVerified();
    }, 500);
  };

  const loading = !isCameraReady || !modelReady;

  return (
    <div className={cn("flex flex-col items-center gap-4 p-4", className)}>
      <div className="text-center">
        <h3 className="font-semibold text-lg">Palm verification</h3>
        <p className="text-sm text-muted-foreground">Hold an open palm facing the camera</p>
      </div>

      <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">{!isCameraReady ? "Starting camera…" : "Loading hand model…"}</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn("w-full h-full object-cover", done && "hidden")}
        />
        <canvas
          ref={overlayRef}
          className={cn("absolute inset-0 w-full h-full pointer-events-none", done && "hidden")}
        />

        {done && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
        )}
      </div>

      {(error || modelError) && (
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertDescription>{error || modelError}</AlertDescription>
        </Alert>
      )}

      {!loading && !done && (
        <p className="text-sm text-muted-foreground text-center max-w-md">{hint}</p>
      )}

      {!done && (
        <Button
          onClick={handleScan}
          disabled={loading || isCapturing || !palmReady}
          className="gap-2"
        >
          {isCapturing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Hand className="w-4 h-4" />
              Scan palm
            </>
          )}
        </Button>
      )}
    </div>
  );
};

function drawHandOverlay(overlay: HTMLCanvasElement, video: HTMLVideoElement, frame: HandFrame) {
  const w = video.videoWidth || overlay.clientWidth;
  const h = video.videoHeight || overlay.clientHeight;
  if (!w || !h) return;
  if (overlay.width !== w) overlay.width = w;
  if (overlay.height !== h) overlay.height = h;

  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!frame.detected || !frame.box) return;

  const ready = frame.openPalm && frame.closeEnough;
  ctx.strokeStyle = ready ? "#22c55e" : "#f59e0b";
  ctx.lineWidth = Math.max(3, w / 180);
  ctx.strokeRect(frame.box.x * w, frame.box.y * h, frame.box.width * w, frame.box.height * h);

  ctx.lineWidth = 2;
  for (const [a, b] of HAND_CONNECTIONS) {
    const p1 = frame.landmarks[a];
    const p2 = frame.landmarks[b];
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * w, p1.y * h);
    ctx.lineTo(p2.x * w, p2.y * h);
    ctx.stroke();
  }

  ctx.fillStyle = ctx.strokeStyle;
  for (const p of frame.landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default PalmRecognition;
