# Accounts And Cross-Device Evaluation

This document evaluates whether TrackDraw should add optional user accounts and cloud-backed project access across devices.

Status: research only. This is not a build commitment.

## Question

Should TrackDraw stay purely local-first, or should it eventually offer optional accounts for cloud project storage, project management, and cross-device access?

## Current State

TrackDraw currently leans local-first:

- editing is browser-local by default
- projects and restore points are local
- import/export already provides a practical portability layer
- sharing is publish-oriented and read-only

That is a strong v1 posture because it reduces friction and keeps the product usable without auth.

## Why Accounts Are Interesting

Optional accounts become compelling if users start to need:

- access to the same projects from multiple devices
- safer long-term storage than local browser persistence
- a durable project library across a season
- ownership and management of published shares
- future project history or collaborative review tied to a user identity

This is product-relevant even without real-time collaboration.

## What Accounts Could Unlock

Potential benefits:

- cloud backup for projects
- project sync across desktop, tablet, and phone
- persisted published-share management
- ownership rules for future admin controls and any eventual regenerate flow
- a cleaner path to team workflows later

## What Accounts Would Cost

Accounts are not a small add-on. They imply:

- authentication flows
- account recovery and support burden
- cloud project storage and migration questions
- privacy and data-retention policy work
- a more complex product model around local vs cloud state

The biggest product risk is undermining TrackDraw's current strength: fast, no-login entry into design work.

## Recommended Product Shape

If accounts are ever added, they should be optional.

That likely means:

- anonymous local-first use remains the default
- local projects still work without login
- accounts unlock cloud backup, sync, and project management
- publishing can remain possible without making the whole product auth-first

This preserves the current product character while still allowing a stronger cross-device layer later.

## Architectural Implications

Optional accounts would likely require:

- authenticated APIs in the current hosted runtime
- a persisted project model distinct from the current public share model
- ownership and access rules for projects and published shares
- conflict rules for local vs cloud edits

Important boundary:

- `project` should remain distinct from `published share`
- publishing should continue to represent a public snapshot, not the full working project model

That separation already aligns with the direction in the share docs and deployment planning.

## Suggested Research Questions

1. Do users actually need cross-device project continuation, or is JSON export/import already enough for current use?
2. Is cloud backup the real need, or true multi-device editing?
3. Should accounts begin as project backup only, without collaboration?
4. What is the migration path from local-only projects to optional cloud-linked projects?
5. How should the product explain local projects versus synced projects without confusing users?
6. What minimum identity model is enough: email link, OAuth, or something else?

## Recommended First Scope If Explored

If this becomes active work, the first cut should be narrow:

- optional accounts only
- cloud backup / restore for projects
- basic project library across devices
- no live collaboration
- no team permissions in the first version

That would answer the main user-value question without overcommitting the product too early.

## Recommendation

This is a stronger long-term strategic candidate than wrappers.

Reason:

- it solves real durability and cross-device problems
- it builds directly on the existing project and share model
- it opens the door to better project management without immediately requiring collaboration

But it should remain behind the PWA question and behind near-term share/deploy polish.

The right framing is:

- not required for v1
- potentially important for v1.x or later
- best pursued as optional cloud enhancement, not a mandatory login wall
