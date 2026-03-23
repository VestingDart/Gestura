import './style.css';
import { HandTracker } from './HandTracker';
import type { HandState } from './HandTracker';
import { Scene3D } from './Scene3D';
import { GestureControls } from './GestureControls';
import { HandCanvas } from './HandCanvas';
import { UI } from './ui';

// ── Element references ──────────────────────────────────────────────────────
const videoEl = document.getElementById('webcam') as HTMLVideoElement;
const handCanvasEl = document.getElementById('hand-canvas') as HTMLCanvasElement;
const threeCanvasEl = document.getElementById('three-canvas') as HTMLCanvasElement;

// ── Subsystems ───────────────────────────────────────────────────────────────
const scene = new Scene3D(threeCanvasEl);
const handCanvas = new HandCanvas(handCanvasEl);
const controls = new GestureControls();
const ui = new UI();

// ── UI wiring ────────────────────────────────────────────────────────────────
ui.onShapeChange = (shape) => scene.setShape(shape);
ui.onColorChange = (color) => scene.setColor(color);
ui.onReset = () => {
  controls.reset();
  const state = controls.getState();
  scene.setRotation(state.rotX, state.rotY, state.rotZ);
  scene.setZoom(state.fov);
};

// ── Hand state ───────────────────────────────────────────────────────────────
let currentHand: HandState = {
  detected: false,
  gesture: 'none',
  palmX: 0.5,
  palmY: 0.5,
  pinchDistance: 1,
  confidence: 0,
  landmarks: null,
};

// Start hand tracking (side-effectful — tracker drives currentHand via callback)
new HandTracker(videoEl, (state) => {
  currentHand = state;
});

// ── Render loop ───────────────────────────────────────────────────────────────
function loop(): void {
  const ctrl = controls.update(currentHand);
  scene.setRotation(ctrl.rotX, ctrl.rotY, ctrl.rotZ);
  scene.setZoom(ctrl.fov);
  scene.render();

  handCanvas.drawSkeleton(currentHand.landmarks, currentHand.pinchDistance);
  ui.update(currentHand);

  requestAnimationFrame(loop);
}

// Initialise with default color from the select
const colorSelect = document.getElementById('color-select') as HTMLSelectElement;
scene.setColor(colorSelect.value);

loop();
