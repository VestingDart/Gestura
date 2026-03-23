# Gestura

> **Hinweis: Dieses Projekt befindet sich noch in der frühen Entwicklungsphase. Viele Features sind noch nicht fertig oder können sich noch stark verändern.**

Gestura ist eine webbasierte 3D-App, die deine Webcam nutzt, um Handgesten zu erkennen und damit eine interaktive 3D-Szene zu steuern. Mithilfe von MediaPipe (Google) werden deine Handbewegungen in Echtzeit getrackt und auf ein 3D-Objekt übertragen, das du im Browser siehst.

---

## Features

- Echtzeit-Handerkennung via Webcam (MediaPipe)
- 3D-Objekte mit Three.js rendern und per Geste steuern
- Visualisierung des Hand-Skeletts als Canvas-Overlay
- Verschiedene 3D-Formen wählbar (Würfel, Kugel, Torus, ...)
- Farbe des Objekts anpassbar

## Gesten-Steuerung

| Geste | Aktion |
|---|---|
| Offene Hand | Objekt in X/Y-Achse rotieren |
| Pinch (Daumen + Zeigefinger) | Zoom rein/raus |
| Nur Zeigefinger ausgestreckt | Z-Achse kippen |
| Keine Hand erkannt | Objekt dreht sich automatisch |

---

## Tech Stack

- **Vite** + **TypeScript**
- **Three.js** — 3D-Rendering
- **MediaPipe Hands** — Handerkennung via ML

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) (inkl. npm)
- Webcam
- Moderner Browser mit WebGL- und Kamera-Unterstützung (Chrome empfohlen)

---

## Installation & Start

```bash
# In den Projektordner wechseln
cd gestura

# Abhängigkeiten installieren
npm install

# Dev-Server starten
npm run dev
```

Danach die angezeigte URL (z.B. `http://localhost:5173`) im Browser öffnen und Kamerazugriff erlauben.

### Weitere Befehle

```bash
# Produktions-Build erstellen
npm run build

# Produktions-Build lokal vorschauen
npm run preview
```

---

## Projektstruktur

```
Gestura/
└── gestura/
    ├── public/
    │   └── mediapipe/       # MediaPipe Library-Dateien
    └── src/
        ├── main.ts          # Einstiegspunkt, Render-Loop
        ├── HandTracker.ts   # Gestenerkennung & Landmark-Verarbeitung
        ├── Scene3D.ts       # Three.js Szene & 3D-Objekte
        ├── GestureControls.ts # Gesten → Kamera/Rotations-Steuerung
        ├── HandCanvas.ts    # Hand-Skelett als Canvas-Overlay
        └── ui.ts            # UI-Panel & Event-Handler
```

---

## Status

Das Projekt steht noch ganz am Anfang. Aktuell funktioniert die grundlegende Gestenerkennung und 3D-Steuerung. Geplante Erweiterungen sind noch nicht umgesetzt.

---

## Lizenz

Noch keine Lizenz festgelegt.
