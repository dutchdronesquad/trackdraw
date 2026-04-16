# Real-Time Collaboration PVA

Date: April 16, 2026

Status: proposed

## Decision Summary

Recommended decision:

- approve collaboration only as a host-review product direction
- do not approve true co-editing
- do not build until the team explicitly wants a live review surface badly enough to pay for the room/session architecture

This document is intended to make that product call more concrete, not to default TrackDraw into building collaboration.

## Approval Recommendation

TrackDraw should only approve collaboration implementation if the team accepts this shape:

- signed-in rooms
- one host editor
- guests join live review sessions
- no co-editing
- no shared undo
- no public rooms

TrackDraw should not approve implementation yet if the team expects:

- true concurrent editing
- guest editing rights
- social/community room discovery
- persistence-heavy room history

## Delivery Checklist

- [ ] Phase 0: lock the collaboration model
- [ ] Phase 1: define room, role, and session boundaries
- [ ] Phase 2: define the smallest credible live review slice
- [ ] Phase 3: define persistence and undo behavior
- [ ] Phase 4: decide whether to build host review or keep parked

## Go / No-Go Criteria

Go for implementation planning if:

- the team agrees host review is the real v1, not co-editing
- account-only rooms are acceptable
- the product sees clear value in remote review or walkthrough sessions
- the architecture investment for rooms/presence is considered worth it

No-go or keep parked if:

- the team really wants co-editing rather than host review
- live review is still nice-to-have rather than clearly valuable
- the room/session model still feels like too much product surface for the current roadmap

## Purpose

This document defines the intended product shape for `Real-time collaboration`.

TrackDraw already has:

- local-first editing
- account-backed project continuity
- published read-only shares

Those are strong foundations for solo design and handoff. They are not yet a shared editing model.

This document exists to turn collaboration from a broad research idea into a more concrete product decision:

- what kind of collaboration TrackDraw should support first
- what should remain out of scope
- whether a first live session feature is justified at all

## Product Goal

If TrackDraw adds live collaboration, it should improve shared track review and planning without weakening the solo editor.

That means:

- the first version should feel useful with minimal architecture risk
- collaboration should fit TrackDraw's planning and review workflows
- live sessions should not force full co-editing before the product is ready
- local-first editing and current undo expectations should not be casually broken

## Core Product Position

TrackDraw should not treat `real-time collaboration` and `real-time co-editing` as the same thing.

The strongest first product direction is:

- live room
- one host editor
- guests in a shared review context

That is a more credible first step than full multi-user co-editing.

## Recommended Collaboration Model

### 1. Account-Only Rooms

Live collaboration should require signed-in users.

Why:

- room membership needs identity
- host permissions need a stable owner concept
- moderation and abuse boundaries are easier with accounts

Recommendation:

- ordinary share links remain the no-account fallback
- live rooms are account-backed

### 2. Host Review First

The first live feature should be a host-led review session, not full concurrent editing.

Recommended first behavior:

- one host edits
- guests join the same room
- guests can follow the session and maybe point or comment later
- only the host changes the live document in v1

This gives TrackDraw real collaboration value without forcing conflict resolution and shared undo immediately.

### 3. Presence Is Supporting, Not The Product

Presence-only rooms are not enough on their own.

Presence can support the experience through:

- who is here
- where the host is looking
- maybe guest cursors or focus states later

But the product value should come from a review room, not from “someone else is online”.

## Problem Framing

TrackDraw teams may want live collaboration for a few reasons:

1. remote review with club members
2. host-led walkthrough before race day
3. venue-side adjustments while others follow along

The first version should solve those review and walkthrough cases before trying to solve true concurrent editing.

## Recommended First-Version Rules

### Room Model

The first live room should have:

- one host
- one active project
- one current live session

The room should not try to be:

- a persistent group workspace
- a shared project list
- a chat platform

### Roles

The first version should define only:

- host
- guest

Recommended permissions:

- host can edit
- guests cannot edit the shared document
- guests can join, follow, and later maybe point or annotate

### Shared State

The first version should share only what is necessary for the room to make sense.

Recommended shared state:

- project or room document reference
- host document changes
- join or leave presence
- optional follow mode or shared review cues

Recommended local-only state:

- active tool
- hover state
- drag previews
- marquee state
- temporary local UI state
- per-user viewport unless follow mode is active

## Recommended Entry Points

Owner-facing entry points:

- project or editor shell: `Start live review`
- share or project management surface later: `Open live room`

Guest entry points:

- direct room invite link
- account-gated room join page

Do not start with:

- automatic live mode when opening a shared project
- collaboration controls buried in account settings
- a requirement that every share can become a live room without a separate session model

## Screen-Level V1 Flow

### 1. Host Starts A Live Review

The host chooses `Start live review` from the editor.

The first confirmation surface should define:

- active project
- room access link
- host role
- guest expectations

### 2. Guests Join The Room

Guests open the invite link and sign in if required.

The room join screen should clarify:

- who the host is
- that the room is live
- that the session is review-oriented
- that guests are not co-editors in v1

### 3. Live Review Session

During the room:

- host edits normally
- guests see the project update live
- host remains the authoritative editor

Optional first-pass room affordances:

- attendee list
- join/leave notices
- simple host-follow mode

### 4. Session Ends

When the room ends:

- the project remains a normal project
- participants can fall back to the existing share flow or reopen later
- TrackDraw does not need to preserve a heavyweight room artifact in v1

## Suggested V1 UI Copy Direction

Recommended product language:

- `Start live review`
- `Join live review`
- `Host`
- `Guest`
- `Live now`
- `End review`

Avoid first-pass copy that overpromises:

- `Co-edit`
- `Collaborative editing`
- `Shared canvas`

Those imply a stronger document model than the first release actually supports.

## Data Model Direction

The first collaboration model should introduce a room/session concept separate from projects and shares.

Expected first entities:

- project
- live room
- room membership
- room presence state

The important product rule is:

- the project remains the document
- the room is a temporary live session around that document

## Persistence And Undo Direction

The host should remain the only editor in v1, so:

- host undo/redo remains the meaningful undo model
- guest actions do not affect document history
- room presence does not create restore-point semantics

This avoids forcing a shared undo redesign into the first collaboration slice.

## API And Runtime Direction

The first version likely needs:

- room creation and join APIs
- presence coordination
- live document fan-out

The most credible technical direction remains:

- WebSockets
- Durable Objects
- a shared document layer only if later co-editing becomes necessary

The first host-review slice should avoid requiring full CRDT-based co-editing from day one.

## Required Preconditions Before Build

Before implementation starts, TrackDraw should lock:

- room creation and join entry points
- host versus guest permissions
- what presence is visible in v1
- whether follow mode is included
- what happens when the host disconnects or ends the room

## Moderation And Safety Boundary

The first room model should assume:

- host controls access
- room links are deliberate
- account identity is required

The first version does not need:

- public room browsing
- open collaboration lobbies
- social discovery

## Out Of Scope For The First Version

Keep these out of scope:

- true concurrent co-editing
- shared undo
- public collaboration rooms
- guest document editing
- collaboration chat as a full product surface
- deep room persistence

## Risks

- collaboration may dilute the solo editor if room state leaks too far into local workflows
- live review may still require more architecture work than expected if document fan-out is tightly coupled to the current store
- a weak presence-only experience may under-deliver and feel like demo-ware
- guests may expect editing power if the product language is too loose

## Recommended Delivery Sequence

### Phase 0: Lock the collaboration model

Start:

- collaboration exists only as a broad roadmap idea

Done:

- TrackDraw chooses host review as the first credible collaboration slice
- account-only room direction is explicit
- co-editing is explicitly deferred

### Phase 1: Define room, role, and session boundaries

Start:

- host review is chosen directionally

Done:

- room model is concrete
- host and guest permissions are explicit
- relationship between project, room, and share is clear

### Phase 2: Define the smallest credible live review slice

Start:

- room and role model are clear

Done:

- entry points are defined
- join flow is defined
- first shared state scope is defined
- first live review UX is mockable or implementable

### Phase 3: Define persistence and undo behavior

Start:

- room UX is concrete enough

Done:

- host-only document authority is explicit
- undo expectations are explicit
- room lifecycle and session-end behavior are explicit

### Phase 4: Decide whether to build host review or keep parked

Start:

- the product shape is specific enough to judge honestly

Done:

- TrackDraw either commits to a host-review build
- or keeps collaboration parked until the architecture and demand justify it

## First Engineering Slice

If TrackDraw chooses to build this later, the first engineering slice should be:

1. create signed-in room creation and join flow
2. establish host and guest roles
3. fan out host document updates live to guests
4. show simple room presence
5. keep all editing authority with the host

That is the smallest slice that proves whether live review has enough product value without committing to co-editing.

## Smallest Credible V1

If TrackDraw builds collaboration, the smallest credible version is:

- signed-in host-led live review
- invite-based room join
- one host editor
- guests can join and watch updates live
- simple presence
- no co-editing
- no shared undo

Anything larger than that should require a second product decision.

## Success Criteria

The first version is successful if:

- a host can run a live review session without harming ordinary editing
- guests can follow a live track review clearly
- the session model feels intentionally review-oriented rather than confusingly half-collaborative
- the feature proves enough value to justify its architecture cost
