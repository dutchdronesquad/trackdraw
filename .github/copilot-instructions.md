# GitHub Copilot Instructions For TrackDraw

Use [AGENTS.md](/Users/klaas/Projecten/trackdraw/AGENTS.md) as the canonical project instruction file.

Additional Copilot-specific guidance:

- Before changing files in interaction-heavy areas, check for a nearer instruction file such as [src/components/editor/AGENTS.md](/Users/klaas/Projecten/trackdraw/src/components/editor/AGENTS.md).
- Prefer existing helpers, types, and patterns over introducing parallel abstractions.
- After non-trivial code changes, prefer `npm run lint` and `npm run type`.
