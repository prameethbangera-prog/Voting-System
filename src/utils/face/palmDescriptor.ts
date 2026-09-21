import { cosineSimilarity } from "./mediapipeFace";
import type { HandPoint } from "./mediapipeHand";

/** Normalize landmarks relative to wrist + hand scale → compact palm descriptor. */
export function palmLandmarkDescriptor(landmarks: HandPoint[]): number[] {
  if (landmarks.length < 21) return [];
  const wrist = landmarks[0];
  const mid = landmarks[9];
  const scale = Math.hypot(mid.x - wrist.x, mid.y - wrist.y, mid.z - wrist.z) || 1;
  const out: number[] = [];
  for (const p of landmarks) {
    out.push((p.x - wrist.x) / scale, (p.y - wrist.y) / scale, (p.z - wrist.z) / scale);
  }
  return out;
}

export const PALM_MATCH_THRESHOLD = 0.92;

export function palmMatchScore(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}
