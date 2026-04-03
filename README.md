<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-darkbg.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg">
    <img alt="TrackDraw" src="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/brand/trackdraw-logo-color-lightbg.svg" width="320">
  </picture>
</p>

<p align="center">
  <strong>Design FPV race layouts to scale, review them in 3D, and hand off a race-day plan.</strong>
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
  <a href="https://github.com/dutchdronesquad/trackdraw/discussions/106"><strong>Roadmap</strong></a>
</p>

<p align="center">
  TrackDraw is a free, browser-based track designer for FPV race directors.
  Build layouts on a real-scale canvas, review route flow in 3D, and turn the result into a shareable race-day handoff.
</p>

<p align="center">
  <img alt="TrackDraw editor showcase" src="https://raw.githubusercontent.com/dutchdronesquad/trackdraw/main/public/assets/screenshot.png" width="800">
</p>

## Project status

TrackDraw covers the core workflow across desktop, shared read-only viewing, and practical mobile use. It is built around layout design first, then route review, then race-day handoff through export and sharing.

See the [public roadmap discussion](https://github.com/dutchdronesquad/trackdraw/discussions/106) for the current roadmap assessment.

For local development, contributor setup, and runtime-specific testing, see [CONTRIBUTING.md](CONTRIBUTING.md).

## What you can do

- 🏁 **Design layouts to scale** - place obstacles on a real-scale canvas with field dimensions that map cleanly to the real world
- ⚡ **Start and iterate faster** - use obstacle presets, selection grouping, and starter layouts to get from blank canvas to a workable draft quickly
- 💾 **Manage projects safely** - keep multiple local projects, reopen older layouts, rename or export them, and roll back through restore points and snapshots
- 🎥 **Review route flow in 3D** - use the live 3D preview and elevation tools to check how the layout reads before race day
- 📋 **Prepare a race-day handoff** - export a dedicated Race Pack PDF with map, numbering, material list, stock status, setup sequence, and initial build guidance
- 📦 **Check buildability early** - compare the current layout against available obstacle stock before the gear leaves the van
- 🔗 **Share and export cleanly** - publish a read-only link, manage and revoke published shares from the Projects dialog when signed in, or export PNG, SVG, PDF, 3D screenshots, and JSON project files from the same design
- 🔐 **Sign in to keep projects in sync** - use an email magic link, manage your profile in-app, and prepare TrackDraw for account-backed ownership and cross-device work

## How it works

1. **Pick a tool** from the toolbar (gate, cone, flag, etc.)
2. **Click on the canvas** to place obstacles, or start from a preset or starter layout when you do not want to begin from scratch
3. **Use the inspector panel** on the right to fine-tune size, rotation, colour and other shape properties
4. **Group or duplicate sections** when parts of the layout should move or repeat together
5. **Toggle the 3D panel** to preview your layout from above or in perspective, and use the elevation and route review tools to check flow
6. **Open Projects** when you want to switch layouts, restore an earlier state, sync to your account, or export a specific project as JSON
7. **Hit Share** to get a URL you can send directly to pilots or co-organisers
8. **Use Export** when you need a Race Pack, printable assets, a 3D screenshot, or a JSON project backup

## Tech stack

| Layer      | Library                                                   |
| ---------- | --------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack)                        |
| UI         | React 19, Tailwind CSS 4, shadcn/ui v4 (`@base-ui/react`) |
| 2D canvas  | Konva 10 + react-konva                                    |
| 3D preview | Three.js 0.183 + @react-three/fiber + drei                |
| State      | Zustand 5 + zundo 2 (temporal) + Immer                    |
| Export     | jsPDF, shared 2D shape definitions, Konva stage snapshots |
| Sharing    | Stored share publishing on Cloudflare D1                  |
| Icons      | Lucide React                                              |

## Project structure

```
src/
├── app/              # Next.js routes (/, /studio, /login, /share/[token], /api)
├── components/       # React components
│   ├── canvas/       # TrackCanvas (2D editor), TrackPreview3D
│   ├── dialogs/      # Export, Import, Share, ProjectManager/ (subdir), KeyboardShortcuts
│   ├── editor/       # EditorShell, Header, Toolbar, StatusBar, StarterFlow
│   ├── inspector/    # Inspector, ElevationChart, ElevationPanel
│   ├── landing/      # Marketing page components
│   └── ui/           # @base-ui/react wrappers
├── store/
│   └── editor.ts     # Zustand store with temporal undo history
├── hooks/            # useUndoRedo, useTheme, useShareUrl
├── types/            # Shared TypeScript types
└── lib/
    ├── planning/     # Presets, starter layouts, inventory, setup estimates
    ├── server/       # Auth, D1 access, project/share persistence helpers
    ├── track/        # Track geometry, design normalization, numbering, shape helpers
    ├── share.ts      # Share encoding and decoding helpers
    ├── export/       # PNG / SVG / PDF export
    └── vendor/       # Third-party integration helpers
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

TrackDraw remains local-first by default. Local projects, import/export, sharing, restore points, and project recovery work without an account. Signing in adds account-backed continuity for projects across devices.

Authentication uses Better Auth with email magic links. Use `npm run dev` for normal UI work and `npm run preview` when you need to validate account-backed APIs or stored-share behavior against the Cloudflare/OpenNext runtime.

Deployment, auth, and Cloudflare/D1 setup live in [docs/deployment/deployment-setup.md](docs/deployment/deployment-setup.md).

The current deployment model is:

- Vercel for pull request previews
- Cloudflare `development` for the main branch
- Cloudflare production on `release.published`
- GitHub Environments `cf-dev` and `cf-prod` for the Cloudflare deploy workflows

## License

Distributed under the **LGPL-3.0-or-later** License. See [`LICENSE`](LICENSE) for more information.
