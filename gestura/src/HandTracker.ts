import type { NormalizedLandmarkList, HandResults, HandsConfig, HandsOptions, CameraOptions } from './mediapipe-globals';

export type { NormalizedLandmarkList };

export type GestureMode = 'none' | 'idle' | 'grab' | 'scale' | 'pinch3';

export interface HandState {
  detected: boolean;
  gesture: GestureMode;
  /** Normalized palm center [0..1], X already flipped for mirror display */
  palmX: number;
  palmY: number;
  /** Second hand palm center (valid when handsDetected >= 2) */
  palmX2: number;
  palmY2: number;
  /** Roll angle of primary hand wrist in radians (wrist→middle-MCP vector) */
  wristAngle: number;
  /** Raw thumb–index distance, kept for HandCanvas compatibility */
  pinchDistance: number;
  confidence: number;
  landmarks: NormalizedLandmarkList | null;
  allLandmarks: NormalizedLandmarkList[];
  handsDetected: number;
}

type HandCallback = (state: HandState) => void;

// Landmark indices
const WRIST      = 0;
const INDEX_TIP  = 8;
const INDEX_MCP  = 5;
const MIDDLE_TIP = 12;
const MIDDLE_MCP = 9;
const RING_TIP   = 16;
const RING_MCP   = 13;
const PINKY_TIP  = 20;
const PINKY_MCP  = 17;
const THUMB_TIP  = 4;

const PALM_IDX = [0, 1, 5, 9, 13, 17];

// Three-finger pinch thresholds (normalized screen distance)
const PINCH3_ENTER = 0.065;
const PINCH3_EXIT  = 0.090;

type Pt = { x: number; y: number };

function d2(a: Pt, b: Pt): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isExtended(tip: Pt, mcp: Pt, wrist: Pt): boolean {
  return d2(tip, wrist) > d2(mcp, wrist) * 1.2;
}

const FINGERS: [number, number][] = [
  [INDEX_TIP,  INDEX_MCP],
  [MIDDLE_TIP, MIDDLE_MCP],
  [RING_TIP,   RING_MCP],
  [PINKY_TIP,  PINKY_MCP],
];

function curledCount(lm: NormalizedLandmarkList): number {
  const wrist = lm[WRIST];
  return FINGERS.filter(([tip, mcp]) => !isExtended(lm[tip], lm[mcp], wrist)).length;
}

/**
 * Fist detection with hysteresis:
 * - Enter fist mode when ≥3 fingers are curled
 * - Stay in fist mode as long as ≥2 fingers are still curled
 */
function isFist(lm: NormalizedLandmarkList, prevFist: boolean): boolean {
  const n = curledCount(lm);
  return prevFist ? n >= 2 : n >= 3;
}

/** Compute normalized palm center; X is flipped for mirror display */
function palmCenter(lm: NormalizedLandmarkList): { px: number; py: number } {
  let px = 0, py = 0;
  for (const i of PALM_IDX) { px += lm[i].x; py += lm[i].y; }
  return { px: 1 - px / PALM_IDX.length, py: py / PALM_IDX.length };
}

/** True when thumb, index, and middle tips are all pinched together */
function isPinch3(lm: NormalizedLandmarkList, prev: boolean): boolean {
  const thr = prev ? PINCH3_EXIT : PINCH3_ENTER;
  return (
    d2(lm[THUMB_TIP], lm[INDEX_TIP])  < thr &&
    d2(lm[INDEX_TIP], lm[MIDDLE_TIP]) < thr &&
    d2(lm[THUMB_TIP], lm[MIDDLE_TIP]) < thr
  );
}

/** Roll angle of the hand (wrist→middle-MCP) in mirror-flipped screen space */
function wristRollAngle(lm: NormalizedLandmarkList): number {
  const dx = -(lm[MIDDLE_MCP].x - lm[WRIST].x); // flip X for mirror
  const dy =   lm[MIDDLE_MCP].y - lm[WRIST].y;
  return Math.atan2(dy, dx);
}

interface ClassifyResult {
  gesture:    GestureMode;
  primaryIdx: number;   // index into allLm to use as the primary (controlling) hand
  fist1:      boolean;
  fist2:      boolean;
  pinch3_1:   boolean;
  pinch3_2:   boolean;
}

function classifyGesture(
  allLm: NormalizedLandmarkList[],
  prevFist1: boolean,
  prevFist2: boolean,
  prevPinch3_1: boolean,
  prevPinch3_2: boolean,
): ClassifyResult {
  if (allLm.length === 0) {
    return { gesture: 'none', primaryIdx: 0, fist1: false, fist2: false, pinch3_1: false, pinch3_2: false };
  }

  const fist1    = isFist(allLm[0], prevFist1);
  const fist2    = allLm.length >= 2 ? isFist(allLm[1], prevFist2) : false;
  // pinch3 only fires when the hand is not already a fist
  const pinch3_1 = !fist1 && isPinch3(allLm[0], prevPinch3_1);
  const pinch3_2 = allLm.length >= 2 && !fist2 && isPinch3(allLm[1], prevPinch3_2);

  // Both fists → two-hand scale/zoom mode
  if (allLm.length >= 2 && fist1 && fist2) return { gesture: 'scale',  primaryIdx: 0, fist1, fist2, pinch3_1, pinch3_2 };
  // Fist(s) → grab
  if (fist1) return { gesture: 'grab',   primaryIdx: 0, fist1, fist2, pinch3_1, pinch3_2 };
  if (fist2) return { gesture: 'grab',   primaryIdx: 1, fist1, fist2, pinch3_1, pinch3_2 };
  // Three-finger pinch → select & move
  if (pinch3_1) return { gesture: 'pinch3', primaryIdx: 0, fist1, fist2, pinch3_1, pinch3_2 };
  if (pinch3_2) return { gesture: 'pinch3', primaryIdx: 1, fist1, fist2, pinch3_1, pinch3_2 };
  // Open hand
  return { gesture: 'idle', primaryIdx: 0, fist1, fist2, pinch3_1, pinch3_2 };
}

const EMPTY_STATE: HandState = {
  detected: false,
  gesture: 'none',
  palmX: 0.5, palmY: 0.5,
  palmX2: 0,  palmY2: 0,
  wristAngle: 0,
  pinchDistance: 1,
  confidence: 0,
  landmarks: null,
  allLandmarks: [],
  handsDetected: 0,
};

export class HandTracker {
  private handsInstance: InstanceType<typeof Hands>;
  private cameraInstance: InstanceType<typeof Camera>;
  private callback: HandCallback;
  private lastState: HandState;
  private prevFist1    = false;
  private prevFist2    = false;
  private prevPinch3_1 = false;
  private prevPinch3_2 = false;

  constructor(videoEl: HTMLVideoElement, callback: HandCallback) {
    this.callback = callback;
    this.lastState = { ...EMPTY_STATE };

    const config: HandsConfig = {
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    };

    this.handsInstance = new Hands(config);

    const options: HandsOptions = {
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.4,
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
      this.lastState = { ...EMPTY_STATE };
      this.prevFist1    = false;
      this.prevFist2    = false;
      this.prevPinch3_1 = false;
      this.prevPinch3_2 = false;
      this.callback(this.lastState);
      return;
    }

    const allLm = results.multiHandLandmarks;

    const { gesture, primaryIdx, fist1, fist2, pinch3_1, pinch3_2 } = classifyGesture(
      allLm, this.prevFist1, this.prevFist2, this.prevPinch3_1, this.prevPinch3_2,
    );
    // Track per-hand states independently so hysteresis works correctly
    this.prevFist1    = fist1;
    this.prevFist2    = fist2;
    this.prevPinch3_1 = pinch3_1;
    this.prevPinch3_2 = pinch3_2;

    // Primary hand drives position/rotation; in scale mode hand[0] is always primary
    const primaryLm = allLm[primaryIdx];
    const { px, py } = palmCenter(primaryLm);

    // Second hand palm center — used only by scale mode (always hand[1])
    let palmX2 = 0, palmY2 = 0;
    if (allLm.length >= 2) {
      const c2 = palmCenter(allLm[1]);
      palmX2 = c2.px;
      palmY2 = c2.py;
    }

    const score = results.multiHandedness?.[primaryIdx]?.score ?? results.multiHandedness?.[0]?.score ?? 1;

    this.lastState = {
      detected: true,
      gesture,
      palmX: px,
      palmY: py,
      palmX2,
      palmY2,
      wristAngle: wristRollAngle(primaryLm),
      pinchDistance: d2(primaryLm[THUMB_TIP], primaryLm[INDEX_TIP]),
      confidence: score,
      landmarks: primaryLm,
      allLandmarks: allLm,
      handsDetected: allLm.length,
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
