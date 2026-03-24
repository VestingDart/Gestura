// v2 — multi-object, inertia, snap, camera zoom
import type { HandState, GestureMode } from './HandTracker';

interface ObjectState {
  posX: number; posY: number;
  rotX: number; rotY: number; rotZ: number;
  velX: number; velY: number; velRotZ: number;
}

function newObject(posX = 0, posY = 0): ObjectState {
  return { posX, posY, rotX: 0, rotY: 0, rotZ: 0, velX: 0, velY: 0, velRotZ: 0 };
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

export interface ControlState {
  objects: { posX: number; posY: number; rotX: number; rotY: number; rotZ: number }[];
  activeIndex: number;
  fov: number;
}

const AUTO_ROTATE_SPEED    = 0.004;
const MOVE_SENSITIVITY     = 4.0;
const ROLL_SENSITIVITY     = 0.8;
const TWO_HAND_ROTATE_SENS = 1.0;
const FOV_ZOOM_SENSITIVITY = 120;
const INERTIA_DECAY        = 0.72;   // fast decay → minimal glide
const INERTIA_VEL_CAP      = 0.04;   // max velocity per frame (scene units)
const FOV_MIN              = 15;
const FOV_MAX              = 90;
const MAX_OBJECTS          = 3;
const SNAP_DOUBLE_TAP_MS   = 450;
// 5 * tan(22.5°) — approximate half-height of viewport at z=0 with camera at z=5, fov=45
const VIEW_HALF_H          = 2.071;

const SPAWN_POSITIONS: [number, number][] = [[0, 0], [-2.8, 0.5], [2.8, -0.5]];

export class GestureControls {
  private objects: ObjectState[] = [newObject()];
  private fov         = 45;
  private activeIndex = 0;

  private prevPalmX:      number | null = null;
  private prevPalmY:      number | null = null;
  private prevWristAngle: number | null = null;
  private prevDist:       number | null = null;
  private prevAngle:      number | null = null;

  private recentDx:    number[] = [];
  private recentDy:    number[] = [];
  private recentDRotZ: number[] = [];

  private prevGesture:   GestureMode = 'none';
  private lockedGesture: GestureMode = 'none';
  private lockFramesLeft = 0;

  private lastGrabTime  = 0;
  private prevGrabTime  = 0;
  private inertiaEnabled = true;

  get objectCount(): number { return this.objects.length; }

  setInertia(enabled: boolean): void { this.inertiaEnabled = enabled; }
  get inertia(): boolean { return this.inertiaEnabled; }

  addObject(): void {
    if (this.objects.length >= MAX_OBJECTS) return;
    const [px, py] = SPAWN_POSITIONS[this.objects.length] ?? [0, 0];
    this.objects.push(newObject(px, py));
  }

  removeLastObject(): void {
    if (this.objects.length <= 1) return;
    this.objects.pop();
    if (this.activeIndex >= this.objects.length) {
      this.activeIndex = this.objects.length - 1;
    }
  }

  update(hand: HandState, aspect: number): ControlState {
    const rawGesture: GestureMode = hand.detected ? hand.gesture : 'none';

    // Detect grab release → capture inertia velocity
    if ((rawGesture === 'none' || rawGesture === 'idle') && this.prevGesture === 'grab') {
      const obj = this.objects[this.activeIndex];
      if (this.inertiaEnabled) {
        const cap = INERTIA_VEL_CAP;
        obj.velX    = Math.max(-cap, Math.min(cap, avg(this.recentDx)));
        obj.velY    = Math.max(-cap, Math.min(cap, avg(this.recentDy)));
        obj.velRotZ = Math.max(-cap, Math.min(cap, avg(this.recentDRotZ)));
      } else {
        obj.velX = 0; obj.velY = 0; obj.velRotZ = 0;
      }
    }

    if (rawGesture === 'none' || rawGesture === 'idle') {
      if (rawGesture === 'none') {
        for (const obj of this.objects) obj.rotY += AUTO_ROTATE_SPEED;
      }
      // Apply inertia decay to all objects
      for (const obj of this.objects) {
        obj.posX += obj.velX;
        obj.posY += obj.velY;
        obj.rotZ += obj.velRotZ;
        obj.velX    *= INERTIA_DECAY;
        obj.velY    *= INERTIA_DECAY;
        obj.velRotZ *= INERTIA_DECAY;
        if (Math.abs(obj.velX)    < 0.0005) obj.velX    = 0;
        if (Math.abs(obj.velY)    < 0.0005) obj.velY    = 0;
        if (Math.abs(obj.velRotZ) < 0.0005) obj.velRotZ = 0;
      }
      this.clearPrev();
      this.prevGesture   = rawGesture;
      this.lockedGesture = rawGesture;
      this.lockFramesLeft = 0;
      return this.getState();
    }

    // Gesture lock: prevent rapid toggling
    if (rawGesture !== this.prevGesture) {
      this.lockedGesture  = rawGesture;
      this.lockFramesLeft = 6;
    } else if (this.lockFramesLeft > 0) {
      this.lockFramesLeft--;
    }
    const gesture: GestureMode = this.lockFramesLeft > 0 ? this.lockedGesture : rawGesture;

    if (gesture !== this.prevGesture) {
      this.clearPrev();
    }

    if (gesture === 'grab') {
      // On new grab: pick nearest object, check for double-tap snap
      if (gesture !== this.prevGesture) {
        this.activeIndex = this.nearestObject(hand.palmX, hand.palmY, aspect);
        this.prevGrabTime = this.lastGrabTime;
        this.lastGrabTime = performance.now();
        if (this.lastGrabTime - this.prevGrabTime < SNAP_DOUBLE_TAP_MS) {
          this.snapActive();
        }
        // Reset velocity and tracking for this grab
        const obj = this.objects[this.activeIndex];
        obj.velX = 0; obj.velY = 0; obj.velRotZ = 0;
        this.recentDx    = [];
        this.recentDy    = [];
        this.recentDRotZ = [];
      }

      const obj = this.objects[this.activeIndex];

      if (this.prevPalmX !== null && this.prevPalmY !== null) {
        const dx    = hand.palmX - this.prevPalmX;
        const dy    = hand.palmY - this.prevPalmY;
        const moveX = dx * MOVE_SENSITIVITY;
        const moveY = -dy * MOVE_SENSITIVITY;
        obj.posX += moveX;
        obj.posY += moveY;
        this.recentDx.push(moveX);
        this.recentDy.push(moveY);
        if (this.recentDx.length > 4) this.recentDx.shift();
        if (this.recentDy.length > 4) this.recentDy.shift();
      }
      if (this.prevWristAngle !== null) {
        let dAngle = hand.wristAngle - this.prevWristAngle;
        if (dAngle >  Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        const dRotZ = dAngle * ROLL_SENSITIVITY;
        obj.rotZ += dRotZ;
        this.recentDRotZ.push(dRotZ);
        if (this.recentDRotZ.length > 4) this.recentDRotZ.shift();
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
        this.prevDist  !== null && this.prevAngle !== null &&
        this.prevPalmX !== null && this.prevPalmY !== null
      ) {
        // Distance delta → camera FOV zoom (apart = zoom in = smaller FOV)
        const dDist = dist - this.prevDist;
        this.fov -= dDist * FOV_ZOOM_SENSITIVITY;
        this.fov = Math.max(FOV_MIN, Math.min(FOV_MAX, this.fov));

        // Angle delta → Y rotation of active object (steering wheel)
        const obj = this.objects[this.activeIndex];
        let dAngle = angle - this.prevAngle;
        if (dAngle >  Math.PI) dAngle -= 2 * Math.PI;
        if (dAngle < -Math.PI) dAngle += 2 * Math.PI;
        obj.rotY += dAngle * TWO_HAND_ROTATE_SENS;

        // Average position delta → object XY
        const dx = avgX - this.prevPalmX;
        const dy = avgY - this.prevPalmY;
        obj.posX += dx * MOVE_SENSITIVITY;
        obj.posY -= dy * MOVE_SENSITIVITY;
      }
      this.prevDist  = dist;
      this.prevAngle = angle;
      this.prevPalmX = avgX;
      this.prevPalmY = avgY;
    }

    this.prevGesture = gesture;
    return this.getState();
  }

  private nearestObject(palmX: number, palmY: number, aspect: number): number {
    const halfW = VIEW_HALF_H * aspect;
    const wx = (palmX - 0.5) * 2 * halfW;
    const wy = (0.5 - palmY) * 2 * VIEW_HALF_H;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < this.objects.length; i++) {
      const d = Math.hypot(this.objects[i].posX - wx, this.objects[i].posY - wy);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  private snapActive(): void {
    const obj = this.objects[this.activeIndex];
    obj.posX = 0; obj.posY = 0;
    obj.rotX = 0; obj.rotY = 0; obj.rotZ = 0;
    obj.velX = 0; obj.velY = 0; obj.velRotZ = 0;
  }

  private clearPrev(): void {
    this.prevPalmX      = null;
    this.prevPalmY      = null;
    this.prevWristAngle = null;
    this.prevDist       = null;
    this.prevAngle      = null;
    this.recentDx       = [];
    this.recentDy       = [];
    this.recentDRotZ    = [];
  }

  reset(): void {
    this.objects        = [newObject()];
    this.fov            = 45;
    this.activeIndex    = 0;
    this.lastGrabTime   = 0;
    this.prevGrabTime   = 0;
    this.clearPrev();
    this.prevGesture    = 'none';
    this.lockedGesture  = 'none';
    this.lockFramesLeft = 0;
  }

  getState(): ControlState {
    return {
      objects: this.objects.map(o => ({
        posX: o.posX, posY: o.posY,
        rotX: o.rotX, rotY: o.rotY, rotZ: o.rotZ,
      })),
      activeIndex: this.activeIndex,
      fov: this.fov,
    };
  }
}
