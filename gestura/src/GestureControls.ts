import type { HandState, GestureMode } from './HandTracker';

export interface ControlState {
  posX: number;
  posY: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  scale: number;
}

const AUTO_ROTATE_SPEED         = 0.004;
const MOVE_SENSITIVITY          = 4.0;   // scene units per normalized screen unit
const ROLL_SENSITIVITY          = 0.8;   // wrist roll → Z rotation
const SCALE_SENSITIVITY         = 2.0;   // hand distance delta → scale multiplier
const TWO_HAND_ROTATE_SENS      = 1.0;   // two-hand angle delta → Y rotation
const SCALE_MIN                 = 0.15;
const SCALE_MAX                 = 4.0;

export class GestureControls {
  private posX  = 0;
  private posY  = 0;
  private rotX  = 0;
  private rotY  = 0;
  private rotZ  = 0;
  private scale = 1;

  private prevPalmX:     number | null = null;
  private prevPalmY:     number | null = null;
  private prevWristAngle: number | null = null;
  private prevDist:      number | null = null;
  private prevAngle:     number | null = null;

  private prevGesture:   GestureMode = 'none';
  private lockedGesture: GestureMode = 'none';
  private lockFramesLeft = 0;

  update(hand: HandState): ControlState {
    const rawGesture: GestureMode = hand.detected ? hand.gesture : 'none';

    // No hand or open hand → auto-rotate / idle
    if (rawGesture === 'none' || rawGesture === 'idle') {
      if (rawGesture === 'none') this.rotY += AUTO_ROTATE_SPEED;
      this.clearPrev();
      this.prevGesture   = rawGesture;
      this.lockedGesture = rawGesture;
      this.lockFramesLeft = 0;
      return this.getState();
    }

    // Gesture lock: prevent rapid toggling on switch
    if (rawGesture !== this.prevGesture) {
      this.lockedGesture  = rawGesture;
      this.lockFramesLeft = 6;
    } else if (this.lockFramesLeft > 0) {
      this.lockFramesLeft--;
    }
    const gesture: GestureMode = this.lockFramesLeft > 0 ? this.lockedGesture : rawGesture;

    // Reset deltas when gesture changes to avoid jumps
    if (gesture !== this.prevGesture) {
      this.clearPrev();
    }

    if (gesture === 'grab') {
      // Palm XY delta → object position
      if (this.prevPalmX !== null && this.prevPalmY !== null) {
        const dx = hand.palmX - this.prevPalmX;
        const dy = hand.palmY - this.prevPalmY;
        this.posX += dx * MOVE_SENSITIVITY;
        this.posY -= dy * MOVE_SENSITIVITY; // screen Y is inverted
      }
      // Wrist roll angle delta → Z rotation
      if (this.prevWristAngle !== null) {
        let dAngle = hand.wristAngle - this.prevWristAngle;
        if (dAngle >  Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        this.rotZ += dAngle * ROLL_SENSITIVITY;
      }
      this.prevPalmX      = hand.palmX;
      this.prevPalmY      = hand.palmY;
      this.prevWristAngle = hand.wristAngle;

    } else if (gesture === 'scale') {
      const dist  = Math.hypot(hand.palmX2 - hand.palmX, hand.palmY2 - hand.palmY);
      const angle = Math.atan2(hand.palmY2 - hand.palmY, hand.palmX2 - hand.palmX);
      const avgX  = (hand.palmX + hand.palmX2) / 2;
      const avgY  = (hand.palmY + hand.palmY2) / 2;

      if (
        this.prevDist  !== null &&
        this.prevAngle !== null &&
        this.prevPalmX !== null &&
        this.prevPalmY !== null
      ) {
        // Distance delta → scale
        const dDist = dist - this.prevDist;
        this.scale *= (1 + dDist * SCALE_SENSITIVITY);
        this.scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, this.scale));

        // Angle delta (steering wheel) → Y rotation
        let dAngle = angle - this.prevAngle;
        if (dAngle >  Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        this.rotY += dAngle * TWO_HAND_ROTATE_SENS;

        // Average position delta → object XY
        const dx = avgX - this.prevPalmX;
        const dy = avgY - this.prevPalmY;
        this.posX += dx * MOVE_SENSITIVITY;
        this.posY -= dy * MOVE_SENSITIVITY;
      }
      this.prevDist  = dist;
      this.prevAngle = angle;
      this.prevPalmX = avgX;
      this.prevPalmY = avgY;
    }

    this.prevGesture = gesture;
    return this.getState();
  }

  private clearPrev(): void {
    this.prevPalmX      = null;
    this.prevPalmY      = null;
    this.prevWristAngle = null;
    this.prevDist       = null;
    this.prevAngle      = null;
  }

  reset(): void {
    this.posX  = 0;
    this.posY  = 0;
    this.rotX  = 0;
    this.rotY  = 0;
    this.rotZ  = 0;
    this.scale = 1;
    this.clearPrev();
    this.prevGesture    = 'none';
    this.lockedGesture  = 'none';
    this.lockFramesLeft = 0;
  }

  getState(): ControlState {
    return {
      posX:  this.posX,
      posY:  this.posY,
      rotX:  this.rotX,
      rotY:  this.rotY,
      rotZ:  this.rotZ,
      scale: this.scale,
    };
  }
}
