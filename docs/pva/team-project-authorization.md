# Team Project Ownership And Authorization

Foundation for [#1019](https://github.com/dutchdronesquad/trackdraw/issues/1019), under [#1018](https://github.com/dutchdronesquad/trackdraw/issues/1018). This slice persists ownership and supplies server authorization. It does not enable team management, invitations, team editing or team access through existing REST/MCP credentials.

## Ownership Contract

A project has exactly one owner: `owner_user_id` or `owner_team_id`. A database CHECK enforces exclusivity and foreign keys reject missing owners. `created_by_user_id` records provenance separately; it does not confer access and becomes null when its account is deleted. Existing project IDs, design JSON, revisions, archived state and canonical share links remain unchanged. Existing projects migrate as personally owned, with their current owner recorded as creator because earlier provenance is unavailable.

`teams`, `team_members` and `team_invitations` reference the existing Better Auth `users`; there is no second identity store. Membership is unique per team/user, roles are closed to owner/editor/viewer, and a partial unique index permits at most one owner. Invitations can grant editor/viewer only; pending invites do not confer membership. Verified-email acceptance, expiry/resend behavior and owner transfer/last-owner protection are delivery requirements of #1020/#1025, not supplied by a row in this schema.

Better Auth 1.7.11's installed organization plugin was inspected. Its organization/member/invitation models fit the product Team concept through model-name mapping (`organization` → `teams`, `member` → `team_members`, `invitation` → `team_invitations`); the persisted fields retain the plugin's camelCase names. Do not use its optional nested `team` feature for this flat product concept. The plugin is deliberately not registered yet: enabling its routes before verified invitations, role policy and lifecycle guards would expose an incomplete product. #1020 must configure custom owner/editor/viewer permissions and validate its complete runtime schema, including any additional session fields, before enabling organization endpoints. The extra database constraints must be respected by plugin invitation and ownership-transfer flows.

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

Personal account deletion retains its existing cascade semantics. Team project creators can disappear without deleting the team project. Team deletion is restricted while it owns projects. Full owner-departure, team deletion, publication and retention policy remains #1025; do not enable team creation/editing before these guards and #1022 are complete. Existing publication attribution is unchanged in this foundation; #1023 must explicitly reconcile share/gallery ownership with team-owned projects.

Privacy and terms routes were reviewed. This foundation exposes no new user data or public account feature, so legal text/effective dates are unchanged. Review and update them before the team product is activated. Private appearance ownership and reuse remain governed by #939–#943, independently of project ownership.

## Validation

- `tests/lib/server/team-project-migration.test.ts`: populated upgrade with active/archived projects, canonical share/gallery records, pending/applied MCP history, revision trigger and personal deletion behavior.
- `tests/lib/server/team-project-authorization.test.ts`: SQL-backed role matrix, explicit context, outsider/creator isolation, live revocation, guarded mutations, metadata-only listing, personal credential compatibility and independent provenance.
- Apply local D1 migrations and run Cloudflare preview before merging runtime-sensitive changes; SQLite tests alone do not prove D1 deployment compatibility.
