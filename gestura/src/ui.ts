import type { HandState } from './HandTracker';
import type { ShapeName } from './Scene3D';

const GESTURE_LABELS: Record<string, string> = {
  rotate: 'ROTATE X/Y',
  pinch: 'ZOOM',
  tilt: 'TILT Z',
  none: 'AUTO-ROTATE',
};

export class UI {
  private handEl: HTMLElement;
  private gestureEl: HTMLElement;
  private confidenceEl: HTMLElement;
  private shapeSelect: HTMLSelectElement;
  private colorSelect: HTMLSelectElement;
  private resetBtn: HTMLButtonElement;

  onShapeChange?: (shape: ShapeName) => void;
  onColorChange?: (color: string) => void;
  onReset?: () => void;

  constructor() {
    this.handEl = document.getElementById('status-hand')!;
    this.gestureEl = document.getElementById('status-gesture')!;
    this.confidenceEl = document.getElementById('status-confidence')!;
    this.shapeSelect = document.getElementById('shape-select') as HTMLSelectElement;
    this.colorSelect = document.getElementById('color-select') as HTMLSelectElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    this.shapeSelect.addEventListener('change', () => {
      this.onShapeChange?.(this.shapeSelect.value as ShapeName);
    });

    this.colorSelect.addEventListener('change', () => {
      this.onColorChange?.(this.colorSelect.value);
    });

    this.resetBtn.addEventListener('click', () => {
      this.onReset?.();
    });
  }

  update(hand: HandState): void {
    if (hand.detected) {
      this.handEl.textContent = hand.handsDetected === 2 ? 'DETECTED (x2)' : 'DETECTED';
      this.handEl.classList.remove('off');
      this.handEl.classList.add('on');
      this.gestureEl.textContent = GESTURE_LABELS[hand.gesture] ?? hand.gesture.toUpperCase();
      this.confidenceEl.textContent = (hand.confidence * 100).toFixed(0) + '%';
    } else {
      this.handEl.textContent = 'NOT DETECTED';
      this.handEl.classList.remove('on');
      this.handEl.classList.add('off');
      this.gestureEl.textContent = 'AUTO-ROTATE';
      this.confidenceEl.textContent = '--';
    }
  }
}