# AGENTS.md

## Purpose

This repository contains TrackDraw, a browser-based FPV race track designer built with Next.js, React, Zustand, Konva, and Three.js.

Agents working in this repo should optimize for product safety over broad refactors. The editor is already feature-rich, and small regressions in selection, transforms, sharing, export, or mobile flows are expensive.

## Product Context

- The main app surfaces are the landing page at `/`, the editor at `/studio`, and read-only shared views at `/share/[token]`.
- The product is local-first. Editing, autosave, import/export, and published sharing are all core behavior.
- Mobile support is intentional product scope, not a degraded desktop fallback.
- Shared links must open cleanly in read-only mode and remain compatible with the canonical `/share/[token]` route.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand with zundo and Immer
- Konva for the 2D editor
- Three.js with react-three-fiber for 3D preview

## Working Agreement

- Prefer minimal, targeted changes over architectural churn.
- Preserve existing visual language and interaction patterns unless the task explicitly asks for redesign.
- Keep TypeScript strictness intact. Avoid `any` unless there is a clear boundary reason.
- Reuse existing helpers and types before adding parallel abstractions.
- Be precise with existing filenames, imports, and variable names. Do not rename, substitute, or remove identifiers unless the change is intentional and verified against actual usage.
- When fixing lint or type errors, match the exact file path and reported symbol before editing, and prefer the smallest correction that resolves the reported issue.
- Do not break import/export, autosave, share publish/read flows, or read-only viewing while changing editor features.

## Files And Responsibilities

- `src/app`: route entry points and page-level metadata
- `src/components`: UI and editor composition
- `src/store`: editor state, undo/redo, persistence-oriented logic
- `src/lib`: design normalization, geometry, sharing, export, and helpers
- `docs`: roadmap and planning docs; keep product language aligned with shipped behavior

## Commands

- `npm run dev`
- `npm run preview`
- `npm run lint`
- `npm run type`
- `npm run build`

Run `npm run lint` and `npm run type` after non-trivial code changes when the environment allows it.

## Change Heuristics

- For landing-page work, protect SEO metadata, structured data, and conversion paths into `/studio`.
- For share-flow work, preserve token compatibility and fail safely on invalid or oversized share payloads.
- For editor work, check desktop and mobile implications before changing component contracts.
- For export or serialization work, assume backward compatibility matters unless the task explicitly says otherwise.

## Documentation Updates

Update `README.md` or files in `docs/` when behavior, routes, scripts, or roadmap status materially changes.
