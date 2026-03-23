/**
 * Type declarations for MediaPipe globals loaded via <script> tags.
 * The @mediapipe/hands and @mediapipe/camera_utils packages use IIFE patterns
 * that assign constructors and constants to the global scope.
 */

export type NormalizedLandmark = { x: number; y: number; z: number; visibility?: number };
export type NormalizedLandmarkList = NormalizedLandmark[];
export type NormalizedLandmarkListList = NormalizedLandmarkList[];
export type LandmarkConnectionArray = Array<[number, number]>;

export interface Handedness {
  index: number;
  score: number;
  label: string;
  displayName?: string;
}

export interface HandResults {
  multiHandLandmarks?: NormalizedLandmarkListList;
  multiHandWorldLandmarks?: NormalizedLandmarkListList;
  multiHandedness?: Handedness[];
  image: HTMLCanvasElement;
}

export interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: 0 | 1;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  selfieMode?: boolean;
}

export interface HandsConfig {
  locateFile?: (file: string, prefix?: string) => string;
}

export declare class HandsClass {
  constructor(config: HandsConfig);
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: HandResults) => void | Promise<void>): void;
  send(inputs: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }): Promise<void>;
  initialize(): Promise<void>;
  reset(): void;
  close(): Promise<void>;
}

export interface CameraOptions {
  onFrame: () => Promise<void> | null;
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export declare class CameraClass {
  constructor(video: HTMLVideoElement, options: CameraOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
}

declare global {
  const Hands: new (config: HandsConfig) => HandsClass;
  const Camera: new (video: HTMLVideoElement, options: CameraOptions) => CameraClass;
  const HAND_CONNECTIONS: LandmarkConnectionArray;
}
