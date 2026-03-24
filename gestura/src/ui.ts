import type { HandState } from './HandTracker';
import type { ShapeName } from './Scene3D';

const GESTURE_LABELS: Record<string, string> = {
  idle:  'IDLE',
  grab:  'GRAB & MOVE',
  scale: 'ZOOM',
  none:  'AUTO-ROTATE',
};

const GESTURE_COLORS: Record<string, string> = {
  idle:  'var(--color-idle)',
  grab:  'var(--color-grab)',
  scale: 'var(--color-scale)',
  none:  'var(--color-none)',
};

export class UI {
  private handEl:       HTMLElement;
  private gestureEl:    HTMLElement;
  private confidenceEl: HTMLElement;
  private objectEl:     HTMLElement;
  private shapeSelect:  HTMLSelectElement;
  private colorSelect:  HTMLSelectElement;
  private resetBtn:     HTMLButtonElement;
  private addObjBtn:    HTMLButtonElement;

  onShapeChange?: (shape: ShapeName) => void;
  onColorChange?: (color: string) => void;
  onAddObject?:  () => void;
  onReset?:      () => void;

  constructor() {
    this.handEl       = document.getElementById('status-hand')!;
    this.gestureEl    = document.getElementById('status-gesture')!;
    this.confidenceEl = document.getElementById('status-confidence')!;
    this.objectEl     = document.getElementById('status-object')!;
    this.shapeSelect  = document.getElementById('shape-select') as HTMLSelectElement;
    this.colorSelect  = document.getElementById('color-select') as HTMLSelectElement;
    this.resetBtn     = document.getElementById('reset-btn')    as HTMLButtonElement;
    this.addObjBtn    = document.getElementById('add-obj-btn')  as HTMLButtonElement;

    this.shapeSelect.addEventListener('change', () => {
      this.onShapeChange?.(this.shapeSelect.value as ShapeName);
    });
    this.colorSelect.addEventListener('change', () => {
      this.onColorChange?.(this.colorSelect.value);
    });
    this.resetBtn.addEventListener('click', () => {
      this.onReset?.();
    });
    this.addObjBtn.addEventListener('click', () => {
      this.onAddObject?.();
    });
  }

  update(hand: HandState, activeIndex: number, totalObjects: number): void {
    // Object indicator
    this.objectEl.textContent = totalObjects > 1
      ? `${activeIndex + 1} / ${totalObjects}`
      : '1';

    // Add-object button visibility
    this.addObjBtn.disabled = totalObjects >= 3;
    this.addObjBtn.style.opacity = totalObjects >= 3 ? '0.4' : '1';

    if (hand.detected) {
      const handLabel = hand.handsDetected === 2 ? 'DETECTED (x2)' : 'DETECTED';
      this.handEl.textContent = handLabel;
      this.handEl.classList.remove('off');
      this.handEl.classList.add('on');
      this.gestureEl.textContent = GESTURE_LABELS[hand.gesture] ?? hand.gesture.toUpperCase();
      this.gestureEl.style.color = GESTURE_COLORS[hand.gesture] ?? 'var(--accent)';
      this.confidenceEl.textContent = (hand.confidence * 100).toFixed(0) + '%';
    } else {
      this.handEl.textContent = 'NOT DETECTED';
      this.handEl.classList.remove('on');
      this.handEl.classList.add('off');
      this.gestureEl.textContent = 'AUTO-ROTATE';
      this.gestureEl.style.color = 'var(--color-none)';
      this.confidenceEl.textContent = '--';
    }
  }
}
