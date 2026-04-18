# docs/AGENTS.md

This directory contains product planning, research, and deployment documentation for TrackDraw. All documents in this directory are public.

Do not place credentials, secret names with values, DNS configuration details, or infrastructure-specific operational notes here. Keep those in a separate private repository.

## Folder Structure

### `pva/`

Product Vision and Action documents. Each PVA defines the intended product shape for a specific feature or foundation area before implementation begins.

A PVA covers:

- the decision being made and whether it is approved
- the product model: what the feature is, what it is not, and why
- go/no-go criteria
- a phased delivery checklist for both product-definition and implementation work

PVAs are living documents. Update the status and check off phases as decisions are made and work progresses.

Current PVAs:

- `authorization-and-roles-pva.md` — account roles, ownership, capability-based authorization
- `published-gallery-pva.md` — opt-in gallery discovery surface built on top of published shares
- `live-race-overlay-pva.md` — real-time race overlay feature
- `real-time-collaboration-pva.md` — collaborative editing
- `ar-mode-pva.md` — augmented reality field overlay
- `map-field-overlay-pva.md` — map-based field placement
- `accounts-project-sync-pva.md` — account-backed project sync
- `obstacle-presets-pva.md` — obstacle preset library
- `starter-layouts-pva.md` — starter layout templates
- `layout-acceleration-pva.md` — layout acceleration tools
- `snapshots-layout-variants-design.md` — layout snapshot and variant design notes
- `project-manager-reset-notes.md` — project manager reset behavior notes

### `research/`

Exploratory and evaluation documents written before or during product decisions. Research documents inform PVAs but are not themselves decision records.

A research document may cover:

- technology evaluation
- feasibility analysis
- trade-off comparisons
- prior-art review

Current research documents:

- `published-gallery-evaluation.md` — gallery concept evaluation
- `real-time-collaboration-evaluation.md` — collaboration approach evaluation
- `ar-mode-evaluation.md` — AR mode feasibility

### `deployment/`

- `deployment-setup.md` — current runtime setup, environments, D1 databases, migrations, and local development workflow. Operational infrastructure details are kept outside this repository.

### `roadmap/`

Product roadmap and release tracking.

- `ROADMAP.md` — current product direction, sequencing, and milestone tracking.
- `github-roadmap.md` — roadmap formatted for GitHub project tracking.
