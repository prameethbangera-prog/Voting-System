import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type HandPoint = { x: number; y: number; z: number };

export type HandFrame = {
  detected: boolean;
  landmarks: HandPoint[];
  box: { x: number; y: number; width: number; height: number } | null;
  centered: boolean;
  closeEnough: boolean;
  openPalm: boolean;
};

let handPromise: Promise<HandLandmarker> | null = null;

async function createHandLandmarker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_CDN);
  const options = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU" as const,
    },
    runningMode: "VIDEO" as const,
    numHands: 1,
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.6,
    minTrackingConfidence: 0.5,
  };

  try {
    return await HandLandmarker.createFromOptions(fileset, options);
  } catch {
    return await HandLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

export function getHandLandmarker(): Promise<HandLandmarker> {
  if (!handPromise) handPromise = createHandLandmarker();
  return handPromise;
}

function boundingBox(landmarks: HandPoint[]) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const p of landmarks) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Fingers extended = open palm facing the camera. */
function isOpenPalm(landmarks: HandPoint[]): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];
  let extended = 0;
  for (let i = 0; i < tips.length; i++) {
    const tip = landmarks[tips[i]];
    const pip = landmarks[pips[i]];
    const tipDist = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const pipDist = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    if (tipDist > pipDist * 1.15) extended += 1;
  }
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbDist = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
  const thumbIpDist = Math.hypot(thumbIp.x - wrist.x, thumbIp.y - wrist.y);
  if (thumbDist > thumbIpDist * 1.05) extended += 1;
  return extended >= 4;
}

export async function detectHandOnVideo(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<HandFrame> {
  const landmarker = await getHandLandmarker();
  const result = landmarker.detectForVideo(video, timestampMs);
  const raw = result.landmarks?.[0];
  if (!raw?.length) {
    return {
      detected: false,
      landmarks: [],
      box: null,
      centered: false,
      closeEnough: false,
      openPalm: false,
    };
  }

  const landmarks = raw.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
  const box = boundingBox(landmarks);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  return {
    detected: true,
    landmarks,
    box,
    centered: Math.abs(cx - 0.5) < 0.28 && Math.abs(cy - 0.5) < 0.28,
    closeEnough: box.width > 0.18 && box.height > 0.22,
    openPalm: isOpenPalm(landmarks),
  };
}

export const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];
