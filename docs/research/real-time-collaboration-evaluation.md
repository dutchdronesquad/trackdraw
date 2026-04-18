# Real-Time Collaboration Evaluation

This document evaluates whether TrackDraw should support shared real-time editing.

Status: research only. This is not a build commitment.

## Current Fit

TrackDraw is currently strongest as a local-first design tool with sharing, export, and account-backed project continuity.

The editor is built around:

- a local Zustand store
- direct design mutations
- undo/redo history
- local-first recovery and persistence

That is a strong fit for solo editing. It is not yet a natural fit for collaborative editing.

After the editor state and persistence boundary pass, the baseline is stronger than it was when collaboration was first evaluated:

- track data, session state, and local UI state are more clearly separated
- persistence roles are clearer across local draft, local project, restore point, account-backed project, and published share
- several drag, rotate, and inspector edit flows now group undo/redo more intentionally

Those changes reduce ambiguity, but they do not by themselves provide a shared editing model.

## Why Collaboration Is Harder

Real-time collaboration is not just a transport feature. It is an editor architecture decision.

It would require answers for:

- shared document structure
- sync transport
- presence and cursor behavior
- conflict handling
- shared undo/redo expectations
- disconnect and offline behavior

This is especially important because TrackDraw already has a strong single-user workflow. Collaboration should not weaken that baseline.

## Technically Plausible Direction

If TrackDraw ever explores collaboration seriously, the most plausible direction is:

- account-only collaborative rooms
- a shared document model instead of whole-project save polling
- presence indicators such as selections, cursors, or session presence

The most plausible technical stack is:

- a CRDT/shared document layer such as Yjs
- realtime coordination through Cloudflare Durable Objects and WebSockets

That combination is technically credible, but it is still a meaningful architecture investment.

## Smallest Credible Slices

Not every multi-user feature requires full co-editing.

For TrackDraw, the realistic slices are:

### 1. Presence-Only Sessions

Users can be in the same project context at the same time, but only one person edits.

Possible capabilities:

- host is the only editor
- guests can join a live room
- cursors, viewport, or selection presence may be visible
- guests can discuss or follow along without changing the design

This is the lightest collaboration-adjacent option, but it still requires a room and presence model.

### 2. Host Review Sessions

One user edits while others join a shared review context with limited interaction.

Possible capabilities:

- host edits live
- guests can point, highlight, or comment
- the room can preserve a review timeline or anchored notes
- publish/share links can remain the read-only fallback outside the live session

This is more useful than raw presence because it creates product value without immediately forcing shared edit conflict rules.

### 3. Real-Time Co-Editing

Multiple users can edit the same project in one live session.

Possible capabilities:

- concurrent document edits
- per-user presence
- shared or per-user review cues
- collaborative room durability and reconnect behavior

This is the most powerful option, but it is also the one that fully forces the shared document, conflict, and undo decisions.

## Decision Matrix

| Option               | User value            | Architecture cost | Product risk | Fit with current TrackDraw           |
| -------------------- | --------------------- | ----------------- | ------------ | ------------------------------------ |
| Presence-only        | Low to moderate       | Moderate          | Moderate     | Plausible, but easy to under-deliver |
| Host review session  | Moderate to high      | Moderate          | Moderate     | Strongest near-term fit              |
| Real-time co-editing | High if it works well | High              | High         | Not justified yet                    |

### Presence-Only Assessment

Strengths:

- cheapest path toward a room/session model
- useful for demos, club planning calls, and remote walkthroughs
- does not require concurrent document merge logic

Weaknesses:

- can feel thin if it stops at “someone else is here”
- still requires enough room/presence infrastructure to be non-trivial
- may not justify itself against stronger share/review improvements

### Host Review Session Assessment

Strengths:

- fits TrackDraw's race-planning and handoff workflow better than raw co-editing
- can build on clearer publish, ownership, and session boundaries
- avoids the hardest shared undo/conflict problems at first
- makes room for comments, anchored notes, or guided walkthroughs later

Weaknesses:

- still needs room identity, permissions, and presence
- note/review UX must feel intentional or it becomes clutter

### Real-Time Co-Editing Assessment

Strengths:

- highest upside for teams if real collaboration becomes strategically important
- strongest long-term foundation for fully shared planning

Weaknesses:

- demands a true shared document model
- demands conflict, offline, and reconnect behavior that does not damage the solo workflow
- raises the bar for permissions, ownership, and undo behavior immediately

## State Sharing Matrix

The boundary pass makes this question more answerable.

If TrackDraw ever adds live sessions, the likely sharing model should be:

| State category                  | Presence-only          | Host review            | Co-editing                                     |
| ------------------------------- | ---------------------- | ---------------------- | ---------------------------------------------- |
| Track document (`track.design`) | Host only              | Host only              | Shared                                         |
| Selection                       | Optional presence only | Optional presence only | Per-user presence, not shared document state   |
| Active tool / preset            | Local only             | Local only             | Local only                                     |
| Hover / marquee / previews      | Local only             | Local only             | Local only                                     |
| Camera / viewport               | Optional follow mode   | Optional follow mode   | Local by default, maybe follow mode            |
| Undo/redo history               | Host only              | Host only              | Per-user or operation-based, not yet decided   |
| Local draft protection          | Yes                    | Yes                    | Likely yes, but per-user recovery rules needed |
| Restore points                  | Host/project only      | Host/project only      | Open question: per-user vs project             |
| Published share                 | Snapshot after session | Snapshot after session | Snapshot after session                         |

The important implication is that TrackDraw now has a better separation for deciding what should never be synced:

- active tool
- hover state
- drag previews
- marquee state
- temporary live patches
- most view-only interaction state

That reduces one major source of ambiguity, but not the need for a real shared editing contract.

## Concrete TrackDraw Changes Required

TrackDraw cannot support credible real-time collaboration by only adding a live transport layer.

The current editor is still centered on a single local Zustand store in [src/store/editor.ts](../../src/store/editor.ts), local autosave in [src/hooks/useEditorProjects.ts](../../src/hooks/useEditorProjects.ts), and whole-design serialization in [src/lib/track/design.ts](../../src/lib/track/design.ts). The project and share APIs also still work with complete design snapshots rather than live edit sessions.

What improved is the internal boundary clarity:

- `track`, `session`, and local `ui` state are more explicit in the store
- editor actions are easier to classify by ownership
- persistence behavior is less entangled with incidental UI state

That makes collaboration research more grounded, but it does not remove the need for a real shared-document model.

To make collaboration possible, TrackDraw would need at least the following structural changes:

### 1. Shared Document Layer Instead Of Direct Local Mutation

Today most editor actions directly mutate a local `TrackDesign` object through methods such as:

- `addShape`
- `updateShape`
- `setPolylinePoints`
- `removeShapes`
- `replaceDesign`

That is efficient for a single-user editor, but it is not enough for collaboration.

TrackDraw would need one of these:

- an explicit operation model for editor edits
- a shared document/CRDT model that the editor reads from and writes to

Without that, remote edits cannot be merged cleanly.

### 2. Clear Split Between Shared State And Local UI State

TrackDraw is now closer to a usable split than before, but collaboration would still need a stronger contract for what is shared versus what is purely per-user.

The local editor still contains UI-only behavior such as:

- active tool
- hover state
- marquee state
- drag previews
- selection helpers

For collaboration, TrackDraw would need a cleaner boundary:

- shared track document state
- local per-user UI state
- optionally shared presence state

That separation is necessary so TrackDraw does not accidentally sync purely local editor behavior.

### 3. Undo/Redo Redesign

TrackDraw currently uses `zundo` history on the local store, now with more intentional grouping around several edit sessions. That is a better solo-editing foundation, but it still does not map cleanly to a multi-user session.

Collaboration would require a decision about:

- per-user undo
- shared undo
- operation-grouped undo
- how remote edits affect local undo stacks

This is one of the biggest behavior risks because undo/redo is already a core part of the current editor experience.

### 4. Live Session And Presence Model

TrackDraw has project save and publish APIs, but no concept of a collaborative room.

A collaboration feature would need:

- room/session identifiers
- membership and permissions
- connection lifecycle handling
- presence metadata
- user-visible join/leave behavior

This is a new product surface, not just a background implementation detail.

### 5. Real-Time Transport And Coordination

The current backend routes are snapshot-oriented:

- [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
- [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)

Collaboration would need an additional coordination layer for:

- session state
- fan-out of updates
- presence broadcasts
- reconnect handling

Durable Objects plus WebSockets remain the most plausible direction if TrackDraw ever builds this.

### 6. Persistence And Autosave Rework

The current experience assumes:

- local autosave
- local restore points
- explicit project saves
- explicit published snapshots

Collaboration would require clearer rules for:

- when live edits become durable
- whether local draft protection still exists
- whether restore points are per-user or per-project
- how collaborative projects relate to published shares

That likely means redesigning persistence around:

- collaborative project state
- user-local recovery state
- intentional publish/export snapshots

### 7. Conflict And Offline Strategy

TrackDraw would need product rules for:

- simultaneous edits on the same shape
- reconnect after disconnect
- local editing while offline
- whether shape locking exists at all

This is especially important because the product already works well as a local-first editor. A collaboration layer should not make solo editing less predictable.

## Useful Direction Even Without Collaboration

Several changes that would help collaboration are also strong improvements for TrackDraw in general.

This is the real opportunity: some of the required architecture work can improve the product even if live collaboration never ships.

### 1. Split Document State From Local UI State

This has now partially happened and already makes the editor easier to reason about and safer to evolve.

Benefits even without collaboration:

- clearer separation between persistent design data and temporary interaction state
- safer autosave behavior
- simpler future review/presence/comment surfaces
- easier debugging of editor regressions

### 2. Introduce Explicit Editor Actions

This has also improved, although TrackDraw still does not have a collaboration-ready operation model.

Benefits even without collaboration:

- better instrumentation and analytics for editor behavior
- more reliable change grouping for undo/redo
- easier testing of important edit flows
- cleaner hooks for future features like review, suggestions, or lint feedback

### 3. Refine Persistence Boundaries

TrackDraw already has multiple persistence concepts:

- local autosave
- local projects
- restore points
- account-backed projects
- published shares

Those concepts are now clearer than before, but collaboration would still require an additional shared-session durability model.

Benefits even without collaboration:

- clearer user mental model
- less risk of accidental overwrite confusion
- stronger project continuity across local and account-backed flows
- better foundation for gallery and publish workflows

### 4. Make Undo/Redo More Intention-Aware

This has improved meaningfully for solo editing, but shared undo semantics remain an open collaboration question.

Benefits even without collaboration:

- cleaner undo after drag/rotate/edit sessions
- less noisy history
- safer future integration with analysis or assistive tooling

### 5. Add Better Session Concepts Without Full Collaboration

TrackDraw does not need live co-editing to benefit from clearer session concepts.

Examples:

- view-only guest sessions
- host review sessions
- published gallery context
- richer project ownership and publish states

That direction supports sharing and handoff value before committing to full co-editing.

## Product Risks

Even if the sync layer works, collaboration creates harder product questions:

- who owns the project
- who can edit versus only review
- how collaborative sessions are joined
- how safe conflicts feel in race planning work
- how to keep presence useful instead of distracting

It also competes directly with other, cheaper improvements such as:

- better analysis
- stronger publish/gallery workflows
- more venue-side validation

## Suggested Research Questions

1. Is collaboration strategically important enough to justify editor-model changes?
2. Is account-only co-editing more valuable than improving publish, gallery, and review workflows first?
3. What is the smallest credible slice: presence only, co-editing, or host-and-guest review?
4. How should local-first editing behave during disconnects or reconnection?
5. Can TrackDraw preserve usable undo/redo semantics in a shared session?

## Recommendation

Do not actively invest in making collaboration possible right now.

Keep it on the roadmap as lower-priority research only.

The editor architecture is now in a better place for solo use and future research than it was before this pass. The next useful outcome is still not full implementation. It is deciding whether collaboration is important enough to justify a real shared-document and presence model on top of that stronger baseline.

If TrackDraw wants a smaller live-collaboration-adjacent step later, the strongest candidate is not full co-editing. It is a host-led review session model with optional presence cues.

Nearer-term effort is likely better spent on:

- analysis and Track DNA
- race-day and handoff workflows
- published gallery and discovery
- venue-aware validation

The best `1 + 1 = 2` direction remains:

- keep store boundaries explicit
- keep persistence boundaries explicit
- keep undo/redo intent handling explicit
- avoid committing to real-time sync until those foundations are stronger

Recommended near-term ordering:

1. continue improving publish, gallery, and review foundations
2. if live multi-user value becomes more important, evaluate host review sessions before co-editing
3. only revisit full co-editing after TrackDraw has a deliberate shared-document strategy and undo model

## References

- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Cloudflare Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Cloudflare WebSocket hibernation example: https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/
- Yjs introduction: https://docs.yjs.dev/
