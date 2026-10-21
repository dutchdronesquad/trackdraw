# Personal And Team Projects

Implementation contract for [#1021](https://github.com/dutchdronesquad/trackdraw/issues/1021), under the [teams epic](https://github.com/dutchdronesquad/trackdraw/issues/1018).

## Studio workflow

Projects → Account shows personal projects and teams in a compact desktop navigation column with initials. Mobile and tablet use the existing shadcn Select for the same locations. Project rows remain flat and show their last change; the primary creation action belongs to the selected location. Selection is persisted by account ID in `trackdraw.projectLibrary`; it contains no designs. Team pages use bounded metadata reads with cursor pagination, live membership checks and no-store responses. Personal/device/snapshot/shared-link flows retain their current behavior. Missing membership falls back to personal projects on reload/focus. Switching accounts remounts the list and ignores old in-flight responses.

Owners/editors can create a blank version 2 project in an explicitly selected team; viewers cannot. Each project has exactly one owner and independent creator provenance. All roles currently open team projects read-only using `/studio?teamId=…&teamProject=…`. Owner/editor editing intentionally waits for the exclusive-session implementation in #1022: the server returns `editing: unavailable` and accepts no team design-update command. No feature flag or unsafe interim write path is introduced. Team editing does not ship until the epic's remaining requirements pass.

The private workspace mounts only the viewer, without the editable Studio's local-draft hydration, autosave, restore-point timer, account synchronization or public sharing actions. It revalidates on focus/visibility and every 30 seconds. Failed authorization/network verification clears the displayed design and undo history; sign-out/account changes hide the old content immediately. Authorized viewers can explicitly export JSON. Viewing or export neither publishes nor changes ownership. Reopening always fetches the current authorized revision; private artwork references remain unchanged, with existing renderer authorization/fallback behavior.

## Deliberate personal-to-team move

A personal owner can move a project into a team they own. The active personal project must finish synchronization first. The confirmation names the destination and describes member access, removal of this device's personal cache/history, absence of reverse transfer and the existing share/gallery exposure. It reads current revision and a hash of publication state before enabling confirmation.

A single conditional SQL UPDATE checks personal ownership, expected revision, current destination owner membership, active archive status, absence of an unexpired editing lease, and the exact publication snapshot. The update preserves project ID, design JSON, creator and appearance references, clears the personal owner, sets the team owner and increments revision exactly once. A concurrent save, publication change, membership loss or second move causes a safe conflict. Old personal saves, force-overwrites and MCP proposals cannot write through the team ownership boundary. Team-to-personal and team-to-team transfers are not supported.

Migration `0032_project_edit_leases.sql` establishes `project_edit_leases(project_id, user_id, session_id, expires_at)` as the shared ownership-change guard. #1022 must use this table and preserve the same project/revision boundary when adding acquisition, renewal, release, session tokens and lease-loss recovery. This slice creates no leases and grants no editing permission.

Existing published snapshots, canonical `/share/[token]` links and gallery entries are preserved with their original publisher. A move does not revoke or make existing public content private, and does not transfer publication management. #1023 reconciles publication ownership separately; the confirmation states this explicitly. Active link/gallery counts and changes to revoked/expired/gallery states are included in preview/confirmation validation; raw tokens are not returned in the preview.

After a successful move, the personal cache, matching draft and restore points are removed through `src/lib/projects.ts`. A persistent ID-only ownership marker blocks late writes/restore points from old tabs from recreating that personal cache. An explicitly created copy has a different ID and remains personal. The page then reloads into an authorized read-only team workspace, cancelling personal synchronization timers. No team content is stored in account/device drafts or restored across identities.

## Validation and rollout

Run lint, typecheck, tests, build and i18n checks. Apply local migrations and use the Cloudflare preview for authenticated member/outsider, create, move, read-only, export, navigation and mobile checks. The SQL-backed tests cover role isolation, metadata-only pagination, concurrent moves, revision/publication races, leases and personal credential isolation. Component/storage regressions cover account-switch late responses, membership fallback and stale personal cache writes.

The generalized privacy/terms text was reviewed: it already covers membership/access roles, hosted project content, user-controlled visibility, explicit publication and content ownership. This slice does not require another feature-specific legal paragraph. Development deploys follow main; production remains release/manual. No remote migration or deployment is part of local validation.
