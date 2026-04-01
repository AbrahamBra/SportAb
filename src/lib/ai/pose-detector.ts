import type { Keypoint } from './exercise-detector';

let detector: any = null;
let isLoading = false;

function getTfGlobals() {
  const w = globalThis as any;
  if (!w.poseDetection || !w.tf) {
    throw new Error('TensorFlow.js not loaded. Ensure script tags are in app.html.');
  }
  return { poseDetection: w.poseDetection, tf: w.tf };
}

export async function initDetector(onProgress?: (msg: string) => void): Promise<void> {
  if (detector || isLoading) return;
  isLoading = true;
  try {
    const { poseDetection, tf } = getTfGlobals();
    onProgress?.('Checking GPU...');
    await tf.ready();
    onProgress?.(`Using ${tf.getBackend()} backend`);
    onProgress?.('Loading AI model...');
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    onProgress?.('Ready!');
  } finally {
    isLoading = false;
  }
}

export async function detectPose(video: HTMLVideoElement): Promise<Keypoint[]> {
  if (!detector || video.readyState < 2) return [];
  try {
    const poses = await detector.estimatePoses(video);
    return poses.length > 0 ? (poses[0].keypoints as Keypoint[]) : [];
  } catch {
    return [];
  }
}

export function isDetectorReady(): boolean {
  return detector !== null;
}
