# Starter Layouts PVA

Date: March 31, 2026

Status: proposed next slice

## Purpose

This document defines the first meaningful product shape for `Starter layouts`.

Obstacle presets now solve repeated insertion. Selection grouping now solves repeated manipulation. The remaining layout-acceleration friction is starting from an empty canvas when the user only needs a reasonable first draft to react to.

## Product Goal

Starter layouts should help users get from blank canvas to a usable draft faster.

That means:

- fewer cold starts from an empty field
- a clear first structure to edit instead of inventing everything from scratch
- no new template object model after the layout is created

Starter layouts should feel like a practical launch point, not like a locked template system.

## Core Boundary

The first pass should remain:

- curated by TrackDraw
- account-free
- intentionally small
- fully editable after creation

Keep out of scope:

- user-authored starter libraries
- cloud-synced layout libraries
- venue-aware starter recommendations
- rules-aware layout generation
- branching or variant management

## Problem

Presets and grouping speed up building once the user knows what to place.

They do not solve:

- uncertainty about how to begin
- the cognitive load of shaping the first lap flow
- the “blank field paralysis” of a new project

Starter layouts should solve that specific problem and not try to become a general template browser.

## Recommended First Pass

Ship a very small curated set of starter drafts:

- Open practice
- Compact race start
- Technical ladder line

Each starter should:

- create a normal project layout in one action
- use ordinary editable shapes
- stay generic enough for many fields
- give users a visible early flow without implying venue compliance

## UX Shape

Starter layouts should appear where a blank project decision already happens.

Recommended entry points:

1. onboarding / first-use starter flow
2. new-project flow

Not recommended for first pass:

- a persistent toolbar tool inside the editor
- a dedicated template browser

Reason:

- starter layouts are about how a project begins
- users should encounter them at project creation time, not mixed into ordinary shape placement

## Editing Model

After a starter layout is applied:

- the project behaves like any normal TrackDraw project
- shapes can be edited, deleted, regrouped, or replaced freely
- there is no hidden dependency on the starter definition

This keeps the feature understandable and avoids template state complexity.

## Technical Shape

Use a static in-code starter catalog for the first pass.

Each starter should define:

- `id`
- `name`
- `description`
- optional `preview`
- project field defaults if needed
- a list of ordinary shape drafts
- optional starter path draft only if it proves worth the complexity

The simplest version should likely ship obstacle drafts first and postpone starter paths unless a route meaningfully improves the starting experience.

## First Build Recommendation

Build the smallest slice that proves the product value:

### Phase 1

- 3 curated starter layouts
- shown in onboarding or new-project flow
- choosing one creates a normal editable project

### Phase 2

- polish preview cards and copy
- learn which starters are actually chosen
- add or replace starters based on real use, not speculation

### Phase 3

- only then decide whether starter layouts deserve broader surfacing outside new-project entry

## Open Questions

- Should the first starters include a path, or only obstacle drafts?
- Should starter layouts replace the current design immediately, or open behind the existing new-project confirmation step?
- Should each starter assume one default field size, or adapt to the current field dimensions?

## Recommendation

Treat `Starter layouts` as the next narrow acceleration slice.

Do not introduce a template browser yet.

The right first version is:

- small
- curated
- editable
- project-start focused
