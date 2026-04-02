import type { Keypoint } from './exercise-detector';
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

let detector: poseDetection.PoseDetector | null = null;
let isLoading = false;

export async function initDetector(onProgress?: (msg: string) => void): Promise<void> {
  if (detector || isLoading) return;
  isLoading = true;
  try {
    onProgress?.('Chargement IA...');
    onProgress?.('Verification GPU...');
    await tf.ready();
    onProgress?.(`Backend: ${tf.getBackend()}`);
    onProgress?.('Chargement modele...');
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    onProgress?.('Pret !');
  } finally {
    isLoading = false;
  }
}

export async function detectPose(video: HTMLVideoElement): Promise<Keypoint[]> {
  if (!detector || video.readyState < 2) return [];
  try {
    const poses = await detector.estimatePoses(video);
    if (poses.length > 0 && poses[0]) {
      return poses[0].keypoints as Keypoint[];
    }
    return [];
  } catch {
    return [];
  }
}

export function isDetectorReady(): boolean {
  return detector !== null;
}
