import './style.css';
import { HandTracker } from './HandTracker';
import type { HandState } from './HandTracker';
import { Scene3D } from './Scene3D';
import { GestureControls } from './GestureControls';
import { HandCanvas } from './HandCanvas';
import { UI } from './ui';

// Local type mirrors GestureControls.ControlState — defined here to bypass stale TS-server cache
interface Ctrl {
  objects:     { posX: number; posY: number; rotX: number; rotY: number; rotZ: number }[];
  activeIndex: number;
  fov:         number;
}
interface Controls {
  update(hand: HandState, aspect: number): Ctrl;
  getState(): Ctrl;
  reset(): void;
  addObject(): void;
  setInertia(enabled: boolean): void;
  readonly objectCount: number;
  readonly inertia: boolean;
}

// ── Element references ──────────────────────────────────────────────────────
const videoEl       = document.getElementById('webcam')        as HTMLVideoElement;
const handCanvasEl  = document.getElementById('hand-canvas')   as HTMLCanvasElement;
const threeCanvasEl = document.getElementById('three-canvas')  as HTMLCanvasElement;

// ── Subsystems ───────────────────────────────────────────────────────────────
const scene      = new Scene3D(threeCanvasEl);
const handCanvas = new HandCanvas(handCanvasEl);
const controls   = new GestureControls() as unknown as Controls;
const ui         = new UI();

// ── UI wiring ────────────────────────────────────────────────────────────────
ui.onShapeChange = (shape) => {
  scene.setObjectShape(controls.getState().activeIndex, shape);
};
ui.onColorChange = (color) => {
  scene.setObjectColor(controls.getState().activeIndex, color);
};
ui.onAddObject = () => {
  if (controls.objectCount >= 3) return;
  const colorSelect = document.getElementById('color-select') as HTMLSelectElement;
  const shapeSelect = document.getElementById('shape-select') as HTMLSelectElement;
  controls.addObject();
  scene.addObject(shapeSelect.value as any, colorSelect.value);
};
const inertiaBtn = document.getElementById('inertia-btn') as HTMLButtonElement;
inertiaBtn.addEventListener('click', () => {
  const next = !controls.inertia;
  controls.setInertia(next);
  inertiaBtn.textContent  = next ? 'GLIDE: ON' : 'GLIDE: OFF';
  inertiaBtn.classList.toggle('active', next);
});

ui.onReset = () => {
  controls.reset();
  while (scene.objectCount > 1) scene.removeObject(scene.objectCount - 1);
  const state = controls.getState();
  scene.updateObjects(state.objects);
  scene.setFov(state.fov);
};

// ── Hand state ───────────────────────────────────────────────────────────────
let currentHand: HandState = {
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

new HandTracker(videoEl, (state) => { currentHand = state; });

// ── Render loop ───────────────────────────────────────────────────────────────
function loop(): void {
  const aspect = window.innerWidth / window.innerHeight;
  const ctrl   = controls.update(currentHand, aspect);

  scene.updateObjects(ctrl.objects);
  scene.setFov(ctrl.fov);
  scene.render();

  handCanvas.drawSkeleton(currentHand.allLandmarks, currentHand.gesture, currentHand.landmarks);
  ui.update(currentHand, ctrl.activeIndex, controls.objectCount);

  requestAnimationFrame(loop);
}

const colorSelect = document.getElementById('color-select') as HTMLSelectElement;
scene.setObjectColor(0, colorSelect.value);

loop();
