import type { HandState, GestureMode } from './HandTracker';

export interface ControlState {
  rotX: number;
  rotY: number;
  rotZ: number;
  fov: number;
}

const FOV_MIN = 15;
const FOV_MAX = 90;
const AUTO_ROTATE_SPEED = 0.004;
const ROTATE_SENSITIVITY = 5.5;
const TILT_SENSITIVITY = 5.5;
const PINCH_ZOOM_SENSITIVITY = 160;

export class GestureControls {
  private rotX = 0;
  private rotY = 0;
  private rotZ = 0;
  private fov = 45;

  // Tracking for delta computation
  private prevPalmX: number | null = null;
  private prevPalmY: number | null = null;
  private prevPinchDist: number | null = null;
  private prevGesture: GestureMode = 'none';
  private lockedGesture: GestureMode = 'none';
  private lockFramesLeft = 0;

  update(hand: HandState): ControlState {
    if (!hand.detected) {
      // Auto-rotate when no hand
      this.rotY += AUTO_ROTATE_SPEED;
      this.prevPalmX = null;
      this.prevPalmY = null;
      this.prevPinchDist = null;
      this.prevGesture = 'none';
      this.lockedGesture = 'none';
      this.lockFramesLeft = 0;
      return this.getState();
    }

    const rawGesture = hand.gesture;

    // Lock the gesture for a few frames after a switch to prevent rapid toggling
    if (rawGesture !== this.prevGesture) {
      this.lockedGesture = rawGesture;
      this.lockFramesLeft = 6;
    } else if (this.lockFramesLeft > 0) {
      this.lockFramesLeft--;
    }
    const gesture: GestureMode = this.lockFramesLeft > 0 ? this.lockedGesture : rawGesture;

    // Reset deltas on gesture change to avoid jumps
    if (gesture !== this.prevGesture) {
      this.prevPalmX = null;
      this.prevPalmY = null;
      this.prevPinchDist = null;
    }

    if (gesture === 'rotate') {
      if (this.prevPalmX !== null && this.prevPalmY !== null) {
        const dx = hand.palmX - this.prevPalmX;
        const dy = hand.palmY - this.prevPalmY;
        this.rotY += dx * ROTATE_SENSITIVITY;
        this.rotX += dy * ROTATE_SENSITIVITY;
      }
      this.prevPalmX = hand.palmX;
      this.prevPalmY = hand.palmY;
    } else if (gesture === 'tilt') {
      if (this.prevPalmX !== null) {
        const dx = hand.palmX - this.prevPalmX;
        this.rotZ += dx * TILT_SENSITIVITY;
      }
      this.prevPalmX = hand.palmX;
      this.prevPalmY = hand.palmY;
    } else if (gesture === 'pinch') {
      if (this.prevPinchDist !== null) {
        const delta = hand.pinchDistance - this.prevPinchDist;
        this.fov += delta * PINCH_ZOOM_SENSITIVITY;
        this.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.fov));
      }
      this.prevPinchDist = hand.pinchDistance;
    }

    this.prevGesture = gesture;
    return this.getState();
  }

  reset(): void {
    this.rotX = 0;
    this.rotY = 0;
    this.rotZ = 0;
    this.fov = 45;
    this.prevPalmX = null;
    this.prevPalmY = null;
    this.prevPinchDist = null;
    this.lockedGesture = 'none';
    this.lockFramesLeft = 0;
  }

  getState(): ControlState {
    return { rotX: this.rotX, rotY: this.rotY, rotZ: this.rotZ, fov: this.fov };
  }
}