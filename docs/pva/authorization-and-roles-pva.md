# Authorization And Roles PVA

Date: April 18, 2026

Status: approved

## Decision Summary

Recommended decision:

- approve separate product-definition work for roles, authorization, and moderation
- do not treat gallery moderation as an isolated special case
- define a small account-role model now so future public and administrative features share one foundation
- treat ownership and role-based authority as separate concerns

This document is intended to frame roles and authorization as a platform decision, not just a gallery implementation detail.

## Approval Recommendation

TrackDraw should approve this foundation for later implementation planning only if the team accepts the following first shape:

- one global account role per user in v1
- ownership remains the main source of authority over user-created resources
- elevated moderation or platform actions come from explicit roles
- server-side capability checks are the enforcement model, even if the first storage model is simple

TrackDraw should not approve this work yet if the team expects any of these in v1:

- public self-service moderator programs
- user-facing role marketplaces or organization hierarchies
- client-side authorization as a trusted source of truth
- highly granular custom permission builders

## Delivery Checklist

- [x] Phase 0: lock the conceptual model
- [x] Phase 1: define roles, ownership, and capabilities
- [x] Phase 2: define first protected actions and enforcement rules
- [x] Phase 3: define storage and role-assignment approach
- [x] Phase 4: decide whether to implement now or later — **implement now**

## Go / No-Go Criteria

Go for implementation planning if:

- the team expects more than one future feature to need elevated account authority
- ownership versus platform authority is accepted as a real product distinction
- server-side authorization helpers are considered necessary rather than optional cleanup
- the team wants a small but extensible model instead of repeated special-case checks

No-go or keep parked if:

- the only real near-term need is one tiny gallery-only admin check
- the team wants to keep using ad hoc allowlists indefinitely
- platform-level authority is still too undefined to model responsibly

## Purpose

This document defines the intended product shape for TrackDraw account roles and authorization.

The immediate trigger may be gallery moderation and featuring, but the underlying need is broader:

- moderation authority
- featured content curation
- platform support tools later
- future admin-only settings or operations
- potential project, account, or public-surface controls beyond the gallery

This should be handled as a reusable product foundation rather than as a narrow one-off rule set.

## Product Goal

TrackDraw should gain a clear and durable authorization model that:

- keeps ordinary user ownership simple
- supports elevated moderation and platform actions cleanly
- avoids scattered `isAdmin` checks becoming the long-term architecture
- remains small enough to implement without becoming a permissions platform

## Core Product Position

TrackDraw should distinguish between:

- ownership authority
- account role
- capability enforcement

These are related, but not the same thing.

Recommended model:

- ownership answers `is this the user's content?`
- role answers `what kind of platform authority does this account have?`
- capability answers `may this user perform this action on this resource in this context?`

## Recommended Roles Model

### 1. Keep The First Global Role Set Small

Recommended first roles:

- `user`
- `moderator`
- `admin`

Intent:

- `user` is the default account role
- `moderator` handles content and public-surface review actions
- `admin` handles broader platform control and role assignment later

Do not start with a large role catalog.

### 2. Ownership Should Handle Ordinary Content Control

Ownership should remain the main authority for ordinary user-created resources.

Examples:

- project owner can edit their own project
- share owner can revoke their own share
- gallery-entry owner can unlist their own gallery entry

These actions should not require moderator or admin roles.

### 3. Elevated Actions Should Not Piggyback On Ownership

Some actions are platform authority, not content ownership.

Examples:

- hide someone else's gallery entry
- mark an entry as featured
- review or resolve reports
- assign elevated roles later

Those actions should be granted through explicit elevated roles and capability checks.

## Capability Direction

TrackDraw does not need a user-facing custom-permissions system, but it should think internally in capabilities.

Example capability direction:

- `gallery.entry.hide`
- `gallery.entry.feature`
- `gallery.report.review`
- `account.role.assign`

Roles then map to capabilities.

This keeps server-side authorization readable and extensible.

## Recommended V1 Mapping

### User

Expected authority:

- manage own projects
- manage own published shares
- opt own shares into the gallery if allowed
- unlist own gallery entries
- file reports

### Moderator

Expected authority:

- hide or unhide gallery entries
- feature or unfeature gallery entries
- review and resolve gallery reports

Moderators should not automatically gain every platform-level action.

### Admin

Expected authority:

- everything a moderator can do
- manage elevated roles later
- perform broader platform-level interventions when necessary

Admin should remain meaningfully broader than moderator.

## First Protected Actions To Model

The first implementation-worthy actions are likely:

- owner unlist own gallery entry
- moderator hide gallery entry
- moderator feature gallery entry
- moderator review gallery report
- admin assign or revoke elevated role later

If the team cannot define these actions clearly, the broader model is not ready yet.

## Gallery-State-Aware Protected Actions

The gallery PVA now assumes the following first state direction:

- `link_only`
- `gallery_visible`
- `featured`
- `hidden`

The authorization model should be able to express who may move an entry between those states.

Recommended first action direction:

- owner may move own entry from `link_only` to `gallery_visible`
- owner may move own entry from `gallery_visible` to `link_only`
- moderator may move entry from `gallery_visible` to `featured`
- moderator may move entry from `featured` back to `gallery_visible`
- moderator may move entry from `gallery_visible` or `featured` to `hidden`
- moderator may restore entry from `hidden` to `gallery_visible`

Recommended first rule:

- owner should not be able to self-feature
- owner should not be able to unhide a moderator-hidden entry
- moderation state should override normal owner gallery visibility controls while the moderation action remains active

This keeps curation and moderation distinct from normal ownership actions.

## First Capability Matrix

The first useful capability set should map directly to the gallery actions already defined in the gallery PVA.

Recommended first internal capabilities:

- `gallery.entry.publish`
- `gallery.entry.unlist_own`
- `gallery.entry.hide`
- `gallery.entry.unhide`
- `gallery.entry.feature`
- `gallery.entry.unfeature`
- `gallery.report.create`
- `gallery.report.review`
- `account.role.assign`

Recommended first role mapping:

- `user`
  - `gallery.entry.publish` on owned eligible shares only
  - `gallery.entry.unlist_own`
  - `gallery.report.create`
- `moderator`
  - `gallery.entry.hide`
  - `gallery.entry.unhide`
  - `gallery.entry.feature`
  - `gallery.entry.unfeature`
  - `gallery.report.review`
- `admin`
  - everything a moderator can do
  - `account.role.assign`

Ownership should still gate user actions:

- a normal user can only publish or unlist their own gallery entry
- a normal user cannot affect another user's gallery state

## Resource-Centric Action Matrix

To keep the model actionable for engineering, TrackDraw should define permissions per resource type rather than only as abstract role descriptions.

The first useful resource set is:

- project
- published share
- gallery entry
- gallery report
- account role

### Project

Primary rule:

- projects are ownership-driven in v1

Expected actions:

- owner can read, edit, rename, export, archive, and delete own project
- non-owner user has no project authority by default
- moderator has no automatic authority over someone else's private project
- admin intervention on projects should remain exceptional and out of normal gallery scope

Recommended capability posture:

- ordinary project actions should not require elevated platform role checks
- project authority should stay primarily outside the moderation model

### Published Share

Primary rule:

- a share belongs to the owner who published it

Expected actions:

- owner can create, update, revoke, and republish own share
- owner can keep a share `link_only` or opt it into gallery visibility if eligible
- moderator does not automatically gain authority to revoke someone else's share in v1
- admin may need broader share intervention later, but that should be treated as a separate platform action

Recommended first boundary:

- gallery moderation acts on gallery visibility first
- share revocation remains a distinct and heavier action

### Gallery Entry

Primary rule:

- gallery entries combine ownership actions with moderation and curation actions

Expected owner actions:

- publish own eligible share into gallery visibility
- unlist own gallery entry back to `link_only`
- update own gallery-facing metadata when not blocked by moderation state

Expected moderator actions:

- hide or unhide gallery entry
- feature or unfeature gallery entry
- review entry in response to reports

Expected admin actions:

- everything a moderator can do
- broader intervention if TrackDraw later needs stronger public-surface control

Recommended first boundary:

- owner controls participation
- moderator controls discoverability and curation
- admin controls the authority model itself

### Gallery Report

Primary rule:

- reports are open to ordinary signed-in users
- resolution is moderator-or-admin only

Expected actions:

- signed-in user can create report
- report author does not gain moderation authority over the entry
- moderator can review, resolve, and close reports
- moderator can take a related entry action such as hide or unfeature
- admin can do everything a moderator can do

Recommended first boundary:

- report creation is lightweight
- report resolution is a protected moderation action

### Account Role

Primary rule:

- account role is itself a protected resource

Expected actions:

- ordinary users cannot assign or elevate roles
- moderator does not automatically gain role-assignment authority
- only admin may assign or revoke elevated roles in v1

Recommended first boundary:

- role changes are rare, explicit, and server-controlled
- role assignment should never piggyback on ordinary content-management flows

## Compact Capability-to-Resource Mapping

The first model should be understandable in a simple matrix.

Recommended first direction:

- `gallery.entry.publish`
  - actor: owner of eligible share
  - resource: own gallery entry / share
- `gallery.entry.unlist_own`
  - actor: owner
  - resource: own gallery entry
- `gallery.entry.hide`
  - actor: moderator or admin
  - resource: any gallery entry
- `gallery.entry.unhide`
  - actor: moderator or admin
  - resource: any hidden gallery entry
- `gallery.entry.feature`
  - actor: moderator or admin
  - resource: any gallery-visible entry
- `gallery.entry.unfeature`
  - actor: moderator or admin
  - resource: any featured entry
- `gallery.report.create`
  - actor: signed-in user
  - resource: any gallery entry
- `gallery.report.review`
  - actor: moderator or admin
  - resource: any gallery report
- `account.role.assign`
  - actor: admin
  - resource: any account role assignment target

This is not a complete future matrix for the whole product. It is the first concrete slice that makes the current gallery and moderation decisions enforceable.

## Gallery Moderation And Report Handling

The gallery PVA defines the following minimum report reasons:

- `inappropriate`
- `spam`
- `copyright / stolen`
- `broken / low quality`

The authorization model should support at least these operational actions:

- user creates a report on a gallery entry
- moderator reviews the report
- moderator leaves the entry visible
- moderator hides the entry
- moderator unfeatures the entry if needed
- moderator restores a previously hidden entry later

Recommended first principle:

- report creation is open to ordinary signed-in users
- report resolution is moderator-or-admin only
- report resolution and gallery-state changes should be treated as separate but related actions

That keeps the system flexible:

- a moderator may review a report and do nothing
- a moderator may hide the entry
- a moderator may only remove `featured` status without hiding the entry

## Gallery-Centric Ownership Rules

To avoid ambiguity, the first model should explicitly state which gallery actions are ownership-based.

Ownership-based actions:

- publish own eligible share to the gallery
- unlist own gallery entry
- update own gallery-facing metadata if the entry is not hidden by moderation
- revoke own underlying share

Role-based actions:

- feature someone else's entry
- unfeature someone else's entry
- hide someone else's entry
- unhide someone else's entry
- review and resolve reports

This should remain true even if the same person happens to be both the owner and a moderator. The action should still be understood by category:

- owner action
- moderator action

That makes permission reasoning and auditability easier later.

## Recommended V1 Storage Shape

The preferred first storage shape is:

- one persisted account role on the user record

Recommended first values:

- `user`
- `moderator`
- `admin`

Why this is the right first storage model:

- simple enough to implement safely
- expressive enough for the first moderation and curation needs
- easier to reason about than a many-to-many role system
- compatible with a capability-based authorization layer above it

This should be treated as a deliberate first model, not as a throwaway shortcut.

### Schema And Migration Behavior

The role field should be non-nullable with a default of `user`.

- do not use nullable to represent the default role — that creates two ways to express the same state
- all existing accounts receive `user` as their role when the migration runs
- the allowlisted bootstrap account receives `admin` in the same migration or a follow-up migration immediately after

This keeps the field simple: every account always has exactly one role.

## Temporary Bridge Versus Real Product Model

Because the role field is added via a migration from the start, there is no need for a temporary allowlist or environment variable bridge in production.

Not acceptable as the long-term product model:

- permanent reliance on environment-configured elevated accounts
- client-side role assumptions
- feature-specific hidden allowlists spread through multiple routes

If a bridge is needed during local development before the migration is applied, it should behave as a short-lived local shortcut only — never deployed to production.

## Role Assignment Direction

TrackDraw should define explicitly who may assign elevated roles.

Recommended first rule:

- only `admin` may assign or revoke `moderator`
- only `admin` may assign or revoke `admin`

Recommended first policy:

- no self-service elevation
- no peer-assigned moderator model
- no automatic promotion from account age, activity, or public behavior

This keeps elevated authority intentional and accountable.

## Role Assignment Workflow Recommendation

The first role-assignment workflow does not need a polished end-user admin console, but it does need a real operational model.

Recommended first workflow:

1. an existing admin identifies the target account
2. the admin assigns or changes the target account role through a trusted server-side path
3. the system stores the new role persistently
4. future requests resolve permissions from the stored role

Possible first implementation surfaces:

- a simple internal admin tool
- an admin-only route later
- a temporary server-side operational script if needed

The important product rule is not the UI polish. The important rule is that assignment is explicit, intentional, and server-controlled.

### First Admin Bootstrap

Once the role migration has run, promoting the first admin is a direct database operation.

**Production**: run the following SQL via the Cloudflare D1 dashboard.

```sql
UPDATE user SET role = 'admin' WHERE email = 'your@email.com';
```

**Preview** (`npm run preview`, uses remote `trackdraw-dev`):

```bash
wrangler d1 execute DB --remote --env dev --command "UPDATE user SET role = 'admin' WHERE email = 'your@email.com';"
```

All subsequent admin or moderator promotions go through the normal role assignment workflow once an admin-facing tool exists.

This is a one-time operational step, not a product feature.

## Auditability Recommendation

The first version does not need a full enterprise audit subsystem, but role assignment and role-sensitive moderation actions should not become invisible state changes.

Recommended first principle:

- TrackDraw should be able to answer who changed an elevated role and when

Recommended later-friendly fields or records:

- target user id
- actor user id
- previous role
- new role
- changed at timestamp

This may begin as lightweight logging or a small role-change record, but it should be considered part of the durable direction rather than an optional nicety.

## Session And Resolution Expectations

Role state should be resolved from trusted server-side account state.

Recommended first expectation:

- the authenticated session identifies the user
- the server loads or derives the current account role
- authorization helpers combine role, ownership, and capability logic

The client may receive enough role information to tailor UI affordances, but that should always be treated as advisory only.

If role changes occur during an active session, TrackDraw should assume that fresh server requests enforce the new state even if some client UI needs a refresh to catch up.

## Recommended Helper Layer Direction

Authorization must be server-side. API handlers decide whether an action is allowed. The client may reflect permissions for usability, but cannot be trusted for enforcement.

The storage model should feed a small central authorization layer rather than encouraging direct role checks in feature routes.

Recommended helper direction:

- resolve authenticated actor
- resolve actor role
- resolve resource ownership
- evaluate capability against actor, resource, and context

Example conceptual helpers:

- `getActorRole(userId)`
- `isResourceOwner(actor, resource)`
- `hasCapability(actor, capability, resource?)`
- `canTransitionGalleryState(actor, entry, nextState)`

This keeps later migration easier if TrackDraw ever moves from a single role field to a richer internal model.

## Moderation Relationship

Moderation is one consumer of this model, not the whole reason it exists.

The first public-surface example may be the gallery, but the roles model should not be named or designed as `gallery moderation only`.

That would make later platform needs harder to fit cleanly.

## Product Risks

### 1. The Model Is Too Small

If TrackDraw collapses everything into `admin`, it may create unnecessary power concentration and make later moderation separation awkward.

Mitigation:

- define `moderator` explicitly from the start, even if there are very few of them at first

### 2. The Model Is Too Big

If TrackDraw invents too many roles or permissions too early, the team may build complexity that the product never needs.

Mitigation:

- start with three roles
- keep capabilities internal
- expand only when a real product need appears

### 3. Ownership And Role Checks Get Mixed Up

If TrackDraw uses global roles for actions that should be simple ownership checks, the product becomes harder to reason about.

Mitigation:

- treat ownership as first-class
- reserve elevated roles for non-owner platform actions

### 4. Authorization Logic Spreads Across The Codebase

If checks are implemented ad hoc per route or component, the model will become inconsistent quickly.

Mitigation:

- centralize authorization helpers
- keep route handlers thin
- define protected actions explicitly

## Recommended Delivery Sequence

### Top-Level Checklist

- [x] Phase 0 complete: ownership, role, and capability are clearly separated
- [x] Phase 1 complete: first roles and core capabilities are defined
- [x] Phase 2 complete: protected actions and enforcement rules are explicit
- [x] Phase 3 complete: role storage and assignment approach are defined
- [x] Phase 4 complete: TrackDraw has a clear implement-now or later decision

### Phase 0: Lock The Conceptual Model

Start:

- elevated authority is still discussed in feature-specific terms

Done:

- TrackDraw distinguishes ownership, role, and capability clearly
- gallery dependency is understood as one consumer of this model

Checklist:

- [x] Confirm ownership is the primary authority for ordinary user resources
- [x] Confirm elevated roles are only for non-owner platform actions
- [x] Confirm capability thinking is the internal enforcement model
- [x] Confirm this foundation is not gallery-specific
- [x] Confirm TrackDraw wants one reusable authorization model rather than feature-by-feature exceptions

### Phase 1: Define Roles, Ownership, And Capabilities

Start:

- no shared vocabulary exists yet

Done:

- first roles are named
- core protected actions are named
- ownership boundaries are explicit

Checklist:

- [x] Confirm the first role set is `user`, `moderator`, `admin`
- [x] Define what ordinary users may do through ownership alone
- [x] Define what moderators may do that ordinary users may not
- [x] Define what admins may do beyond moderators
- [x] Name the first internal capabilities needed for gallery and adjacent admin actions
- [x] Confirm the first gallery capability set maps to publish, unlist, hide, unhide, feature, unfeature, and report review
- [x] Confirm roles remain small and globally understandable

### Phase 2: Define First Protected Actions And Enforcement Rules

Start:

- conceptual model exists

Done:

- gallery moderation and featuring actions map cleanly to role and ownership checks
- server-side enforcement expectations are locked

Checklist:

- [x] Define the first protected actions that must be enforced server-side
- [x] Confirm which actions are ownership checks versus role checks
- [x] Confirm moderators can hide, unhide, feature, and review reports
- [x] Confirm which actors may move entries between `link_only`, `gallery_visible`, `featured`, and `hidden`
- [x] Confirm moderation state overrides ordinary owner self-service state changes when needed
- [x] Confirm admins retain broader authority than moderators
- [x] Confirm clients only reflect permissions for UX and do not enforce them
- [x] Confirm the need for centralized authorization helpers

### Phase 3: Define Storage And Role Assignment

Start:

- enforcement model is conceptually clear

Done:

- TrackDraw knows where role state lives
- TrackDraw knows who may assign elevated roles
- temporary implementation shortcuts are distinguished from long-term product design

Checklist:

- [x] Decide whether v1 uses a persisted single role field on the account record
- [x] Decide whether any temporary allowlist is allowed as an implementation bridge
- [x] Decide who may assign or revoke `moderator` and `admin`
- [x] Confirm that role changes need basic auditability from the start
- [x] Confirm route handlers and server helpers are the enforcement boundary
- [x] Confirm no client-only role source is trusted

### Phase 4: Decide Whether To Implement Now Or Later

Start:

- the model is concrete enough to judge honestly

Done:

- TrackDraw either commits to implementing authorization foundations
- or keeps this parked until another public/admin feature makes it urgent

Checklist:

- [ ] Re-evaluate whether gallery and other planned features justify this foundation now
- [ ] Re-evaluate whether the role model is small enough to implement safely
- [ ] Re-evaluate whether the protected actions are concrete enough for engineering work
- [ ] Re-evaluate whether the team can support elevated-role operations responsibly
- [ ] Decide `implement now`, `prepare later`, or `keep parked`

## Smallest Credible V1

If TrackDraw builds this in the near term, the smallest credible version is:

- persisted global account role with `user`, `moderator`, `admin`
- ownership-first checks for ordinary user resources
- centralized server-side helpers for protected actions
- moderator control over gallery hide, feature, and report review
- admin reserved for broader platform authority

## Codebase Anchor

This section maps the abstract model to the concrete TrackDraw codebase so implementation can start without a separate discovery phase.

### Tech Stack

- **Auth**: Better-Auth with Magic Link and Passkey, configured in [src/lib/server/auth.ts](../../src/lib/server/auth.ts)
- **Database**: Cloudflare D1 (SQLite), raw SQL via D1 API — no ORM
- **Migrations**: plain SQL files in [migrations/](../../migrations/)

### Current User Model

The `user` table is defined in [migrations/0002_accounts_and_projects.sql](../../migrations/0002_accounts_and_projects.sql).

Current fields: `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`.

No `role` field exists yet.

### How The Authenticated User Is Resolved

`getCurrentUserFromHeaders()` in [src/lib/server/auth.ts](../../src/lib/server/auth.ts) is the single entry point for resolving the current user in API routes and server actions. It returns a `CurrentUser` type with `id`, `email`, `name`, and `image`.

This is where role resolution should be added. Either extend `CurrentUser` to include `role`, or introduce a wrapper that enriches the result with the persisted role before returning it to callers.

### What Needs To Be Built

**Migration**: add a `role` column to the `user` table.

```sql
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
```

All existing accounts automatically receive `user`. The first admin is promoted directly via a SQL UPDATE in the Cloudflare D1 dashboard or Wrangler CLI after the migration runs.

**Extended type**: add `role` to the `CurrentUser` type and ensure `getCurrentUserFromHeaders()` returns it.

**Authorization helpers**: create a new file, for example `src/lib/server/authorization.ts`, with the core helpers described in the Recommended Helper Layer Direction section.

### Role In The Dev Auth Shim

`npm run dev` uses a localStorage-based auth shim (`isDevAuthShimEnabled()` in [src/lib/auth-client.ts](../../src/lib/auth-client.ts)) that bypasses Better-Auth entirely. Once role storage exists in D1, the shim has no way to read it.

Recommended approach: extend the shim with a separate localStorage key for the simulated role, for example `trackdraw-dev-auth-role`. The shim reads this key when constructing the simulated session and falls back to `user` if absent.

This allows switching between roles during development without touching D1, and lets you test both normal user flows and admin/moderator flows in `npm run dev`.

For `npm run preview`, the real Better-Auth login is used against the remote `trackdraw-dev` D1 database. Use the Wrangler command in the bootstrap section above to promote an account to admin there.

### Existing Authorization Pattern

Ownership checks today are done via SQL `WHERE owner_user_id = ?` in query helpers such as `getProjectForUser()` in [src/lib/server/projects.ts](../../src/lib/server/projects.ts). This pattern should remain for ownership checks. Role-based checks should go through the new authorization helpers, not inline SQL conditions.

## Build Phases

### Phase 1: Database Migration

Create `migrations/0004_user_roles.sql`:

```sql
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
```

Run against each environment:

```bash
npm run migrate:local          # local
npm run migrate:up:dev         # remote trackdraw-dev
npm run migrate:up:production  # production
```

Done when: the `role` column exists in all environments and all existing accounts have `user`.

### Phase 2: Extend CurrentUser With Role

In [src/lib/server/auth.ts](../../src/lib/server/auth.ts), extend the `CurrentUser` type:

```ts
export type AccountRole = 'user' | 'moderator' | 'admin';

export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: AccountRole;
};
```

Update `getCurrentUserFromHeaders()` to query the role from D1 after resolving the session:

```ts
const db = await getDatabase();
const record = await db
  .prepare('SELECT role FROM user WHERE id = ?')
  .bind(session.user.id)
  .first<{ role: AccountRole }>();

return {
  id: session.user.id,
  email: session.user.email ?? null,
  name: session.user.name ?? null,
  image: session.user.image ?? null,
  role: record?.role ?? 'user',
};
```

Done when: every caller of `getCurrentUserFromHeaders` receives a `role` field.

### Phase 3: Authorization Helper Layer

Create `src/lib/server/authorization.ts` with the core helpers:

- `hasCapability(actor, capability)` — checks whether the actor's role grants the given capability
- `isResourceOwner(actor, ownerUserId)` — checks whether the actor owns the resource
- `canTransitionGalleryState(actor, entry, nextState)` — encodes the full gallery state-transition rules from the PVA

The role-to-capability mapping should follow the First Capability Matrix defined above.

Done when: helpers are importable from any API route or server action.

### Phase 4: Dev Auth Shim Role Support

In [src/lib/auth-client.ts](../../src/lib/auth-client.ts):

- Add `const DEV_AUTH_ROLE_KEY = 'trackdraw-dev-auth-role'`
- Add `role` to the `AuthUser` type
- Read the role from localStorage in `buildDevSession()`, falling back to `'user'` if absent

To switch roles locally, run in the browser console and re-sign in:

```js
localStorage.setItem('trackdraw-dev-auth-role', 'admin');
```

Done when: the dev shim returns a `role` field and switching roles via localStorage works in `npm run dev`.

### Phase 5: Bootstrap First Admin

After Phase 1 is deployed, promote your account in each environment.

**Local** (Wrangler local SQLite file):

```bash
wrangler d1 execute DB --local --env dev --command "UPDATE user SET role = 'admin' WHERE email = 'your@email.com';"
```

**Preview and production** — run in the Cloudflare D1 dashboard for the respective database:

```sql
UPDATE user SET role = 'admin' WHERE email = 'your@email.com';
```

Done when: your account resolves to `admin` in each environment.

### Build Phase Checklist

- [ ] Phase 1 complete: `role` column exists in all environments
- [ ] Phase 2 complete: `getCurrentUserFromHeaders` returns `role` on every resolved user
- [ ] Phase 3 complete: `hasCapability`, `isResourceOwner`, and `canTransitionGalleryState` are implemented
- [ ] Phase 4 complete: dev auth shim exposes `role` and responds to `trackdraw-dev-auth-role`
- [ ] Phase 5 complete: first admin promoted in each environment

### Note On Existing Routes

The authorization helpers built here are ready to use but not yet wired into any routes, because the gallery feature that consumes them has not been built yet. When building the gallery, import from `src/lib/server/authorization.ts` and call `hasCapability` or `canTransitionGalleryState` in the relevant API handlers.

Existing ownership checks in routes like [src/lib/server/projects.ts](../../src/lib/server/projects.ts) use `WHERE owner_user_id = ?` directly and do not need to change.

## Success Criteria

This foundation is successful if:

- feature teams stop needing one-off elevated-access logic
- moderation and featuring actions feel principled rather than improvised
- TrackDraw can add later public/admin features without redesigning authority from scratch
- ordinary user ownership remains simple and predictable
