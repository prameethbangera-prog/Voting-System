import type { FaceDetectionFrame } from "./mediapipeFace";
import { estimatePitch, estimateYaw } from "./mediapipeFace";

export type LivenessGesture = "blink" | "smile" | "turn_left" | "turn_right";

export function gestureInstruction(gesture: LivenessGesture | null): string {
  switch (gesture) {
    case "blink":
      return "blink both eyes";
    case "smile":
      return "smile at the camera";
    case "turn_left":
      return "turn your head slightly to the left";
    case "turn_right":
      return "turn your head slightly to the right";
    default:
      return "look at the camera";
  }
}

export function pickLivenessGestures(): LivenessGesture[] {
  return ["blink", "smile", "turn_left"];
}

function blend(frame: FaceDetectionFrame, name: string): number {
  return frame.blendshapes[name] ?? 0;
}

export class LivenessTracker {
  private blinkWasOpen = true;
  private smileMs = 0;
  private turnMs = 0;
  private lastTs = 0;

  reset() {
    this.blinkWasOpen = true;
    this.smileMs = 0;
    this.turnMs = 0;
    this.lastTs = 0;
  }

  update(frame: FaceDetectionFrame, gesture: LivenessGesture, now = performance.now()): boolean {
    if (!frame.detected) {
      this.smileMs = 0;
      this.turnMs = 0;
      this.lastTs = now;
      return false;
    }

    const dt = this.lastTs ? Math.min(80, now - this.lastTs) : 16;
    this.lastTs = now;

    const blinkL = blend(frame, "eyeBlinkLeft");
    const blinkR = blend(frame, "eyeBlinkRight");
    const smile = (blend(frame, "mouthSmileLeft") + blend(frame, "mouthSmileRight")) / 2;
    const yaw = estimateYaw(frame.landmarks);
    const pitch = estimatePitch(frame.landmarks);
    void pitch;

    if (gesture === "blink") {
      const closed = blinkL > 0.45 && blinkR > 0.45;
      const open = blinkL < 0.22 && blinkR < 0.22;
      if (this.blinkWasOpen && closed) {
        this.blinkWasOpen = false;
      } else if (!this.blinkWasOpen && open) {
        this.blinkWasOpen = true;
        return true;
      }
      return false;
    }

    if (gesture === "smile") {
      if (smile > 0.42) {
        this.smileMs += dt;
        if (this.smileMs > 350) {
          this.smileMs = 0;
          return true;
        }
      } else {
        this.smileMs = 0;
      }
      return false;
    }

    const turned =
      gesture === "turn_left" ? yaw < -0.12 : gesture === "turn_right" ? yaw > 0.12 : false;

    if (turned) {
      this.turnMs += dt;
      if (this.turnMs > 350) {
        this.turnMs = 0;
        return true;
      }
    } else {
      this.turnMs = 0;
    }
    return false;
  }
}
