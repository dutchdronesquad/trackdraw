# Team Project Ownership And Authorization

Foundation for [#1019](https://github.com/dutchdronesquad/trackdraw/issues/1019), under [#1018](https://github.com/dutchdronesquad/trackdraw/issues/1018). This slice persists ownership and supplies server authorization. It does not enable team management, invitations, team editing or team access through existing REST/MCP credentials.

## Ownership Contract

A project has exactly one owner: `owner_user_id` or `owner_team_id`. A database CHECK enforces exclusivity and foreign keys reject missing owners. `created_by_user_id` records provenance separately; it does not confer access and becomes null when its account is deleted. Existing project IDs, design JSON, revisions, archived state and canonical share links remain unchanged. Existing projects migrate as personally owned, with their current owner recorded as creator because earlier provenance is unavailable.

`teams`, `team_members` and `team_invitations` reference the existing Better Auth `users`; there is no second identity store. Membership is unique per team/user, roles are closed to owner/editor/viewer, and a partial unique index permits at most one owner. Invitations can grant editor/viewer only; pending invites do not confer membership. Verified-email acceptance and expiry/resend behavior are implemented in #1020. Migration 0035 completes the ownership lifecycle: an atomic accepted-member transfer preserves exactly one owner, and an explicit reviewed team deletion purges its content. Direct owner removal/demotion/account deletion remains blocked.

Better Auth 1.7.11's organization/member/invitation models fit the product Team concept through model-name mapping (`organization` → `teams`, `member` → `team_members`, `invitation` → `team_invitations`); persisted fields retain the plugin's camelCase names. Do not use its optional nested `team` feature for this flat product concept. The plugin is not registered. The #1020 implementation reuses Better Auth sessions and the existing users, but owns the membership mutations: native resend extends the same invitation identifier, while TrackDraw replaces and revokes links; acceptance, limits and current actor rights must be conditional inside the same D1 transaction. Enabling native organization endpoints would provide an alternate mutation path around those rules. If the plugin is introduced later, configure matching owner/editor/viewer policy, validate its complete schema and route every mutation through the same lifecycle invariants. See [team membership management](team-membership-management.md).

## Permission Matrix

| Action                                    | Personal owner | Team owner | Editor | Viewer | Outsider |
| ----------------------------------------- | -------------- | ---------- | ------ | ------ | -------- |
| List/read/export project                  | Yes            | Yes        | Yes    | Yes    | No       |
| Create/update/archive project             | Yes            | Yes        | Yes    | No     | No       |
| Transfer project, publish/revoke snapshot | Yes            | Yes        | No     | No     | No       |
| Manage team membership                    | Not applicable | Yes        | No     | No     | No       |

`ProjectActor` always includes a user ID and an explicit personal or team scope. `projectAuthorizationPredicate` checks the matching owner and current membership/role in SQL. Embed it inside the actual mutation, not just a preflight read: a role can change between requests or between a read and a write. Design writes must additionally enforce the editing lease and expected revision from #1022. The permission matrix alone is not permission to bypass those conditions.

`getProjectForActor` returns an authorized active design with a discriminated `owner` and independent creator. `listProjectSummariesForActor` performs a bounded metadata-only read with the same live membership predicate. Its first-page limit is an internal foundation contract; cursor pagination belongs with the Studio/integration caller that needs it. `getAuthorizedTeam` supports create/member-management preflight where no project exists; creation must still recheck membership inside the insert. Missing, archived, foreign-team and personal-in-team-context projects all yield no result. Preview/export/history callers must use the same boundary before reading derived private data.

Existing `*ForUser` services remain explicitly personal-only, including lists, cursor validation, upserts and archives. Existing API-key project selections, `all` grants, OAuth scopes and MCP tools gain no team access. MCP proposal application remains personal-only even if ownership changes after its preflight. #1024 adds explicit team selection and credential policy; it must not infer team permission from a creator ID or an existing project-ID grant.

## Migration And Lifecycle

Migration `0030_team_project_ownership.sql` rebuilds `projects` within the D1 migration transaction using deferred foreign keys. Shares reference the original project IDs and stay intact. The migration snapshots/restores `mcp_project_edits` because its ON DELETE CASCADE still runs when the old parent table is dropped, even with deferred checking. Project indexes and the revision trigger are recreated. No table rename is used while external triggers reference `projects`; no `foreign_keys=OFF` assumption is needed. Backup tables are dropped before commit. Apply through the normal migration runner, never as independent autocommit statements.

Personal account deletion retains its existing cascade semantics. Team project creators can disappear without deleting the team project. Team owners must transfer ownership or explicitly delete the team before deleting their account. Migration 0035 reassigns existing share/gallery attribution to the current team owner and keeps it aligned during transfer. Explicit team deletion reviews current impact, requires the exact name and permanently purges team content without a recovery period; the existing durable queue handles gallery media cleanup. Team editing and publication use the live membership and lease boundaries from #1022 and #1023. See [lifecycle validation](team-ownership-lifecycle-validation.md).

The original foundation exposed no new user data. The management slice updates the English privacy/terms copy and effective dates for team data and owner-account protection. Private appearance ownership and reuse remain governed by #939–#943, independently of project ownership.

## Validation

- `tests/lib/server/team-project-migration.test.ts`: populated upgrade with active/archived projects, canonical share/gallery records, pending/applied MCP history, revision trigger and personal deletion behavior.
- `tests/lib/server/team-project-authorization.test.ts`: SQL-backed role matrix, explicit context, outsider/creator isolation, live revocation, guarded mutations, metadata-only listing, personal credential compatibility and independent provenance.
- Apply local D1 migrations and run Cloudflare preview before merging runtime-sensitive changes; SQLite tests alone do not prove D1 deployment compatibility.
