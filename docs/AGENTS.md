# docs/AGENTS.md

This directory contains product planning, research, and deployment documentation for TrackDraw. All documents in this directory are public.

Do not place credentials, secret names with values, DNS configuration details, or infrastructure-specific operational notes here. Keep those in a separate private repository.

## Folder Structure

### `pva/`

Plan of Action documents. Each PVA is a concrete implementation plan for a specific feature. A PVA is approved before build starts and stays lean: it covers what was decided, go/no-go criteria, a codebase anchor with relevant files and technical model, and a phased build checklist.

A PVA is not a product evaluation or research document. Product-shape analysis, UX direction, and trade-off comparisons belong in `research/`.

Current PVAs:

- `live-race-overlay-pva.md` — real-time race overlay integration with `rh-stream-overlays`
- `map-field-overlay-pva.md` — map-based field placement with hybrid asset storage

### `research/`

Exploratory and evaluation documents written before or during product decisions. Research documents inform PVAs but are not themselves decision records or build plans.

A research document may cover:

- technology evaluation
- product-shape analysis and trade-off comparisons
- feasibility analysis
- prior-art review
- shipped product direction notes

Current research documents:

- `real-time-collaboration-evaluation.md` — collaboration architecture evaluation
- `real-time-collaboration-product-shape.md` — host-review product model and go/no-go criteria
- `ar-mode-evaluation.md` — AR mode technical feasibility
- `ar-mode-product-shape.md` — AR product model and go/no-go criteria
- `live-race-overlay-evaluation.md` — race overlay product model and technical analysis
- `map-field-overlay-evaluation.md` — field overlay product model and UX analysis
- `accounts-project-sync.md` — shipped product direction for accounts and project sync

### `deployment/`

- `deployment-setup.md` — current runtime setup, environments, D1 databases, migrations, and local development workflow. Operational infrastructure details are kept outside this repository.

### `roadmap/`

Product roadmap and release tracking.

- `ROADMAP.md` — current product direction, sequencing, and milestone tracking.
- `github-roadmap.md` — roadmap formatted for GitHub project tracking.
