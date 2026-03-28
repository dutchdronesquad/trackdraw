<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-darkbg.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg">
    <img alt="TrackDraw" src="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg" width="320">
  </picture>
</p>

<p align="center">
  <strong>Plan FPV race courses to scale, preview in 3D, share with the team.</strong>
</p>

<p align="center">
  <a href="https://github.com/dutchdronesquad/trackdraw/actions/workflows/linting.yaml"><img
    src="https://github.com/dutchdronesquad/trackdraw/actions/workflows/linting.yaml/badge.svg"
    alt="Linting"
  /></a>
  <a href="https://github.com/dutchdronesquad/trackdraw/actions/workflows/deploy-prod.yaml"><img
    src="https://github.com/dutchdronesquad/trackdraw/actions/workflows/deploy-prod.yaml/badge.svg"
    alt="Deployment"
  /></a>
  <a href="LICENSE"><img
    src="https://img.shields.io/badge/license-LGPL--3.0--or--later-blue"
    alt="License"
  /></a>
</p>

<p align="center">
  <a href="https://trackdraw.app/"><strong>Home</strong></a>
  &middot;
  <a href="https://trackdraw.app/studio"><strong>Open Studio</strong></a>
  &middot;
  <a href="docs/ROADMAP.md"><strong>Roadmap</strong></a>
</p>

<p align="center">
  TrackDraw is a free, browser-based track designer for FPV race directors.
  Drop obstacles on a real-scale canvas, check the layout in 3D, and hand pilots a read-only link before the gates leave the van.
</p>

<p align="center">
  <img alt="TrackDraw editor showcase" src="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/screenshot.png" width="800">
</p>

> [!IMPORTANT]
> TrackDraw is currently in beta and still actively evolving. Expect rapid UI changes, feature tweaks and occasional rough edges while the editor matures.

## Project status

TrackDraw has a solid editing baseline now across desktop, shared read-only viewing, and practical mobile use. The current roadmap focus is on speeding up layout creation, improving iteration inside one project, and turning finished designs into better race-day outputs.

See [docs/ROADMAP.md](docs/ROADMAP.md) for the current roadmap assessment.

## What you can do

- 🏁 **Place obstacles** - gates, flags, cones, dive gates, ladders, start/finish lines, labels and free-form polylines
- 📐 **Work to scale** - the canvas maps directly to real-world dimensions; set your field size and meters-per-pixel ratio to get accurate distances
- 🎥 **Preview in 3D** - a live Three.js render shows the track from a drone perspective as you build
- 📈 **Check elevation** - altitude profile chart along polyline paths, useful for planning vertical sections
- ↩️ **Undo anything** - full undo/redo history so you can experiment freely
- 🚀 **Start faster** - first-use studio flows now guide the first editing step and surface next-step hints
- 📱 **Edit on mobile** - a dedicated mobile editor flow supports touch navigation, direct placement, mobile multi-select and quick actions
- 📤 **Export** - save your design as PNG, SVG, PDF, a 3D render screenshot, or JSON project file for backup and reuse
- 🔗 **Share with a link** - the entire design is compressed into the URL; shared links open at `/share/[token]` in a clean read-only view with a clear path back into Studio
- 📥 **Import** - load a previously exported JSON project file to continue editing

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The studio is at `/studio`.

Shared links open at `/share/[token]`.

## How it works

1. **Pick a tool** from the toolbar (gate, cone, flag, etc.)
2. **Click on the canvas** to place obstacles — drag to reposition, click to select and edit properties
3. **Use the inspector panel** on the right to fine-tune size, rotation, colour and other shape properties
4. **Right-click a selected item** in the 2D canvas for quick actions like duplicate, lock/unlock, arrange, rotate and delete
5. **Toggle the 3D panel** to preview your layout from above or in perspective, and click items there to inspect them without losing selection while orbiting
6. **Hit Share** to get a URL you can send directly to pilots or co-organisers
7. **Use Export** when you need printable assets, a 3D screenshot, or a JSON project backup

## Tech stack

| Layer      | Library                                                   |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)                        |
| UI         | React 19, Tailwind CSS 4, shadcn/ui v4 (`@base-ui/react`) |
| 2D canvas  | Konva 10 + react-konva                                    |
| 3D preview | Three.js 0.183 + @react-three/fiber + drei                |
| State      | Zustand 5 + zundo 2 (temporal) + Immer                    |
| Export     | jsPDF, shared 2D shape definitions, Konva stage snapshots |
| Sharing    | lz-string                                                 |
| Icons      | Lucide React                                              |

## Project structure

```
src/
├── app/              # Next.js pages (/, /studio, /share/[token])
├── components/       # React components
│   ├── canvas/       # TrackCanvas (2D editor), TrackPreview3D
│   ├── dialogs/      # Export, Import, Share, ProjectManager, KeyboardShortcuts
│   ├── editor/       # EditorShell, Header, Toolbar, StatusBar, StarterFlow
│   ├── inspector/    # Inspector, ElevationChart, ElevationPanel
│   ├── landing/      # Marketing page components
│   └── ui/           # @base-ui/react wrappers
├── store/
│   └── editor.ts     # Zustand store with temporal undo history
├── hooks/            # useUndoRedo, useTheme, useShareUrl
└── lib/
    ├── geometry.ts   # Distance, Catmull-Rom smoothing, elevation sampling
    ├── share.ts      # LZ-string encode/decode
    ├── export/       # PNG / SVG / PDF export
    └── types.ts      # Shape union types, TrackDesign, FieldSpec
```

## Scripts

```bash
npm run dev    # Development server (Turbopack)
npm run build  # Production build
npm run start  # Production server
npm run preview # Local Cloudflare/OpenNext preview with Wrangler
npm run migrate:local # Apply local D1 migrations for preview/dev
npm run migrate:up:dev   # Apply development D1 migrations
npm run migrate:up:production   # Apply production D1 migrations
npm run lint   # ESLint
npm run type   # TypeScript check
```

Use `npm run dev` for fast local UI work.
Use `npm run preview` to validate behavior against the Cloudflare/OpenNext runtime, especially for D1-backed share flows.

Deployment, Cloudflare, and D1 environment setup live in [docs/deployment-setup.md](docs/deployment-setup.md).

The current deployment model is:

- Vercel for pull request previews
- Cloudflare `development` for the main development environment
- Cloudflare production on `release.published`

## License

Distributed under the **LGPL-3.0-or-later** License. See [`LICENSE`](LICENSE) for more information.
