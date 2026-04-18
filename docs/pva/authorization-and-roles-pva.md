# Authorization And Roles PVA

Date: April 18, 2026

Status: approved

## Decision Summary

Recommended decision:

- approve separate product-definition work for roles, authorization, and moderation
- do not treat gallery moderation as an isolated special case
- define a small account-role model now so future public and internal dashboard features share one foundation
- treat ownership and role-based authority as separate concerns

This document is intended to frame roles and authorization as a platform decision, not just a gallery implementation detail.

Decision outcome:

- approve the authorization foundation
- implement it alongside the first gallery moderation and featuring work
- keep the first release narrow: global roles, server-side helpers, and basic role assignment only

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

## Implementation Boundary

Approve and implement now:

- one persisted global role per account
- centralized server-side authorization helpers
- moderator authority for gallery hide, unhide, feature, unfeature, and report review
- admin-only role assignment
- lightweight auditability for role changes and moderation-sensitive actions
- a shared internal dashboard shell later, with module visibility driven by role and capability

Do not expand v1 into:

- organization or club roles
- custom per-user permission editors
- public moderator applications
- broad dashboard modules before the protected actions exist

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
- future dashboard-only settings or operations
- potential project, account, or public-surface controls beyond the gallery

This should be handled as a reusable product foundation rather than as a narrow one-off rule set.

The intended internal surface should be a shared `dashboard`, not an admin-only destination. Admins and moderators may both enter that shell, while routes, modules, and actions remain permission-gated.

## Scope Boundary

This PVA owns the authorization foundation only.

It should define:

- global roles
- capability naming
- trusted server-side enforcement boundaries
- dashboard access posture
- role assignment and audit expectations

It should not become the delivery document for gallery product behavior itself.

That means:

- gallery states, reporting UX, moderation workflows, featuring policy, and gallery operator decisions belong in the gallery PVA
- this document may name the authorization capabilities that gallery work will consume
- this document may define the enforcement model those gallery routes must use
- this document should not become the source of truth for gallery feature sequencing, UI behavior, or gallery-specific acceptance criteria

Practical rule:

- if a section answers `who may do this and where is that enforced?`, it belongs here
- if a section answers `how should gallery moderation behave as a product workflow?`, it belongs in the gallery PVA

## Why Now

The foundation is worth implementing now because multiple approved or likely product directions already depend on it:

- gallery moderation and featuring need non-owner authority
- account-backed project ownership needs a clear distinction between owner actions and platform intervention
- future live review rooms benefit from explicit host, guest, and platform authority boundaries even if room roles stay separate from account roles

Deferring this work would likely create short-term special cases in the gallery and account surfaces that would then need to be replaced once platform authority grows.

## Product Goal

TrackDraw should gain a clear and durable authorization model that:

- keeps ordinary user ownership simple
- supports elevated moderation and platform actions cleanly
- avoids scattered `isAdmin` checks becoming the long-term architecture
- remains small enough to implement without becoming a permissions platform
- supports a shared privileged dashboard without implying that every privileged user is an admin

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

- `dashboard.overview.read`
- `gallery.entry.hide`
- `gallery.entry.feature`
- `gallery.report.review`
- `account.role.assign`
- `admin.users.read`
- `admin.users.update`
- `audit.read`

Roles then map to capabilities.

This keeps server-side authorization readable and extensible.

The same capability model should drive internal dashboard visibility:

- `moderator` and `admin` may both reach the dashboard shell
- dashboard modules should appear only when the actor has at least one relevant capability
- visible modules may still contain actions that are further restricted

This keeps the route structure stable even if role-to-capability mapping changes later.

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

## Dashboard Direction

TrackDraw should treat the privileged internal UI as a `dashboard` rather than an `admin page`.

Recommended first direction:

- `/dashboard` is the shared internal shell for privileged users
- `moderator` and `admin` may both enter that shell
- the shell, navigation, and layout are shared
- visibility of modules and actions inside the dashboard is capability-driven

Recommended first dashboard module direction:

- overview
- users
- audit
- reports / moderation queue later, once gallery moderation needs a real internal surface

Recommended first access posture:

- `moderator` sees overview first, with moderation modules added only when a real moderation flow exists
- `admin` sees broader platform modules like users and audit
- `user` does not enter the privileged dashboard

This keeps product language accurate:

- moderators are not admins
- moderators can still use the internal dashboard
- admin-only controls remain clearly separated

## First Protected Actions To Model

The first implementation-worthy actions are likely:

- moderator enter the dashboard
- admin assign or revoke elevated role
- admin assign or revoke elevated role later

If the team cannot define these actions clearly, the broader model is not ready yet.

## First Capability Matrix

The first useful capability set should map directly to the gallery actions already defined in the gallery PVA.

Recommended first internal capabilities:

- `dashboard.overview.read`
- `gallery.entry.publish`
- `gallery.entry.unlist_own`
- `gallery.entry.hide`
- `gallery.entry.unhide`
- `gallery.entry.feature`
- `gallery.entry.unfeature`
- `gallery.report.create`
- `gallery.report.review`
- `moderation.reports.read`
- `moderation.reports.resolve`
- `admin.users.read`
- `admin.users.update`
- `account.role.assign`
- `audit.read`

Recommended first role mapping:

- `user`
  - no privileged dashboard access
  - `gallery.entry.publish` on owned eligible shares only
  - `gallery.entry.unlist_own`
  - `gallery.report.create`
- `moderator`
  - `dashboard.overview.read`
  - `gallery.entry.hide`
  - `gallery.entry.unhide`
  - `gallery.entry.feature`
  - `gallery.entry.unfeature`
  - `gallery.report.review`
  - `moderation.reports.read`
  - `moderation.reports.resolve`
- `admin`
  - everything a moderator can do
  - `admin.users.read`
  - `admin.users.update`
  - `account.role.assign`
  - `audit.read`

Ownership should still gate user actions:

- a normal user can only perform ownership-scoped actions on their own resources
- a normal user cannot affect another user's platform-controlled state

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
- owner can opt into additional product surfaces only when the relevant feature model allows it
- moderator does not automatically gain authority to revoke someone else's share in v1
- admin may need broader share intervention later, but that should be treated as a separate platform action

Recommended first boundary:

- public-surface moderation should act on the public-surface representation first
- share revocation remains a distinct and heavier action

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

- `dashboard.overview.read`
  - actor: moderator or admin
  - resource: dashboard shell
- `moderation.reports.read`
  - actor: moderator or admin
  - resource: moderation queue
- `moderation.reports.resolve`
  - actor: moderator or admin
  - resource: moderation queue item
- `admin.users.read`
  - actor: admin
  - resource: dashboard users module
- `admin.users.update`
  - actor: admin
  - resource: dashboard users module
- `account.role.assign`
  - actor: admin
  - resource: any account role assignment target
- `audit.read`
  - actor: admin
  - resource: dashboard audit module

This is not a complete future matrix for the whole product. Feature-specific matrices such as gallery state transitions and report handling should stay in their own PVAs and consume this capability layer rather than redefining it here.

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

The first role-assignment workflow does not need a polished end-user dashboard module, but it does need a real operational model.

Recommended first workflow:

1. an existing admin identifies the target account
2. the admin assigns or changes the target account role through a trusted server-side path
3. the system stores the new role persistently
4. future requests resolve permissions from the stored role

Possible first implementation surfaces:

- a simple internal dashboard tool
- an admin-only route or module later
- a temporary server-side operational script if needed

The important product rule is not the UI polish. The important rule is that assignment is explicit, intentional, and server-controlled.

### First Admin Bootstrap

Once the role migration has run, promoting the first admin is a direct database operation.

**Production**: run the following SQL via the Cloudflare D1 dashboard.

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

**Local preview** (`npm run preview`, uses local Wrangler D1 state):

```bash
wrangler d1 execute DB --local --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

**Remote development**:

```bash
wrangler d1 execute DB --remote --env dev --command "UPDATE users SET role = 'admin' WHERE email = 'your@email.com';"
```

All subsequent admin or moderator promotions go through the normal role assignment workflow once a dashboard-facing role-management tool exists.

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

If TrackDraw collapses everything into `admin`, it may create unnecessary power concentration and make later dashboard separation awkward.

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
- [x] Name the first internal capabilities needed for gallery and adjacent dashboard actions
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
- or keeps this parked until another public/dashboard feature makes it urgent

Checklist:

- [x] Re-evaluate whether gallery and other planned features justify this foundation now
- [x] Re-evaluate whether the role model is small enough to implement safely
- [x] Re-evaluate whether the protected actions are concrete enough for engineering work
- [x] Re-evaluate whether the team can support elevated-role operations responsibly
- [x] Decide `implement now`, `prepare later`, or `keep parked` — **implement now**

## Smallest Credible V1

If TrackDraw builds this in the near term, the smallest credible version is:

- persisted global account role with `user`, `moderator`, `admin`
- ownership-first checks for ordinary user resources
- centralized server-side helpers for protected actions
- moderator control over gallery hide, feature, and report review
- admin reserved for broader platform authority
- a shared dashboard shell can sit on top of the model without changing the underlying authorization design

This should ship as platform plumbing in support of user-facing moderation and gallery controls, not as a standalone dashboard feature push.

## Dependencies And Sequencing

This PVA is downstream of the current accounts foundation and upstream of gallery moderation.

Recommended sequence:

1. keep the Better Auth account model and project ownership shape from [accounts-project-sync.md](../research/accounts-project-sync.md)
2. add the persisted role field and server-side authorization helpers
3. use those helpers in the first gallery moderation and featuring routes
4. add any minimal dashboard surface or operational script only after the enforcement layer exists

Important dependency rules:

- do not block ordinary local-first editing on signed-in role work
- do not make account roles a prerequisite for core project editing, autosave, import/export, or share publishing
- do require account roles for non-owner public-surface interventions such as hide, feature, and report review

## Open Product Questions

These questions do not block the foundation decision, but they should be answered before implementation starts:

- should `gallery.report.create` require sign-in, or is there still a product case for anonymous reporting later?
- does TrackDraw want a distinct `support` role later for account or project intervention without full admin authority?
- should moderation actions write a single generic audit record table, or separate role-change and moderation-event records?
- which minimal internal surface will exist first for assigning roles: script-only, route-only, or lightweight dashboard UI?

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

This allows switching between roles during development without touching D1, and lets you test both normal user flows and dashboard-role flows in `npm run dev`.

For `npm run preview`, the real Better-Auth login is used with local Wrangler/OpenNext preview and local D1 state. Use the local preview bootstrap command above when you need admin access there. Use the remote command only when validating against the shared development environment.

### Existing Authorization Pattern

Ownership checks today are done via SQL `WHERE owner_user_id = ?` in query helpers such as `getProjectForUser()` in [src/lib/server/projects.ts](../../src/lib/server/projects.ts). This pattern should remain for ownership checks. Role-based checks should go through the new authorization helpers, not inline SQL conditions.

## Execution Phases

This section is the concrete implementation checklist. Each phase has a status, explicit deliverables, and a strict done state so the PVA can double as an execution board.

### Phase Checklist

- [x] Phase 1: role persistence and auth enrichment
- [x] Phase 2: authorization helper layer
- [x] Phase 3: shared dashboard shell and gated users module
- [x] Phase 4: audit read-side and audit dashboard module
- [x] Phase 5: operational readiness across environments

Deferred for now:

- reports queue and moderation workflow in the dashboard
- gallery capability enforcement on real resources

### Phase 1: Role Persistence And Auth Enrichment

Status: `done`

Objective:

- persist one global account role per user
- expose the resolved role on trusted server-side user resolution

Concrete checklist:

- [x] Add a non-nullable `role` field with default `user`
- [x] Define a shared `AccountRole` type
- [x] Parse unknown stored values safely back to `user`
- [x] Extend `CurrentUser` with `role`
- [x] Return `role` from `getCurrentUserFromHeaders()`
- [x] Expose session role data to the client-facing account session endpoint

Code anchors:

- [migrations/0004_user_roles_and_audit_events.sql](../../migrations/0004_user_roles_and_audit_events.sql)
- [src/lib/account-roles.ts](../../src/lib/account-roles.ts)
- [src/lib/server/auth.ts](../../src/lib/server/auth.ts)
- [src/app/api/account/session/route.ts](../../src/app/api/account/session/route.ts)

Done when:

- every authenticated server request resolves a trusted `role`
- every account has exactly one persisted role

### Phase 2: Authorization Helper Layer

Status: `done`

Objective:

- centralize role-to-capability decisions and dashboard visibility rules

Concrete checklist:

- [x] Add a central capability union
- [x] Add role-to-capability mapping
- [x] Add `hasCapability(role, capability)`
- [x] Add `canAccessDashboard(role)`
- [x] Add `getVisibleDashboardModules(role)`
- [x] Add role-assignment guard helper for admin-only changes
- [x] Add `isResourceOwner(actor, ownerUserId)` helper for non-dashboard resource checks

Code anchors:

- [src/lib/server/authorization.ts](../../src/lib/server/authorization.ts)

Done when:

- all privileged dashboard access decisions go through the helper layer
- generic ownership-aware routes can reuse helpers instead of inventing local rules

### Phase 3: Shared Dashboard Shell And Gated Users Module

Status: `done`

Objective:

- ship the shared privileged `/dashboard` shell for moderators and admins
- prove the capability model through one real admin-only module

Concrete checklist:

- [x] Create `/dashboard` layout with trusted server-side route gating
- [x] Gate shell access so `user` cannot enter
- [x] Show only capability-allowed modules in the sidebar
- [x] Implement `/dashboard` overview
- [x] Implement `/dashboard/users`
- [x] Add `/api/dashboard/users` read endpoint
- [x] Add `/api/dashboard/users/[userId]` role update endpoint
- [x] Restrict role assignment to admin
- [x] Remove legacy `/admin` pages and `/api/admin` compatibility layer

Code anchors:

- [src/app/dashboard/layout.tsx](../../src/app/dashboard/layout.tsx)
- [src/app/dashboard/page.tsx](../../src/app/dashboard/page.tsx)
- [src/app/dashboard/users/page.tsx](../../src/app/dashboard/users/page.tsx)
- [src/app/api/dashboard/users/route.ts](../../src/app/api/dashboard/users/route.ts)
- [src/app/api/dashboard/users/[userId]/route.ts](../../src/app/api/dashboard/users/[userId]/route.ts)
- [src/components/dashboard/](../../src/components/dashboard)

Done when:

- moderators and admins share the same shell
- admin-only modules stay server-protected
- no `/admin` route or API compatibility layer remains

### Phase 4: Audit Read-Side And Audit Dashboard Module

Status: `done`

Objective:

- move audit from write-only plumbing to usable internal tooling

Concrete checklist:

- [x] Add audit read helper(s) in `src/lib/server/audit.ts`
- [x] Define the first audit query shape and filters
- [x] Keep the page server-rendered for now, so no `/api/dashboard/audit` endpoint is needed yet
- [x] Replace the placeholder audit page with real event data
- [x] Show at least role-change events first
- [x] Gate access with `audit.read`

Done when:

- admin can open `/dashboard/audit` and inspect real audit events

### Phase 5: Operational Readiness Across Environments

Status: `done`

Objective:

- make the model usable beyond local code completion

Concrete checklist:

- [x] Document first-admin bootstrap
- [x] Add dev-shim role support
- [x] Verify role promotion flow in every active environment
- [x] Verify moderator and admin dashboard access end-to-end in preview/runtime
- [x] Confirm audit writes in preview/runtime
- [x] Add any missing contributor runbook notes if commands or flows changed

Code anchors:

- [src/lib/auth-client.ts](../../src/lib/auth-client.ts)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)

Done when:

- the team can reliably test `user`, `moderator`, and `admin` flows in the environments they actually use

Verification note:

- manually verified in active development/runtime flows: ordinary `user` is blocked from `/dashboard`, elevated roles can enter the expected dashboard surfaces, role changes persist, and audit writes are visible in the audit module

### Note On Existing Routes

The dashboard foundation is now wired into real routes and APIs for role management. The remaining missing work is no longer the shell itself, but the resource-specific moderation flows that should consume the same authorization helpers.

Existing ownership checks in routes like [src/lib/server/projects.ts](../../src/lib/server/projects.ts) still use `WHERE owner_user_id = ?` directly and do not need to change until a resource genuinely needs non-owner platform authority.

## Relationship To The Gallery PVA

This document should stay upstream of the gallery PVA, not absorb it.

Recommended division:

- this PVA defines roles, capabilities, helper boundaries, dashboard gating, and privileged enforcement posture
- the gallery PVA defines gallery states, report reasons, moderation policy, featuring rules, and user-visible workflow

When implementing gallery work:

- read the gallery PVA for product behavior
- read this PVA for authorization and enforcement shape
- do not resolve gallery product ambiguity inside this document

## Success Criteria

This foundation is successful if:

- feature teams stop needing one-off elevated-access logic
- moderation and featuring actions feel principled rather than improvised
- TrackDraw can add later public/dashboard features without redesigning authority from scratch
- ordinary user ownership remains simple and predictable
