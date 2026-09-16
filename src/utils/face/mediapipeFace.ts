import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from "@mediapipe/tasks-vision";

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type Landmark = { x: number; y: number; z: number };

export type FaceDetectionFrame = {
  detected: boolean;
  landmarks: Landmark[];
  blendshapes: Record<string, number>;
  box: { x: number; y: number; width: number; height: number } | null;
  centered: boolean;
  closeEnough: boolean;
  descriptor: number[];
};

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let runningMode: "VIDEO" | "IMAGE" = "VIDEO";

async function createLandmarker(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_CDN);

  const options = {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU" as const,
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO" as const,
    numFaces: 1,
  };

  try {
    return await FaceLandmarker.createFromOptions(fileset, options);
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

export function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker();
  }
  return landmarkerPromise;
}

function blendshapeMap(result: FaceLandmarkerResult): Record<string, number> {
  const map: Record<string, number> = {};
  const cats = result.faceBlendshapes?.[0]?.categories ?? [];
  for (const c of cats) {
    if (c.categoryName) map[c.categoryName] = c.score ?? 0;
  }
  return map;
}

function boundingBox(landmarks: Landmark[]) {
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
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}

/** Stable mesh indices for a compact identity descriptor. */
const DESCRIPTOR_INDICES = [
  1, 4, 6, 10, 33, 61, 93, 133, 152, 159, 234, 263, 291, 362, 386, 454,
  13, 14, 70, 105, 107, 336, 334, 300,
];

export function landmarkDescriptor(landmarks: Landmark[]): number[] {
  if (landmarks.length < 468) return [];

  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const midX = (leftEye.x + rightEye.x) / 2;
  const midY = (leftEye.y + rightEye.y) / 2;
  const scale = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1;

  const values: number[] = [];
  for (const i of DESCRIPTOR_INDICES) {
    const p = landmarks[i];
    values.push((p.x - midX) / scale, (p.y - midY) / scale, p.z / scale);
  }
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

function toFrame(result: FaceLandmarkerResult): FaceDetectionFrame {
  const empty: FaceDetectionFrame = {
    detected: false,
    landmarks: [],
    blendshapes: {},
    box: null,
    centered: false,
    closeEnough: false,
    descriptor: [],
  };

  const raw = result.faceLandmarks?.[0];
  if (!raw?.length) return empty;

  const landmarks = raw.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }));
  const box = boundingBox(landmarks);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  return {
    detected: true,
    landmarks,
    blendshapes: blendshapeMap(result),
    box,
    centered: Math.abs(cx - 0.5) < 0.18 && Math.abs(cy - 0.48) < 0.18,
    closeEnough: box.width > 0.18 && box.height > 0.22,
    descriptor: landmarkDescriptor(landmarks),
  };
}

export async function detectFaceOnVideo(
  video: HTMLVideoElement,
  timestampMs: number
): Promise<FaceDetectionFrame> {
  const landmarker = await getFaceLandmarker();
  if (runningMode !== "VIDEO") {
    await landmarker.setOptions({ runningMode: "VIDEO" });
    runningMode = "VIDEO";
  }
  const result = landmarker.detectForVideo(video, timestampMs);
  return toFrame(result);
}

export async function detectFaceOnImage(image: HTMLImageElement | HTMLCanvasElement): Promise<FaceDetectionFrame> {
  const landmarker = await getFaceLandmarker();
  if (runningMode !== "IMAGE") {
    await landmarker.setOptions({ runningMode: "IMAGE" });
    runningMode = "IMAGE";
  }
  const result = landmarker.detect(image);
  return toFrame(result);
}

export async function detectFaceOnDataUrl(dataUrl: string): Promise<FaceDetectionFrame> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load face image"));
    img.src = dataUrl;
  });
  return detectFaceOnImage(image);
}

export function estimateYaw(landmarks: Landmark[]): number {
  if (landmarks.length < 264) return 0;
  const left = landmarks[33];
  const right = landmarks[263];
  const nose = landmarks[1];
  const mid = (left.x + right.x) / 2;
  const eyeDist = Math.abs(right.x - left.x) || 1;
  return (nose.x - mid) / eyeDist;
}

export function estimatePitch(landmarks: Landmark[]): number {
  if (landmarks.length < 153) return 0;
  const left = landmarks[33];
  const right = landmarks[263];
  const chin = landmarks[152];
  const midY = (left.y + right.y) / 2;
  const eyeDist = Math.hypot(right.x - left.x, right.y - left.y) || 1;
  return (chin.y - midY) / eyeDist;
}
