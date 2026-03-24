import type { NormalizedLandmarkList } from './mediapipe-globals';

type GestureMode = 'none' | 'idle' | 'grab' | 'scale';

// ── Gesture colour palette (must match CSS variables) ────────────────────────
const COLORS = {
  idle:  { joint: 'rgba(136, 153, 204, 0.9)', bone: 'rgba(100, 120, 180, 0.55)', glow: 'rgba(136, 153, 204, 0.35)' },
  grab:  { joint: 'rgba(255, 149,   0, 0.9)', bone: 'rgba(220, 120,   0, 0.55)', glow: 'rgba(255, 149,   0, 0.38)' },
  scale: { joint: 'rgba( 68, 255, 136, 0.9)', bone: 'rgba( 50, 210, 100, 0.55)', glow: 'rgba( 68, 255, 136, 0.35)' },
} as const;

const JOINT_RADIUS = 4;
const PALM_IDX     = [0, 1, 5, 9, 13, 17];

function gestureColors(gesture: GestureMode) {
  if (gesture === 'grab')  return COLORS.grab;
  if (gesture === 'scale') return COLORS.scale;
  return COLORS.idle;
}

export class HandCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSkeleton(
    allLandmarks: NormalizedLandmarkList[],
    gesture: GestureMode,
    primaryLm: NormalizedLandmarkList | null,
  ): void {
    this.clear();
    if (allLandmarks.length === 0) return;

    for (const lm of allLandmarks) {
      // When one hand grabs and the other is idle, color the idle hand differently
      const handGesture =
        gesture === 'grab' && allLandmarks.length >= 2 && lm !== primaryLm
          ? 'idle'
          : gesture;
      this.drawHand(lm, handGesture);
    }

    if (gesture === 'scale' && allLandmarks.length >= 2) {
      this.drawScaleBridge(allLandmarks[0], allLandmarks[1]);
    }
  }

  private palmScreenPos(lm: NormalizedLandmarkList): { x: number; y: number } {
    const w = this.canvas.width, h = this.canvas.height;
    let px = 0, py = 0;
    for (const i of PALM_IDX) { px += lm[i].x; py += lm[i].y; }
    return { x: (1 - px / PALM_IDX.length) * w, y: (py / PALM_IDX.length) * h };
  }

  private drawHand(landmarks: NormalizedLandmarkList, gesture: GestureMode): void {
    const w   = this.canvas.width, h = this.canvas.height;
    const col = gestureColors(gesture);
    const ctx = this.ctx;

    // Flip X to match mirrored video
    const px = (lm: { x: number; y: number }) => ({ x: (1 - lm.x) * w, y: lm.y * h });

    // Bones
    ctx.lineWidth   = gesture === 'idle' ? 2 : 2.5;
    ctx.strokeStyle = col.bone;
    for (const [start, end] of HAND_CONNECTIONS) {
      const a = px(landmarks[start]);
      const b = px(landmarks[end]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = px(landmarks[i]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = col.joint;
      ctx.fill();
    }

    // Fingertip glow
    for (const tipIdx of [4, 8, 12, 16, 20]) {
      const p    = px(landmarks[tipIdx]);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14);
      grad.addColorStop(0, col.glow);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Active ring around palm
    if (gesture === 'grab' || gesture === 'scale') {
      const center = this.palmScreenPos(landmarks);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 28, 0, Math.PI * 2);
      ctx.strokeStyle = col.joint;
      ctx.lineWidth   = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawScaleBridge(lm1: NormalizedLandmarkList, lm2: NormalizedLandmarkList): void {
    const c1  = this.palmScreenPos(lm1);
    const c2  = this.palmScreenPos(lm2);
    const col = COLORS.scale;
    const ctx = this.ctx;

    ctx.beginPath();
    ctx.moveTo(c1.x, c1.y);
    ctx.lineTo(c2.x, c2.y);
    ctx.strokeStyle = col.bone;
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const mx = (c1.x + c2.x) / 2;
    const my = (c1.y + c2.y) / 2;
    const r  = Math.hypot(c2.x - c1.x, c2.y - c1.y) / 2;
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(68, 255, 136, 0.18)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
  }
}
