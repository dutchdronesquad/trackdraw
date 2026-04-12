# AGENTS.md

## Scope

These instructions apply to files under `src/components/editor`.

This folder contains interaction-heavy editor UI, including mobile panels, tool affordances, and flow-specific controls. Changes here can easily cause regressions that are not obvious from static review.

Follow the repository-level guidance in the root `AGENTS.md` and keep contributor workflow details in `CONTRIBUTING.md` rather than duplicating setup notes here.

## Priorities

- Keep core editing actions fast and legible on small screens.
- Preserve parity between desktop intent and mobile capability where practical.
- Favor explicit prop names and predictable event flow over clever local state.
- Keep read-only behavior distinct from editable behavior.

## Mobile Editing Rules

- Treat mobile as a supported workflow, especially for venue-side adjustments.
- Preserve quick access to undo/redo, fit view, share, import/export, and inspection where those actions already exist.
- Avoid adding tap-heavy flows that bury common actions behind multiple layers.
- Be careful with drawer, overlay, and sheet state so panels do not fight each other.

## Selection And Transform Safety

- Do not enable destructive actions when nothing is selected.
- Respect lock state, read-only mode, and capability flags such as whether a selection can rotate or nudge.
- Keep labels and affordances aligned with actual behavior. If a control says `+15°` or `Delete`, the handler must match that intent.
- When changing action availability, verify both single-selection and multi-selection behavior.

## Component Design

- Prefer deriving button disabled state from existing props rather than duplicating eligibility logic locally.
- Keep local UI state local only when it is purely presentational, such as temporary panel expansion.
- If a component grows more complex, extract small focused subcomponents instead of adding deeply nested conditionals.
- Never solve editor layout by nesting one card-like surface inside another card-like surface. Prefer spacing, dividers, typography, or grouping within a single surface before adding extra bordered containers.
- The reason is product clarity: card-in-card layouts make hierarchy feel muddy, add unnecessary density, and can make action groups look bolted on instead of intentionally integrated.

## Verification Checklist

After changes in this folder, verify as many of these as the environment allows:

- Mobile tools panel opens and closes correctly
- Mobile view panel and inspector do not conflict
- Quick actions reflect current selection state
- Read-only mode does not expose editing actions
- Path-building actions remain coherent for draft, selected, and completed paths
- Undo/redo and share entry points still remain reachable on mobile
