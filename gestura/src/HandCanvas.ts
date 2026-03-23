import type { NormalizedLandmarkList } from './mediapipe-globals';

const JOINT_RADIUS = 4;
const JOINT_COLOR = 'rgba(0, 212, 255, 0.9)';
const BONE_COLOR = 'rgba(0, 180, 220, 0.6)';
const PINCH_COLOR_OPEN = 'rgba(0, 212, 255, 0.5)';
const PINCH_COLOR_CLOSED = 'rgba(255, 80, 80, 0.85)';
const PINCH_THRESHOLD = 0.07;

export class HandCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSkeleton(landmarks: NormalizedLandmarkList | null, pinchDistance: number): void {
    this.clear();
    if (!landmarks) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Flip X to match mirrored video
    const px = (lm: { x: number; y: number }) => ({
      x: (1 - lm.x) * w,
      y: lm.y * h,
    });

    const ctx = this.ctx;

    // Draw bones using global HAND_CONNECTIONS
    ctx.lineWidth = 2;
    ctx.strokeStyle = BONE_COLOR;
    for (const [start, end] of HAND_CONNECTIONS) {
      const a = px(landmarks[start]);
      const b = px(landmarks[end]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
      const p = px(landmarks[i]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, JOINT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = JOINT_COLOR;
      ctx.fill();
    }

    // Pinch indicator between thumb tip (4) and index tip (8)
    const thumbPx = px(landmarks[4]);
    const indexPx = px(landmarks[8]);
    const isPinching = pinchDistance < PINCH_THRESHOLD;
    const midX = (thumbPx.x + indexPx.x) / 2;
    const midY = (thumbPx.y + indexPx.y) / 2;
    const distPx = Math.hypot(thumbPx.x - indexPx.x, thumbPx.y - indexPx.y);

    // Dashed or solid line
    ctx.lineWidth = isPinching ? 3 : 1.5;
    ctx.strokeStyle = isPinching ? PINCH_COLOR_CLOSED : PINCH_COLOR_OPEN;
    ctx.setLineDash(isPinching ? [] : [6, 4]);
    ctx.beginPath();
    ctx.moveTo(thumbPx.x, thumbPx.y);
    ctx.lineTo(indexPx.x, indexPx.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pinch zone circle
    const circleR = Math.max(8, distPx / 2);
    ctx.beginPath();
    ctx.arc(midX, midY, circleR, 0, Math.PI * 2);
    ctx.strokeStyle = isPinching ? PINCH_COLOR_CLOSED : PINCH_COLOR_OPEN;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glow on fingertips
    for (const tipIdx of [4, 8, 12, 16, 20]) {
      const p = px(landmarks[tipIdx]);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
      grad.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
}
