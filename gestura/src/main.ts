import './style.css';
import { HandTracker } from './HandTracker';
import type { HandState } from './HandTracker';
import { Scene3D } from './Scene3D';
import { GestureControls } from './GestureControls';
import { HandCanvas } from './HandCanvas';
import { UI } from './ui';

// ── Element references ──────────────────────────────────────────────────────
const videoEl      = document.getElementById('webcam')       as HTMLVideoElement;
const handCanvasEl = document.getElementById('hand-canvas')  as HTMLCanvasElement;
const threeCanvasEl = document.getElementById('three-canvas') as HTMLCanvasElement;

// ── Subsystems ───────────────────────────────────────────────────────────────
const scene    = new Scene3D(threeCanvasEl);
const handCanvas = new HandCanvas(handCanvasEl);
const controls = new GestureControls();
const ui       = new UI();

// ── UI wiring ────────────────────────────────────────────────────────────────
ui.onShapeChange = (shape) => scene.setShape(shape);
ui.onColorChange = (color) => scene.setColor(color);
ui.onReset = () => {
  controls.reset();
  const state = controls.getState();
  scene.setPosition(state.posX, state.posY);
  scene.setRotation(state.rotX, state.rotY, state.rotZ);
  scene.setScale(state.scale);
};

// ── Hand state ───────────────────────────────────────────────────────────────
let currentHand: HandState = {
  detected: false,
  gesture: 'none',
  palmX: 0.5,  palmY: 0.5,
  palmX2: 0,   palmY2: 0,
  wristAngle: 0,
  pinchDistance: 1,
  confidence: 0,
  landmarks: null,
  allLandmarks: [],
  handsDetected: 0,
};

// Start hand tracking (side-effectful — tracker drives currentHand via callback)
new HandTracker(videoEl, (state) => {
  currentHand = state;
});

// ── Render loop ───────────────────────────────────────────────────────────────
function loop(): void {
  const ctrl = controls.update(currentHand);
  scene.setPosition(ctrl.posX, ctrl.posY);
  scene.setRotation(ctrl.rotX, ctrl.rotY, ctrl.rotZ);
  scene.setScale(ctrl.scale);
  scene.render();

  handCanvas.drawSkeleton(currentHand.allLandmarks, currentHand.gesture);
  ui.update(currentHand);

  requestAnimationFrame(loop);
}

// Initialise with default color from the select
const colorSelect = document.getElementById('color-select') as HTMLSelectElement;
scene.setColor(colorSelect.value);

loop();
