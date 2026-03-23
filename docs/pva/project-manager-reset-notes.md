# Project Manager Reset Notes

## Why This Was Rolled Back

The first implementation of project management pushed too many open decisions into the UI at once:

- desktop dialog tried to mix project browsing and project management
- mobile drawer inherited too much desktop structure
- export and project surfaces drifted away from the rest of the studio chrome
- it was still unclear where `Projects` should live as a persistent product concept

For now, the code has been rolled back so the studio returns to a single-design flow.

## Approximate Design Direction We Tested

The project dialog concept was roughly:

- desktop:
  - split view
  - left column with local projects
  - right column with selected project details
  - variants and snapshots managed inside the selected project
- mobile:
  - entry from the tools drawer
  - bottom drawer surface instead of a desktop-style dialog
  - selected project plus variants and snapshots in the same drawer flow

The internal information model behind that concept was:

- project
  - title
  - metadata
  - active variant
- variant
  - current working design
  - snapshots
- snapshot
  - named milestone
  - restorable state

## What Needs To Be Decided Before Rebuilding

1. What is the primary user mental model?
   - single current track with optional history
   - or true multi-project workflow

2. Where does `Projects` live in the product?
   - header action on desktop
   - tools drawer action on mobile
   - dedicated overview page
   - or a mix of those with one primary entry

3. What is the correct scope for v1?
   - just local project switching
   - or also variants and snapshots

4. What should be the relationship between:
   - autosave
   - variants
   - snapshots
   - export/import

5. What should mobile optimize for?
   - quick switching between projects
   - variant management
   - snapshot restore
   - or only lightweight access with deeper management elsewhere

## Suggested Next Design Pass

Before re-implementing, define:

- primary surfaces
  - where projects are opened and managed
- visibility rules
  - desktop vs mobile entry points
- hierarchy
  - project vs variant vs snapshot
- minimal interaction set for v1
  - create
  - open/switch
  - rename
  - duplicate
  - delete
- explicit non-goals for v1

## Product Visibility Questions

If this returns, these are the most likely places it becomes visible:

- desktop header
- mobile tools drawer
- optional future dedicated `Projects` surface
- import/export flow if project files become first-class again
