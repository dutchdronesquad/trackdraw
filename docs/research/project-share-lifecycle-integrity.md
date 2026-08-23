# Project/Share Lifecycle Integrity

Date: August 24, 2026

Status: decided — Fix 1 and Fix 2 Option B approved for implementation. Option C stays a separate, still-open roadmap item (see ROADMAP.md item 1) and is intentionally not bundled here.

## Purpose

This document proposes fixes for two related gaps between projects and shares, found while investigating why a new account showed `0 projects` / `1 share`:

1. Archiving a project does not revoke its shares, so a share can keep working after its project is gone.
2. A signed-in user can publish a share for a design that was never saved as an account project, so `shares.project_id` and `shares.owner_user_id` can diverge from `projects` entirely. This second gap is not a bug against current code, but it does contradict the account model already agreed in [accounts-project-sync.md](accounts-project-sync.md) ("Published shares should attach to a project") and reflects the still-open question in [ROADMAP.md](../roadmap/ROADMAP.md) item 1.

Both are proposed as independent slices — fix 1 can ship on its own regardless of what happens with fix 2.

## Fix 1: Revoke shares when a project is archived

### Problem

`archiveProjectForUser` (`src/lib/server/projects.ts:341-357`) only sets `archived_at` on the project. It never touches `shares`. A share created with a `project_id` pointing at that project stays `active` in `getUserContextStats` (`src/lib/server/users.ts:308-368`) and keeps resolving publicly — a "ghost link" for a project the owner considers gone.

### Recommendation

When a project is archived, revoke every share still pointing at it.

- Add a step to `archiveProjectForUser` that runs, in the same transaction as the `archived_at` update:
  `update shares set revoked_at = now() where project_id = ? and revoked_at is null`
- Reuse the existing `revoked_at` column and revocation semantics already used elsewhere in `src/lib/server/shares.ts` — no new share state is introduced.
- Do the same for any hard-delete project path, if one exists, for consistency.
- Unarchiving (if that exists) should not un-revoke shares automatically — treat revocation as final, matching how manual share revocation already behaves.

### Risk and scope

Low risk. It's an additive write inside an existing mutation, using an existing column and existing query semantics. No schema migration needed. No client changes needed — a revoked share already renders as "no longer available" wherever that's handled today.

### Existing data

The code change only affects archive actions going forward. Projects already archived before this ships keep any still-active shares as-is unless a one-time backfill runs:

`update shares set revoked_at = <now> where revoked_at is null and project_id in (select id from projects where archived_at is not null)`

This backfill is included as part of this fix — it's a direct application of the same invariant, not a separate decision.

### Test plan

- Archive a project with an active published share → share becomes unreachable and `activeShareCount` drops.
- Archive a project with no shares → no-op, unchanged behavior.
- Archive a project with an already-revoked share → no-op on that row.

## Fix 2: Decide what "share" means relative to "project"

### The actual disagreement to resolve

Two coherent models exist. Today's code implements neither one consistently — it lets a share exist with `project_id = null` while `owner_user_id` is set, which is the "share is independent of project" model, but the rest of the product (project management, "my projects" counts, `accounts-project-sync.md`) assumes the other model.

**Option A — Share stays independent of project (current behavior, keep and document it)**

Sharing a design is a lightweight, always-available action, whether or not the design has ever been saved as an account project. This is intentionally decoupled so a user can share fast without a save step in the way.

- No code change required beyond Fix 1.
- Requires only a UX/labeling fix: `getUserContextStats` and any dashboard should stop implying a share always corresponds to a saved project. If there's an admin or profile view that lists shares next to projects, it should show "design not saved as a project" rather than nothing, so it doesn't read as broken.

**Option B — Auto-promote to a project the moment a signed-in user shares (recommended)**

When a signed-in user shares a design that has no `projectId` yet, silently create the account project first (same as pressing "Sync to account"), then attach the share to it. This is the smaller, more contained version of "auto-create," scoped to the one moment where the product already promises project-backed shares.

- Matches `accounts-project-sync.md`'s existing decision: "Published shares should attach to a project, and that project can in turn belong to an account."
- Does not require resolving the harder, still-open ROADMAP question of auto-creating a project on _every_ first edit for signed-in users — it only fires at share time, which is a narrower, lower-risk surface.
- Implementation sketch:
  - In `src/app/api/shares/route.ts`, before calling `createShare`, if `user` is present and `body.projectId` is absent, call a new `ensureAccountProject(user.id, design)` helper (in `src/lib/server/projects.ts`, alongside `createProjectDuplicate`) that creates the project row using the same path `handleSyncProject` uses client-side (`useAccountProjectSync.ts:647-702`), then use the resulting id as `projectId`.
  - Client-side `ShareDialog.tsx` doesn't need to change — it can keep omitting `projectId` when none exists yet; the server fills the gap.
  - After this ships, a share with `owner_user_id` set and `project_id = null` should no longer be created going forward. Existing rows in that state are left alone (see Migration below).

**Option C — Full auto-create-project-on-first-edit (out of scope here)**

This is ROADMAP item 1 in full: every signed-in user's design becomes an account project as soon as they start working, not just at share time. It's the most product-visible change (affects Project Manager's device/account split, autosync triggers, first-run experience) and should stay a separate roadmap decision, not bundled into this lifecycle fix. Option B is compatible with Option C landing later — nothing in B needs to be undone if C ships afterward.

Tracked separately: [#773](https://github.com/dutchdronesquad/trackdraw/issues/773).

### Decision

Option B, approved. It resolves the specific inconsistency (`0 projects`, `1 share`) without waiting on the bigger, still-open auto-sync-on-edit decision, and it's a direct implementation of a decision already made in `accounts-project-sync.md`. Option C remains a separate roadmap decision, to be made alongside broader accounts/project UX work (Project Manager redesign, onboarding), not as a side effect of this fix.

### Migration for existing data

Do not backfill `projects` rows for existing shares that have `project_id = null`. Retroactively creating projects for old shares would fabricate ownership history and project timestamps that never existed. Leave existing orphaned-by-design shares as they are; Option B only changes behavior for shares created after the change ships.

### Resolved: project visibility after auto-promote

`ensureAccountProject` creates a real, fully visible account project — identical to what "Sync to account" produces — not a hidden row that only exists to satisfy the share's `project_id`. This keeps the account model consistent with `accounts-project-sync.md`, which argues against hiding account-backed state from users.

## Suggested sequencing

1. Ship Fix 1 (archive cascade) — independent, low-risk, no product decision needed.
2. Get a decision on Fix 2 (Option A vs B) — B is recommended.
3. If B is accepted, implement `ensureAccountProject` and wire it into the share route.
4. Leave Option C (full auto-create-on-edit) on the roadmap as its own item, informed by whatever is learned from B.
