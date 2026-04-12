# Editor State And Persistence Boundary Pass

This document outlines the editor and persistence improvements that would make TrackDraw cleaner today and reduce future cost for collaboration, review, and publishing features.

Status: recommended foundation work. This is product improvement work, not a collaboration commitment.

## Current Fit

TrackDraw already works well as a local-first editor, but its core editing model mixes several concerns together:

- persistent track data
- temporary UI state
- undo/redo history
- local autosave
- local projects and restore points
- account-backed project persistence
- published share snapshots

Those concerns are individually sensible, but the lines between them can be clearer.

Relevant current files:

- [src/store/editor.ts](../../src/store/editor.ts)
- [src/hooks/useEditorProjects.ts](../../src/hooks/useEditorProjects.ts)
- [src/lib/projects.ts](../../src/lib/projects.ts)
- [src/lib/track/design.ts](../../src/lib/track/design.ts)
- [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
- [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)

## Main Problems To Solve

### 1. Track Data And UI State Are Too Close Together

The editor store currently holds:

- the actual `TrackDesign`
- selection state
- tool state
- hover state
- draft interaction state
- drag previews

That makes the editor powerful, but it also makes it harder to reason about what should:

- persist
- affect undo/redo
- trigger autosave
- remain purely local and temporary

### 2. Meaningful Edits Are Not Formalized Enough

Many editor changes happen through direct store mutations.

That works, but it limits:

- clear testability
- change instrumentation
- intentional undo grouping
- future reuse for review or sync-related features

### 3. Persistence Layers Need A Clearer User Model

TrackDraw currently has several persistence concepts:

- local autosave
- local projects
- restore points
- account-backed projects
- published shares

All of these are useful, but the product model is easier to misunderstand when the boundaries are not explicit.

### 4. Undo/Redo Is Functional But Not Yet Intent-Oriented

`zundo` provides a strong base, but some interactions would benefit from cleaner “meaningful change” boundaries instead of relying mostly on raw temporal history.

## Concrete Current-State Assessment

The current editor is already closer to a useful split than it may first appear.

TrackDraw effectively has three kinds of state today:

### 1. Persistent Document State

This should remain part of the saved project model:

- `design`
- `design.field`
- `design.shapeOrder`
- `design.shapeById`
- design metadata such as title, description, tags, inventory, and author fields

This is the actual saved track data.

### 2. Local Editor Session State

This is not part of the saved project, but it does affect editing flow:

- `selection`
- `historyPaused`
- `historySessionDepth`
- `interactionSessionDepth`

This state belongs to the active editing session, not the project payload.

### 3. Temporary UI State

This is highly local UI state and should never be treated as saved track data:

- active tool and preset
- zoom and pan
- hover state
- segment and vertex selection
- draft path state
- marquee state
- rotation preview state
- group drag preview state
- live shape patches

Most of this already lives under a dedicated UI-state area in [src/lib/editor/store-types.ts](../../src/lib/editor/store-types.ts), which is a useful starting point in the current code. The main gap is that these boundaries are not explicit enough in the implementation and surrounding persistence behavior.

## Desired End State

This work does not need a new editor architecture from scratch.

The desired end state should be:

### 1. One Clear Track Data Area

TrackDraw should have one clearly identified track data area that owns:

- the full `TrackDesign`
- track-data-changing editor actions
- track data normalization and updated-at behavior

### 2. One Clear Local UI Area

TrackDraw should have one clearly identified local UI area that owns:

- selection
- active tool and preset
- camera/canvas view state
- hover state
- previews and drafts
- temporary interaction affordances

### 3. Clear Persistence Rules

TrackDraw should be able to answer these questions unambiguously:

- what triggers autosave
- what enters undo/redo history
- what survives a reload
- what belongs only to the current tab/session
- what is publishable

### 4. Clear Meaningful Edit Rules

TrackDraw should be able to distinguish between:

- track data edits
- interaction previews
- session-only changes
- view-only changes

That is the key to cleaner undo/redo and safer future changes.

## Recommended Direction

### 1. Split Store Responsibilities More Explicitly

TrackDraw should move toward a clearer separation between:

- persistent track data
- local editor session state
- temporary UI state

That does not require a full rewrite. It can be done incrementally.

### 2. Introduce Clearer Action Boundaries

TrackDraw should gradually formalize meaningful edit actions such as:

- add shape
- move shape
- rotate selection
- edit route section
- update project metadata

This does not require a full event-sourcing system. It just means edits become easier to understand, test, group, and observe.

### 3. Clarify Persistence Ownership

TrackDraw should make it easier to distinguish:

- what is a crash-recovery draft
- what is a named local project
- what is a restore point
- what is an account-backed project
- what is a published read-only snapshot

This is one of the highest-value usability improvements because it improves project continuity even without any new headline feature.

### 4. Improve Undo Grouping Around Intent

TrackDraw should preserve the current fast editing feel, but make undo/redo cleaner around:

- drag sessions
- rotation sessions
- path editing sessions
- grouped inspector edits

That would improve day-to-day editing quality directly.

## Concrete Implementation Direction

This should be handled as an incremental refactor with behavior-preserving checkpoints.

### Phase 1. State Ownership

Goal:

- make current boundaries explicit without changing major behavior

Phase starts when:

- the current store still mixes track data, session state, and temporary UI state in one broad surface
- there is not yet one agreed ownership table for editor state

Concrete changes:

- define and document which editor fields are `track data`, `session`, and `temporary UI state`
- stop treating `selection` as if it lives on the same conceptual level as the saved track data
- make the store API reflect those state boundaries more clearly

Likely files:

- [src/store/editor.ts](../../src/store/editor.ts)
- [src/lib/editor/store-types.ts](../../src/lib/editor/store-types.ts)
- [src/lib/editor/store-state.ts](../../src/lib/editor/store-state.ts)

Phase is done when:

- track-data-changing actions are easy to identify
- non-track-data fields are easy to identify
- no user-facing behavior regression

Checklist:

- [x] Document all current editor store fields as `track data`, `session`, or `temporary UI state`
- [x] Confirm `selection` is treated as session state, not track data
- [x] Confirm `historyPaused`, `historySessionDepth`, and `interactionSessionDepth` are treated as session state
- [x] Confirm hover, draft, preview, and camera/canvas fields are treated as temporary UI state
- [x] Update store types or naming where needed so the ownership split is obvious in code
- [x] Verify no saved design payload depends on session or temporary UI state

### Phase 2. Track Data Actions

Goal:

- make meaningful track data edits easier to reason about and test

Phase starts when:

- phase 1 ownership is clear enough to tell which store methods change track data
- the store API still mixes track-data-changing actions and UI-only setters too closely

Concrete changes:

- group track-data-changing store methods under clearer structure
- keep temporary-UI-only setters separate from track-data-changing setters
- centralize updated-at changes for track data edits where practical

Examples of track data actions:

- add, duplicate, remove, reorder, rotate, or nudge shapes
- edit route/polyline content
- update field settings
- update design metadata
- replace or create a project track

Examples of non-track-data actions:

- set hover state
- set zoom or pan
- set marquee state
- set draft path state
- set live preview patches

Likely files:

- [src/store/editor.ts](../../src/store/editor.ts)
- [src/lib/editor/shape-mutations.ts](../../src/lib/editor/shape-mutations.ts)

Phase is done when:

- the store API makes it obvious what changes the track data and what does not
- tests can target track data mutations separately from temporary UI updates

Checklist:

- [x] Identify every store method that changes `design`
- [x] Identify every store method that only changes session or temporary UI state
- [x] Group or rename track-data-changing methods so they are easier to distinguish from UI-only setters
- [x] Centralize `updatedAt` handling for track data edits where practical
- [x] Ensure track-data-changing actions do not also mutate unrelated temporary UI state unless truly necessary
- [x] Ensure temporary-UI-only setters do not affect saved project state or document history

### Phase 3. Persistence Rules

Goal:

- make project continuity easier to understand for both implementation and user behavior

Phase starts when:

- phase 2 makes it clear which changes count as real track changes
- autosave, local projects, restore points, account projects, and published shares still feel too loosely defined next to each other

Concrete changes:

- define a clear hierarchy for:
  - crash-recovery draft
  - named local project
  - restore point
  - account-backed project
  - published share
- ensure autosave is tied to track data changes rather than incidental UI state
- document how switching projects, importing, restoring, and publishing interact

Likely files:

- [src/hooks/useEditorProjects.ts](../../src/hooks/useEditorProjects.ts)
- [src/lib/projects.ts](../../src/lib/projects.ts)
- [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
- [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)

Phase is done when:

- the persistence model can be explained in one short internal diagram or table
- autosave behavior is intentionally tied to track data change boundaries
- restore/share/project flows no longer feel like parallel concepts with fuzzy overlap

Checklist:

- [x] Write down the intended role of local autosave
- [x] Write down the intended role of named local projects
- [x] Write down the intended role of restore points
- [x] Write down the intended role of account-backed projects
- [x] Write down the intended role of published shares
- [x] Confirm which actions should trigger local autosave
- [x] Confirm which actions should create or update local projects
- [x] Confirm switching/opening/restoring/importing behavior against the intended persistence hierarchy
- [x] Ensure persistence code follows track-data change boundaries rather than incidental UI updates

### Persistence Hierarchy

| Layer                  | Role                                                            | Updated by                                                               |
| ---------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Local draft            | Crash-recovery working state for the current device/tab         | Any committed track-data change once interaction/history sessions settle |
| Named local project    | Deliberate device-side continuity for reopening a project later | Track-data changes for designs with meaningful project content           |
| Restore point          | Earlier snapshot of one local/account project state             | Manual snapshot, periodic snapshot, or save-before-replace flows         |
| Account-backed project | Authenticated cross-device continuity and ownership             | Explicit sync or autosync after committed track-data changes             |
| Published share        | Read-only handoff snapshot                                      | Explicit publish action only                                             |

Autosave trigger rules in the current implementation:

- local draft writes after committed track-data revisions, not UI-only state changes
- named local project writes after committed track-data revisions when the design has meaningful project content
- restore points only write through explicit snapshot or periodic snapshot flows
- account autosync only runs for account-backed projects after committed track-data revisions
- published shares only change when the user republishes

### Phase 4. Undo And Redo Behavior

Goal:

- keep the current fast editor feel while making undo/redo cleaner

Phase starts when:

- the ownership split and persistence rules are clear enough to define what should and should not enter history
- current drag, rotate, or route-edit flows still feel noisier than they should in undo/redo

Concrete changes:

- identify which edit sessions should collapse into one history step
- treat drag, rotate, and route edit sessions as meaningful grouped edits where possible
- keep view/canvas changes out of track data history

Likely files:

- [src/store/editor.ts](../../src/store/editor.ts)
- [src/hooks/useUndoRedo.ts](../../src/hooks/useUndoRedo.ts)
- canvas interaction hooks that currently pause/resume history

Phase is done when:

- drag and rotate interactions do not create noisy history
- undo/redo behavior feels more intentional without removing precision when needed

Checklist:

- [x] Identify the current interactions that pause and resume history
- [x] Define which edit flows should collapse into one meaningful undo step
- [x] Define which edit flows should remain granular
- [x] Ensure zoom, pan, hover, and other view-only changes never pollute track data history
- [x] Verify drag sessions create clean undo behavior
- [x] Verify rotation sessions create clean undo behavior
- [x] Verify route/polyline editing history feels deliberate rather than noisy

Current grouped history sessions:

- keyboard nudge and rotate batches collapse repeated key presses into one interaction session
- inspector numeric drags collapse one pointer/edit session into one history step
- 2D rotation guide interactions commit one final rotation at pointer-up
- 3D elevation, rotation, tilt, and ladder-elevation drags commit one final track change at drag end
- view-only updates such as hover, zoom, pan, marquee previews, live shape patches, and rotation previews stay out of temporal document history

## Scope Limits

To keep this implementation tractable, the first pass should explicitly avoid:

- rewriting the whole store into multiple Zustand stores unless it proves necessary
- introducing collaboration-specific transport or CRDT concerns
- redesigning project/account UI at the same time
- changing publish/share product behavior beyond clarifying persistence ownership

This work should stay focused on editor clarity and persistence reliability.

## Why This Is Worth Doing Even Without Collaboration

This foundation work creates direct product value now:

- clearer autosave and project continuity
- less editor state confusion
- cleaner undo and redo behavior
- easier testing for fragile editing flows
- better hooks for analysis, review, and publishing improvements

It also lowers the cost of future work in:

- collaboration
- anchored review
- published gallery
- richer account-backed project behavior

## Suggested First Step

The best first step is not a full store rewrite.

It is:

1. define what belongs to persistent track data
2. define what belongs to temporary UI state
3. identify which actions should count as meaningful history entries
4. document the persistence hierarchy across local draft, local project, restore point, account project, and published share

That would already make future implementation work much safer.

## Decision Table

This is the practical baseline for implementation.

### Persisted In The Saved Design

- field settings
- shape order
- shape data
- route/path geometry
- title, description, tags, author, inventory

### Persisted Across Reload Only For Local Recovery

- current draft track
- named local projects
- restore points

### Kept Only In The Current Editor Session

- current selection
- active tool
- active preset
- history session state

### Purely Transient UI State

- hover state
- zoom and pan
- marquee state
- draft path state
- rotation preview
- group drag preview
- live shape patches

## Implementation Checklist

Use this as the short version when turning the research into work.

### Phase Order

- [x] Phase 1 complete: State Ownership
- [x] Phase 2 complete: Track Data Actions
- [x] Phase 3 complete: Persistence Rules
- [x] Phase 4 complete: Undo And Redo Behavior

### State Ownership

- [ ] Separate editor concerns into `track data`, `session`, and `temporary UI state`
- [ ] Keep `TrackDesign` and field/meta changes in the track data boundary
- [ ] Keep `selection` and history session fields out of the track data boundary
- [ ] Keep hover, preview, zoom/pan, and draft interaction fields fully temporary UI state

### Store API

- [ ] Make track-data-changing actions clearly identifiable
- [ ] Make temporary-UI-only setters clearly identifiable
- [ ] Reduce mixed actions that touch both track data and temporary UI state

### Persistence

- [x] Tie autosave to track data changes
- [x] Clarify the role of local draft, local project, restore point, account project, and published share
- [x] Verify persistence flows against open, import, restore, and publish behavior

### History

- [x] Group meaningful edit sessions more deliberately
- [x] Keep view-only changes out of undo/redo
- [x] Validate drag, rotate, and route editing history behavior

### Validation

- [ ] Check that saved design payloads only contain track data
- [ ] Check that reload/recovery behavior still works
- [ ] Check that project open/restore/import behavior still works
- [ ] Check that share/publish behavior is unaffected
- [ ] Run `npm run lint`
- [ ] Run `npm run type`

## Ready-For-Implementation Outcome

After this research pass, the implementation brief should be:

1. formalize the current store into explicit track data, session, and temporary UI state groups
2. separate track-data-changing actions from temporary-UI-only setters
3. tie autosave and persistence behavior more explicitly to track data changes
4. clean up undo/redo grouping around meaningful edit sessions

That is concrete enough to move from research into implementation.

## Recommendation

This should be treated as worthwhile foundation work, not as hidden collaboration work.

It improves TrackDraw on its own merits and makes multiple future roadmap items easier, including collaboration if that ever becomes strategically important.

## References

- Editor store: [src/store/editor.ts](../../src/store/editor.ts)
- Local project persistence: [src/lib/projects.ts](../../src/lib/projects.ts)
- Autosave and restore workflow: [src/hooks/useEditorProjects.ts](../../src/hooks/useEditorProjects.ts)
- Design serialization: [src/lib/track/design.ts](../../src/lib/track/design.ts)
- Account project API: [src/app/api/projects/route.ts](../../src/app/api/projects/route.ts)
- Published share API: [src/app/api/shares/route.ts](../../src/app/api/shares/route.ts)
