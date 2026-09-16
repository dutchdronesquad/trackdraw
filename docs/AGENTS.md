# docs/AGENTS.md

This directory contains product planning, research, and deployment documentation for TrackDraw. All documents in this directory are public.

Do not place credentials, secret names with values, DNS configuration details, or infrastructure-specific operational notes here. Keep those in a separate private repository.

## Folder Structure

### `pva/`

Plan of Action documents. Each PVA is a concrete implementation plan for a specific feature. A PVA is approved before build starts and stays lean: it covers what was decided, go/no-go criteria, a codebase anchor with relevant files and technical model, and a phased build checklist.

A PVA is not a product evaluation or research document. Product-shape analysis, UX direction, and trade-off comparisons belong in `research/`.

Current PVAs:

- `trackdraw-rest-api-pva.md` — account-backed REST API, expiring API tokens, OpenAPI docs, and phased endpoint rollout
- `live-race-overlay-pva.md` — real-time race overlay integration with `rh-stream-overlays`
- `map-field-overlay-pva.md` — map-based field placement with hybrid asset storage
- `3d-transform-controls-pva.md` — focused 3D move/rotate gizmo and orbit-control stabilization
- `track-viewer-package-pva.md` — extracted `@trackdraw/viewer` npm/static package and portable course snapshot, with DDS's own website as the first consumer

### `research/`

Exploratory and evaluation documents written before or during product decisions. Research documents inform PVAs but are not themselves decision records or build plans.

A research document may cover:

- technology evaluation
- product-shape analysis and trade-off comparisons
- feasibility analysis
- prior-art review
- shipped product direction notes

Use [the research index](research/README.md) when locating a topic or checking its delivery status. Research is grouped by implementation status:

- `implemented/`: the documented foundation is built; retain rationale and maintained contracts here.
- `in-progress/`: a foundation exists, but the documented delivery or evaluation still has open work.
- `planned/`: proposals, parked directions, and reverted experiments awaiting a new implementation decision.

When moving a document between statuses, verify its scope against code and the active roadmap or PVA, update its index entry, and repair incoming and relative links. Record remaining scope explicitly; a shipped first slice does not complete every future idea in the document.

### `deployment/`

- `deployment-setup.md` — current runtime setup, environments, D1 databases, migrations, and local development workflow. Operational infrastructure details are kept outside this repository.

### `roadmap/`

Product roadmap and release tracking.

- `ROADMAP.md` — current product direction, sequencing, and milestone tracking.
- `github-roadmap.md` — roadmap formatted for GitHub project tracking.
