<p align="center">
  <img src="public/assets/brand/trackdraw-logo-color-darkbg.svg" alt="TrackDraw" width="320" />
</p>

A browser-based FPV drone racing track designer. Draw gates, flags, cones and other obstacles on a true-to-scale 2D canvas, preview the result in 3D, and share your design with a single link.

## Features

- **2D canvas editor** — place and manipulate 9 shape types: gates, flags, cones, labels, polylines, start/finish lines, checkpoints, ladders and dive gates
- **True-to-scale grid** — configurable field dimensions and pixels-per-meter ratio
- **3D preview** — real-time Three.js render of the track from a drone perspective
- **Elevation chart** — altitude profile visualisation along polyline paths
- **Undo / redo** — full history via Zustand temporal middleware (zundo)
- **Export** — download as PNG, SVG or PDF
- **Shareable URLs** — designs are LZ-compressed and embedded in the URL; a QR code is generated automatically
- **Import** — load a previously exported design file

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui v4 (`@base-ui/react`) |
| 2D canvas | Konva 10 + react-konva |
| 3D preview | Three.js 0.175 + @react-three/fiber + drei |
| State | Zustand 5 + zundo 2 (temporal) + Immer |
| Export | jsPDF, Konva stage snapshots |
| Sharing | lz-string |
| Icons | Lucide React |
| Validation | Zod |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The landing page is at `/`, the editor at `/studio`, and shared tracks are served from `/share?d=[token]`.


## Project structure

```
src/
├── app/              # Next.js pages (/, /studio, /share)
├── components/       # React components
│   ├── EditorShell   # Layout orchestrator
│   ├── TrackCanvas   # Konva 2D editor (~1100 lines)
│   ├── Inspector     # Shape properties panel
│   ├── TrackPreview3D
│   ├── ElevationChart / ElevationPanel
│   ├── Header / Toolbar / StatusBar
│   ├── ExportDialog / ImportDialog / ShareDialog
│   ├── landing/      # Marketing page components
│   └── ui/           # @base-ui/react wrappers
├── store/
│   └── editor.ts     # Single Zustand store with temporal history
├── hooks/            # useUndoRedo, useTheme, useShareUrl
└── lib/
    ├── geometry.ts   # Distance, Catmull-Rom smoothing, elevation sampling
    ├── share.ts      # LZ-string encode/decode
    ├── export/       # PNG / SVG / PDF export
    ├── types.ts      # Shape union types, TrackDesign, FieldSpec
    └── units.ts      # Unit conversion helpers
```

## Available scripts

```bash
npm run dev    # Development server (Turbopack)
npm run build  # Production build
npm run start  # Start production server
npm run lint   # ESLint
```
