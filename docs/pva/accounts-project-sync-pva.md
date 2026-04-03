# Accounts And Project Sync PVA

Date: April 1, 2026

Status: first account foundation shipped; authentication and storage recommendation defined

## Purpose

This document defines the intended product shape for accounts, project sync, and project ownership after the first Better Auth release.

TrackDraw now has the first account layer in place:

- email magic-link sign-in
- in-app profile management
- account deletion
- account entry points in desktop and mobile Studio shells

The next step is not "more auth" in the abstract. The next step is defining how projects should behave once accounts exist, especially for users who plan at home and later reopen or adjust the same layout from another device on race day.

## Product Goal

Accounts should make ordinary TrackDraw projects feel continuous across devices without turning TrackDraw into an auth-first product.

That means:

- projects still feel like one simple concept
- signing in adds continuity and ownership rather than introducing a second product mode
- a user can start on desktop and later reopen the same work on mobile
- published shares become easier to revisit and manage over time

## Core Product Position

TrackDraw should keep speaking about `projects`, not separate local versus cloud project types.

The storage behavior changes by account state, but the product language should stay simple:

- logged out: projects live on this device
- signed in: projects sync with the user's account

The main value of signing in is exactly that continuity. There is little product value in asking an authenticated user to manually opt in to cloud save on every project.

## Recommended Model

### 1. One Project Concept

In the UI, TrackDraw should treat a project as one thing regardless of storage state.

Avoid introducing user-facing categories like:

- local project
- cloud project
- synced project

Those are implementation details. The user should just work on a project.

### 2. Logged-Out Behavior

When a user is not signed in:

- projects remain device-local
- autosave, restore points, and local project management continue as they do today
- import/export and one-off publish flows remain available

This preserves TrackDraw's local-first foundation.

### 3. Signed-In Behavior

When a user is signed in:

- projects should sync with the user's account by default
- cloud-backed continuity should be the expected behavior, not a special opt-in mode
- local browser data should still exist as the working copy, cache, and resilience layer

For signed-in users, the account-backed copy should be treated as the canonical project state.

This gives accounts a clear purpose:

- reopen the same work on another device
- keep ownership attached to the account
- support better project and share management later

### 4. Share Ownership

Published shares should attach to a project, and that project can in turn belong to an account.

That gives TrackDraw a clearer model than treating shares as free-floating account artifacts:

- a share is a published state of a project
- account ownership follows from the project relationship

This should make future share management easier without complicating one-off local publishing.

## Important Transition Problem

The hardest product edge is what happens when a user signs in on a device that already has local projects.

TrackDraw should not silently absorb those existing local projects into the account the moment the user signs in.

Why:

- it creates an unexpected ownership change
- it makes the source-of-truth transition unclear
- it increases the chance of confusion if users expect device-local history to remain device-local

## Recommended Transition Model

### Existing Local Projects

When a user signs in on a device with pre-existing local projects:

- keep those projects visible on the device
- do not silently migrate them into the account
- provide a clear follow-up action to bring them into account-backed sync

This keeps the transition deliberate without making the account model feel fragile.

### Signed-In Project Management

For signed-in users, the project management surface should likely prioritize account-backed projects first.

Device-only projects that predate sign-in should remain accessible, but they should not blur into the main synced list.

Preferred direction:

- primary section: account-backed projects
- secondary section: projects on this device

That is clearer than:

- a pure cloud-only model that hides local reality
- or one mixed list where synced and unsynced items become ambiguous

## Sync Status Expectations

Even if TrackDraw keeps a single `project` concept, project management still needs to make sync state understandable.

At minimum, users should be able to understand:

- whether a project is already tied to their account
- whether a project only exists on the current device
- whether sync is in progress
- whether the most recent sync failed

This should be shown in project-management surfaces, not necessarily overloaded into every editor control.

## Sign-Out Behavior

Signing out should:

- end the account session
- stop active project sync

Signing out should not by default:

- clear ordinary local project data
- wipe restore points
- erase device-local work history

If a previously synced project still has a device-local copy, that copy can remain available after sign-out.

The important product behavior is:

- the project remains available on this device
- account sync resumes only after signing in again

If TrackDraw later adds a privacy-focused option, it should be a separate explicit action such as:

- `Sign out and clear this device`

That should not be the default sign-out behavior.

## UX Direction

The model should feel like this:

- TrackDraw always has projects
- signing in makes those projects follow you
- shares become easier to trust and manage because they belong to real project ownership
- local fallback still protects users from losing work when sync is unavailable

Avoid making the UI feel like a storage admin tool.

The user should not need to think in terms of:

- local database
- cloud copy
- sync engine
- canonical versus cache state

Those concepts matter to the implementation, but the product should surface them only when necessary.

## Recommended First Delivery Slice

### Phase 0: Lock the model

- keep `project` as the only primary user-facing concept
- treat signed-in projects as account-backed by default
- keep logged-out projects device-local
- define sign-out as session removal, not device cleanup

### Phase 1: Account-backed project list

- add a first account-backed project list for signed-in users
- allow reopening projects across devices
- keep device-local project management available

### Phase 2: Existing-local-project transition

- surface pre-existing device-local projects separately for signed-in users
- add an explicit action to bring those projects into account-backed sync
- avoid silent migration on sign-in

### Phase 3: Sync status visibility

- show understandable project state in management surfaces
- include statuses such as synced, device-only, syncing, and sync failed
- surface last successful sync time where it materially helps trust

### Phase 4: Share ownership follow-up

- attach published shares more clearly to project ownership
- let users revisit and manage previous publishes with less ambiguity

## Recommended End State

The target product state should look like this:

- TrackDraw still feels local-first when no account is present
- signing in immediately makes projects cross-device and owner-backed
- users do not need to choose between "local project mode" and "cloud project mode"
- existing device-local work remains safe and understandable during the transition into accounts
- publish and share workflows become easier to manage because they are tied to real project ownership

This is the account model that best matches TrackDraw's actual product value: continuity, ownership, and calmer project management rather than auth for its own sake.

## Authentication And Storage Recommendation

TrackDraw should continue as a local-first product with account-backed sync and ownership for signed-in users.

This is the recommended product and storage model:

- logged out: device-local projects remain the default and fully usable
- signed in: projects sync to the user's account by default in practice
- local browser storage remains the working copy, offline buffer, and resilience layer
- the account-backed project record is the canonical durable state for signed-in users

This means TrackDraw should not choose either extreme:

- not local-only forever, because that weakens the main value of signing in and leaves cross-device continuation too fragile
- not cloud-only, because that breaks the product's local-first safety and makes venue-side use less dependable

## Why This Recommendation Fits TrackDraw

### 1. It matches the product's real reason for accounts

TrackDraw is not trying to become a generic team workspace.

The clearest user value from authentication is:

- reopen the same project on another device
- keep ownership attached to the right person
- manage published shares and future account-backed records with less ambiguity

If signing in does not materially improve continuity and ownership, the auth layer adds complexity without enough return.

### 2. It preserves the local-first safety model

Track planning often happens in imperfect environments:

- unstable venue connectivity
- device switching close to race day
- users who want quick use without account setup

Keeping a device-local working copy protects TrackDraw from feeling brittle when network access, auth state, or sync reliability is imperfect.

### 3. It keeps the UI simple

Users should not need to choose between:

- local mode
- cloud mode
- backup mode

The product stays simpler if TrackDraw presents one `project` concept and lets account state determine the storage behavior behind the scenes.

## Explicit Product Boundary

TrackDraw should adopt this boundary for the near term:

### In scope

- device-local projects without sign-in
- automatic account-backed continuity for signed-in users
- explicit sync follow-up for local projects that existed before sign-in
- visible sync/conflict/error states in project management
- account ownership for published shares

### Out of scope for now

- mandatory login before editing
- a user-facing split between separate local and cloud project types
- manual per-project cloud-save toggles as the default model
- multi-user live collaboration
- team workspaces, clubs, or shared libraries as part of the first account decision

## Recommended Technical Posture

The technical recommendation should stay aligned with the product model:

- Better Auth remains the current authentication layer
- email magic-link stays the default sign-in method for now
- passkeys are a reasonable follow-up improvement, not a prerequisite for the product model
- browser-local persistence remains required even for signed-in sessions
- sync logic should treat the server copy as canonical for signed-in users, while preserving local resilience and explicit conflict handling

This keeps the architecture proportional to the product:

- enough backend state for continuity and ownership
- enough local state for safety and usability
- no need yet for a heavier collaboration-first sync architecture

## Decision Outcome

The roadmap recommendation should therefore be:

- do not stop at the first auth foundation
- do not expand accounts into a broad collaboration platform yet
- continue with a bounded account-backed continuity model

That gives TrackDraw a clear next-stage position:

- local-first by default
- account-backed when signed in
- ownership-aware where it matters
- still lightweight enough to use without ceremony

## Recommended Next Slices After This Decision

Once this recommendation is accepted, the next work should focus on depth within the same model rather than reopening the auth question again.

Priority follow-up:

- tighten sync trust and recovery, especially around failed sync, conflict resolution, and last-known-good local fallback
- refine account project management so account-backed and device-only items stay understandable without feeling like two separate products
- continue share lifecycle improvements around account ownership and project attachment

Defer until the above feels solid:

- comments and review mode
- venue library and constraints
- shared template libraries
