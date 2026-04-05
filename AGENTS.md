# AGENTS.md

## Purpose

This repository contains TrackDraw, a browser-based FPV race track designer built with Next.js, React, Zustand, Konva, and Three.js.

Agents working in this repo should optimize for product safety over broad refactors. The editor is already feature-rich, and small regressions in selection, transforms, sharing, export, or mobile flows are expensive.

Use `README.md` for the product-facing repository overview and `CONTRIBUTING.md` for contributor workflow, commands, runtime modes, and validation expectations. Keep those documents aligned rather than duplicating technical setup details across files.

## Product Context

- The main app surfaces are the landing page at `/`, the editor at `/studio`, and read-only shared views at `/share/[token]`.
- The product must remain usable without an account for core editing, autosave, import/export, and published sharing behavior.
- Mobile is a supported product surface, not a desktop fallback.
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
- Do not introduce `card in card` UI patterns. Avoid placing a smaller bordered or elevated card inside another card-like container unless there is a truly exceptional product reason.
  From a UI/UX perspective this weakens hierarchy, creates visual clutter, and makes it less clear which surface is primary versus merely grouped content.
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

Run `npm run lint` and `npm run type` after non-trivial code changes when the environment allows it. Use `npm run preview` when validating D1-backed, auth-backed, or Cloudflare-runtime behavior.

## Change Heuristics

- For landing-page work, protect SEO metadata, structured data, and conversion paths into `/studio`.
- For share-flow work, preserve token compatibility and fail safely on invalid or oversized share payloads.
- For editor work, check desktop and mobile implications before changing component contracts.
- For export or serialization work, assume backward compatibility matters unless the task explicitly says otherwise.

## Documentation Updates

Update `README.md`, `CONTRIBUTING.md`, or files in `docs/` when behavior, routes, scripts, or roadmap status materially changes.

- Keep `README.md` product-facing and lightweight.
- Keep contributor setup, commands, runtime notes, and validation guidance in `CONTRIBUTING.md`.
- Keep longer planning, deployment, and research material in `docs/`.

When updating `CHANGELOG.md`:

- document shipped or release-bound user-facing changes, not roadmap ideas or internal planning
- keep entries compact and product-facing rather than deeply technical
- write for end users first: lead with what they can now do or what feels better, not internal architecture or product-strategy framing
- prefer plain product language over internal labels such as "continuity story", "first slice", "model", or implementation terminology
- prefer grouping small related changes into one stronger user-facing theme instead of listing low-signal implementation details
- avoid padding the changelog with dependency bumps, refactors, or internal cleanup unless they have a clear user-visible effect
