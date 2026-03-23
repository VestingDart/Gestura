# Gestura

> **Note: This project is still in early development. Many features are not yet finished and things may change significantly.**

Gestura is a web-based 3D app that uses your webcam to detect hand gestures and control an interactive 3D scene. Using MediaPipe (Google), your hand movements are tracked in real time and mapped to a 3D object rendered in the browser.

---

## Features

- Real-time hand tracking via webcam (MediaPipe)
- 3D objects rendered and controlled with Three.js
- Hand skeleton overlay visualized on a canvas
- Multiple 3D shapes to choose from (cube, sphere, torus, ...)
- Adjustable object color

## Gesture Controls

| Gesture | Action |
|---|---|
| Open hand | Rotate object on X/Y axis |
| Pinch (thumb + index finger) | Zoom in/out |
| Index finger only | Tilt object on Z axis |
| No hand detected | Object auto-rotates |

---

## Tech Stack

- **Vite** + **TypeScript**
- **Three.js** — 3D rendering
- **MediaPipe Hands** — ML-based hand tracking

---

## Requirements

- [Node.js](https://nodejs.org/) (includes npm)
- Webcam
- Modern browser with WebGL and camera support (Chrome recommended)

---

## Installation & Setup

```bash
# Navigate to the project folder
cd gestura

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173`) and allow camera access.

### Other Commands

```bash
# Create a production build
npm run build

# Preview the production build locally
npm run preview
```

---

## Project Structure

```
Gestura/
└── gestura/
    ├── public/
    │   └── mediapipe/         # MediaPipe library files
    └── src/
        ├── main.ts            # Entry point, render loop
        ├── HandTracker.ts     # Gesture detection & landmark processing
        ├── Scene3D.ts         # Three.js scene & 3D objects
        ├── GestureControls.ts # Gestures → camera/rotation controls
        ├── HandCanvas.ts      # Hand skeleton canvas overlay
        └── ui.ts              # UI panel & event handlers
```

---

## Status

The project is still at a very early stage. Basic gesture recognition and 3D controls are working. Planned features have not been implemented yet.

---

## License

No license defined yet.
