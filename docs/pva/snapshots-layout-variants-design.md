# Snapshots, Layout Variants, And Project Model Design

Date: March 20, 2026

## Summary

This document proposes the first implementation of `Snapshots + layout variants` as part of a broader local-first project model for TrackDraw.

The goal is not only to let users explore alternatives within one layout, but also to move TrackDraw away from a single implicit editor state and toward real project management inside the app:

- multiple saved projects
- variants within a project
- snapshots within a variant

This should stay local-first in v1, while leaving a clean future path toward cross-device support if that later becomes worth the added complexity.

## Problem

TrackDraw already supports:

- autosaved current work
- share links for the current design state
- export/import through JSON

What it does not support well yet:

- comparing multiple options within one project
- saving named milestones during iteration
- keeping older event layouts around across a season
- reopening and managing multiple projects over time
- sharing a deliberate frozen state instead of whatever happens to be current

The current model is too close to "whatever is in the editor right now".

## Product Goal

Users should be able to:

- keep a set of local TrackDraw projects they can manage over time
- open and manage older projects later
- create and switch between layout variants inside a project
- save named snapshots of a variant state
- understand what is current, what is saved, and what belongs to which project

The feature should strengthen the existing editor workflow without turning TrackDraw into a heavy cloud product.

## Product Principles

- Local-first in the first release
- Multiple projects before multi-user collaboration
- Deliberate saves before automatic history complexity
- A future sync path should remain possible, but should not drive v1 UX
- Import/export should continue to work as portability and backup tools

## Definitions

### Project

A top-level TrackDraw item in the project manager.

Examples:

- `April Club Race`
- `May Training Layout`
- `National Qualifier Drafts`

### Variant

A named working branch of the layout within one project.

Examples:

- `Main layout`
- `Wet weather`
- `Beginner friendly`

### Snapshot

A named saved state of one variant at a moment in time.

Examples:

- `club-night-v1`
- `marshal-safe version`
- `approved briefing state`

### Working State

The currently editable unsaved state of the active variant.

Snapshots are intentional saves. The working state may contain newer unsaved changes.

## Save Model

TrackDraw should treat working-state persistence and snapshots as two different things.

### Autosave

Autosave should persist the current working state of the active project and active variant.

That means:

- changes in the editor are saved automatically as working state
- reopening the project should restore that working state
- autosave is not the same as creating a named milestone

### Snapshots

Snapshots should remain deliberate named saves.

That means:

- a snapshot is an explicit user action
- snapshots represent meaningful milestones, not every small edit
- the snapshot list should stay readable and intention-driven

### Shortcut

Add `Ctrl/Cmd + S` as a fast save shortcut for creating a snapshot.

Why:

- it gives desktop users a natural muscle-memory action
- it keeps snapshots intentional without forcing dialog-heavy interactions every time

### Future Option

Automatic snapshots can be reconsidered later, but only at meaningful moments such as:

- before switching variants
- before restoring an older snapshot
- before share/export

They should not be created for every ordinary edit in v1.

## Scope

The first release should include:

- multiple named local projects
- one active project at a time
- multiple named variants inside one project
- one active variant at a time
- named snapshots inside each variant
- create, rename, duplicate, delete, and open project flows
- create, rename, duplicate, delete, and switch variant flows
- save snapshot from the active variant
- restore a snapshot into the active variant
- clear UI distinction between current working state and saved snapshots
- autosaved working state with deliberate manual snapshots
- `Ctrl/Cmd + S` as a snapshot shortcut

The first release should not include:

- accounts
- cloud sync
- server-backed persistence
- merge workflows
- simultaneous multi-user editing
- full revision history for every edit
- permissions or role systems
- automatic snapshot spam on ordinary edits

## Recommended Product Model

Use a simple three-level model:

- Project manager
- Variants per project
- Snapshots per variant

This is much easier to understand than trying to layer all saved states into one flat timeline or one giant local blob with no explicit project boundaries.

## UX Proposal

### 1. Project Manager

Add a local project manager where users can:

- create project
- open project
- rename project
- duplicate project
- delete project

Each project card or row should show:

- title
- last updated time
- optional field size or project subtitle later

The project manager can initially live as:

- a landing panel before entering the studio, or
- a `Projects` entry point accessible from the studio shell

For v1, either approach is acceptable as long as projects are visibly first-class.

### 2. Project-Level Entry In Studio

Inside the studio, the active project should be visible at the shell level, not buried in inspector UI.

The shell should make it clear:

- which project is open
- which variant is active
- whether the active variant has unsaved changes

### 3. Variant Panel

The first version should use a compact panel or dialog, not a permanent sidebar.

Each variant row should show:

- name
- active state
- unsaved/saved status
- snapshot count
- optional “shared” badge later

Core actions:

- switch
- rename
- duplicate
- delete
- create new variant from current

### 4. Snapshot Panel

Snapshots should live inside the selected variant context.

Each snapshot row should show:

- snapshot name
- created time
- optional note later, not in v1

Core actions:

- save snapshot
- restore snapshot
- rename
- delete

### 5. Working-State Clarity

The UI must make this obvious:

- current project
- current active variant
- current working state
- saved snapshots

The distinction between `autosaved current state` and `named snapshots` should be explicit.

If the active variant has unsaved changes since the latest snapshot, show a simple dirty indicator.

### 6. Share Relationship

Do not overload the first release by fully shipping `share snapshots`, but prepare the model for it.

For now:

- standard sharing still uses the current active variant state
- future work can allow “share this snapshot” explicitly

### 7. Mobile Access

On mobile, project access should live in the tools drawer rather than the header.

Why:

- the mobile header is already compact and task-focused
- project actions are workspace-level actions, not top-level navigation controls
- the tools drawer is a more natural home for project and file management on small screens

Recommended shape:

- desktop: `Projects` entry remains available in header chrome
- mobile: `Projects` entry appears in the tools drawer under the project section

## Mental Model Rules

These rules should stay consistent:

- opening a project changes the active editable workspace
- switching variants changes the active editable layout inside that project
- snapshots do not update automatically
- restoring a snapshot overwrites the current active variant state
- autosave applies to the current working state of the active project and active variant
- undo/redo only concerns the current active variant session

## Data Model Proposal

TrackDraw should move from a single stored `TrackDesign` toward a local-first project collection.

Recommended shape:

```ts
type TrackProjectsState = {
  projects: TrackProject[];
  activeProjectId: string | null;
};

type TrackProject = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  activeVariantId: string;
  variants: TrackVariant[];
};

type TrackVariant = {
  id: string;
  name: string;
  design: TrackDesign;
  snapshots: TrackSnapshot[];
  createdAt: string;
  updatedAt: string;
};

type TrackSnapshot = {
  id: string;
  name: string;
  design: TrackDesign;
  createdAt: string;
};
```

Notes:

- `TrackDesign` remains the core canvas payload
- projects, variants, and snapshots all get stable ids
- timestamps should exist from the start
- this keeps the model future-compatible with sync, even if v1 remains fully local

## Persistence Strategy

For the first release:

- persist the full `TrackProjectsState` in local storage
- stop treating local storage as one implicit editor state
- keep export/import backward compatible where possible

Recommended import/export behavior:

- existing JSON import should still accept old single-design files
- importing a design file should let TrackDraw create a project from it
- current JSON export can remain active-design export for compatibility
- full project export can be considered later once the model stabilizes

The safer v1 move is:

- keep today’s JSON as active-design portability
- store the projects state locally
- postpone project-manager export and sync

## Cross-Device Future Compatibility

Cross-device use is a meaningful future direction, but not something v1 should implement directly.

The right v1 posture is:

- local-first behavior
- sync-friendly identifiers and timestamps
- no backend dependency

That means the project model should not block a later path such as:

1. local-first project manager
2. improved manual portability through project export/import
3. optional cloud backup or account-linked sync later

Do not design v1 around realtime sync, but do avoid a local model that would need to be torn apart later.

## Undo/Redo Considerations

Undo history should not span across project or variant switches.

Recommended behavior:

- each active variant session has its own current design state
- switching project or variant resets undo/redo to that context
- restoring a snapshot starts a new undo chain from the restored design

This is simpler and easier to trust.

## Migration Strategy

Existing users already have a single saved design in local storage.

Migration path:

- wrap the existing stored design into a default project
- create one default variant, for example `Main`
- set that project as active
- start with zero snapshots
- initialize the projects state with that one migrated project

This migration should be automatic and silent.

## Edge Cases

- The last remaining project should not be deletable unless a new blank project is created automatically
- Deleting the active project should safely switch or create another project
- The last remaining variant in a project should not be deletable
- Restoring a snapshot should confirm if there are unsaved changes
- Snapshot names do not need to be globally unique, but duplicate names within one variant should be discouraged
- Very large project libraries may hit local-storage limits earlier than today

## Risks

- Mixing project-level structure with current single-design assumptions in store code
- Confusion between autosave, snapshots, and full project persistence
- Local-storage limits becoming visible earlier as users keep more projects and snapshots
- Export/import ambiguity if project files and design files are conflated too early

## Constraints And Recommendations

To keep the feature tractable:

- do not build accounts in v1
- do not build cloud sync in v1
- do not build a full version-control metaphor
- do not build nested branching
- do not expose too many project metadata fields too early
- consider a soft warning later if the local project set becomes very large

## Suggested Implementation Phases

### Phase 1: Internal Project Model

- Introduce `TrackProjectsState`, `TrackProject`, variants, and snapshots
- Migrate existing local storage
- Switch editor store to active project + active variant design

### Phase 2: Variant And Snapshot Foundations

- Create/switch/rename/duplicate/delete variants
- Save, restore, rename, and delete snapshots
- Show active and dirty state

### Phase 3: Project Library UX

- Local project list
- Open/create/rename/duplicate/delete project flows
- Clear studio entry and active-project context

### Phase 4: Integration Polish

- Clarify import/export behavior
- Improve empty states and microcopy
- Add future hook points for `share snapshots` and improved project portability

## Acceptance Criteria

The feature is successful if:

- users can keep multiple projects over time inside TrackDraw
- users can compare multiple layout approaches in one project
- users can preserve named milestones without leaving the browser
- the difference between project, variant, snapshot, and current working state is understandable
- the model remains local-first while staying plausible for future cross-device evolution

## Follow-Up Features Enabled By This Work

- Share snapshots
- Better project export
- Cross-device portability
- Briefing export from a chosen variant
- Validation comparison between variants
- Template-based project starts

## Recommendation

Build toward this project model before adding heavier sharing or account systems.

It delivers immediate value for real TrackDraw use, especially when users want to revisit layouts across a season, and it creates a cleaner foundation for later features such as share snapshots, project portability, and eventual cross-device support.
