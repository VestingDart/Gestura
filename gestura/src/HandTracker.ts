import type { NormalizedLandmarkList, HandResults, HandsConfig, HandsOptions, CameraOptions } from './mediapipe-globals';

export type { NormalizedLandmarkList };

export type GestureMode = 'rotate' | 'pinch' | 'tilt' | 'none';

export interface HandState {
  detected: boolean;
  gesture: GestureMode;
  /** Normalized palm center [0..1], X already flipped for mirror display */
  palmX: number;
  palmY: number;
  /** Pinch distance in normalized coords */
  pinchDistance: number;
  confidence: number;
  landmarks: NormalizedLandmarkList | null;
}

type HandCallback = (state: HandState) => void;

// Landmark indices
const WRIST = 0;
const INDEX_TIP = 8;
const INDEX_MCP = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP = 16;
const RING_MCP = 13;
const PINKY_TIP = 20;
const PINKY_MCP = 17;
const THUMB_TIP = 4;

type Pt = { x: number; y: number };

function d2(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isExtended(tip: Pt, mcp: Pt, wrist: Pt): boolean {
  return d2(tip, wrist) > d2(mcp, wrist) * 1.2;
}

function classifyGesture(lm: NormalizedLandmarkList): GestureMode {
  const wrist = lm[WRIST];
  const thumbTip = lm[THUMB_TIP];
  const indexTip = lm[INDEX_TIP];
  const indexMcp = lm[INDEX_MCP];
  const middleTip = lm[MIDDLE_TIP];
  const middleMcp = lm[MIDDLE_MCP];
  const ringTip = lm[RING_TIP];
  const ringMcp = lm[RING_MCP];
  const pinkyTip = lm[PINKY_TIP];
  const pinkyMcp = lm[PINKY_MCP];

  // Pinch: thumb tip close to index tip
  if (d2(thumbTip, indexTip) < 0.07) return 'pinch';

  const indexExt = isExtended(indexTip, indexMcp, wrist);
  const middleExt = isExtended(middleTip, middleMcp, wrist);
  const ringExt = isExtended(ringTip, ringMcp, wrist);
  const pinkyExt = isExtended(pinkyTip, pinkyMcp, wrist);

  // Only index finger extended → tilt
  if (indexExt && !middleExt && !ringExt && !pinkyExt) return 'tilt';

  // Open hand (3+ fingers) → rotate
  const extCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
  if (extCount >= 3) return 'rotate';

  return 'rotate';
}

export class HandTracker {
  private handsInstance: InstanceType<typeof Hands>;
  private cameraInstance: InstanceType<typeof Camera>;
  private callback: HandCallback;
  private lastState: HandState;

  constructor(videoEl: HTMLVideoElement, callback: HandCallback) {
    this.callback = callback;
    this.lastState = {
      detected: false,
      gesture: 'none',
      palmX: 0.5,
      palmY: 0.5,
      pinchDistance: 1,
      confidence: 0,
      landmarks: null,
    };

    const config: HandsConfig = {
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    };

    this.handsInstance = new Hands(config);

    const options: HandsOptions = {
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    };
    this.handsInstance.setOptions(options);
    this.handsInstance.onResults((results: HandResults) => this.onResults(results));

    const camOptions: CameraOptions = {
      onFrame: async () => {
        await this.handsInstance.send({ image: videoEl });
      },
      width: 1280,
      height: 720,
    };
    this.cameraInstance = new Camera(videoEl, camOptions);
    this.cameraInstance.start();
  }

  private onResults(results: HandResults): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.lastState = {
        detected: false,
        gesture: 'none',
        palmX: 0.5,
        palmY: 0.5,
        pinchDistance: 1,
        confidence: 0,
        landmarks: null,
      };
      this.callback(this.lastState);
      return;
    }

    const lm = results.multiHandLandmarks[0];

    // Palm center: average of wrist + knuckle landmarks, then flip X for mirror
    const palmIdx = [0, 1, 5, 9, 13, 17];
    let px = 0, py = 0;
    for (const i of palmIdx) {
      px += lm[i].x;
      py += lm[i].y;
    }
    px = 1 - (px / palmIdx.length);
    py = py / palmIdx.length;

    const pinchDist = d2(lm[THUMB_TIP], lm[INDEX_TIP]);
    const gesture = classifyGesture(lm);
    const score = results.multiHandedness?.[0]?.score ?? 1;

    this.lastState = {
      detected: true,
      gesture,
      palmX: px,
      palmY: py,
      pinchDistance: pinchDist,
      confidence: score,
      landmarks: lm,
    };

    this.callback(this.lastState);
  }

  getState(): HandState {
    return this.lastState;
  }

  stop(): void {
    void this.cameraInstance.stop();
  }
}
