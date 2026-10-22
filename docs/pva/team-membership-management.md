# Team Membership Management

Implementation contract for [#1020](https://github.com/dutchdronesquad/trackdraw/issues/1020), following the [ownership foundation](team-project-authorization.md).

## Product And Scope

The account dialog has a Teams section for creating/renaming teams, inviting editors/viewers, changing roles, removing members and leaving a team. An invitation page preserves its destination through existing-account or new-account sign-in and requires an explicit acceptance. Team owners must transfer ownership to an accepted, verified member or explicitly delete the team before leaving or deleting their account. Transfer makes the former owner an editor and preserves public links under the new owner. The owner reviews current deletion impact and confirms the exact team name before permanent deletion. Personal/team projects, exclusive editing and explicit credential grants share the same live team authorization boundary.

Team management is directly available to signed-in users after applying its migrations, without runtime feature configuration or a capability request. This work targets development while the remaining epic issues are implemented. An invitation URL does not confer membership. No placeholder team projects or live collaboration are exposed.

## Account Navigation

Teams opens as a flat directory showing each team and the current account’s role. Selecting a team opens its detail; owners see an aligned member list and actionable invitations, while other members see only their own role. Creating, renaming and inviting use separate focused forms within the account dialog. Team/member/invitation menus expose secondary actions; removal, leaving and ownership transfer open the shared shadcn confirmation dialog with Cancel initially focused. Pending requests disable its actions; failures remain visible in the dialog. Back and Cancel preserve unsent drafts, including when the responsive dialog changes its portal. Successful submission returns to the team detail.

The directory does not expose member counts or avatar stacks because the overview API intentionally does not disclose roster data. Desktop retains the account sidebar. Mobile keeps account navigation in the directory, while team details and forms use a focused drawer with Back and Close. Its accessible dialog title remains available to screen readers, and heading focus never scrolls away the drawer controls.

## Server Boundary

`/api/teams` uses existing Better Auth cookie sessions, current users, trusted-origin checks on mutations, a streamed 4 KiB JSON cap and closed command schemas. Reads and errors are `no-store` with `Vary: Cookie`. Role checks use #1019's live membership boundary; actual writes repeat the owner/recipient check in SQL. Viewers/editors can see their own team/role and leave; only owners receive member names/emails and invitation management data. Direct invitation reads match the verified current account email and never enumerate unrelated recipients.

Creation and acceptance use D1 batches. Acceptance inserts membership only for a pending, unexpired, successfully delivered invitation matching the verified current account, then consumes the invitation in that transaction. Parallel/replayed/expired/revoked/wrong-account attempts fail without granting access. Removal and downgrades affect the next authorization check; the future lease owner must also check this boundary on renewal/write/acquisition.

Invitations expire after seven days. Sending a replacement cancels the old ID and generates a new ID/expiry. Mail uses the existing Plunk client/template shell and one idempotency key per invitation. Until delivery succeeds, the recipient sees Sending and cannot accept. Failed/ambiguous mail delivery cancels the invitation and exposes a safe retry message; provider errors and recipients are not logged in production. The existing non-production local email fallback prints a disposable invitation URL for local validation only. A sent email is not proof the recipient read it.

The installed Better Auth 1.7.11 organization plugin was inspected rather than enabled wholesale. Its native resend keeps the same ID; its standard mutation composition does not supply TrackDraw's replacement-link and atomic domain limits. App-owned D1 mutations therefore reuse its compatible table shape and existing Better Auth identity, without exposing alternate `/api/auth/organization/*` write endpoints or adding active-organization session state. This updates the foundation's provisional plugin-registration direction.

## Bounds And Lifecycle

- Per account: at most 5 owned teams and 20 total memberships.
- Per team: at most 50 members and 20 unexpired pending invitations.
- Atomic per-account fixed-hour counters: 100 management mutations and 10 invitation sends/replacements. Failed/unauthorized attempts consume the caller's budget. Counter rows are reused, not appended per request.
- Team lists are capped at 20, recipient history at 50 recent invitations, and owner invitation history at 100 with pending rows first. Direct invitation links use a separate exact-ID authorized lookup, so history limits cannot hide a valid link.
- Migration `0031_team_membership_management.sql` adds delivery state, bounded-counter persistence and database guards against deleting/demoting/moving an owner member. These guards also protect admin, self and scheduled account deletion. Owner accounts remain excluded from inactivity notices/removal until ownership is transferred or the team is deleted.
- Migration `0035_team_ownership_lifecycle.sql` adds atomic owner transfer and explicit team deletion through the existing management endpoint. Exactly one accepted, verified member owns the team after transfer. Deletion cancels invitations and leases, revokes publication, then permanently purges the team projects and membership/invitation records; gallery media uses the existing durable cleanup queue. There is no trash/restore period. Individual membership removal does not transfer team projects or change deliberate public shares. See [the lifecycle validation record](team-ownership-lifecycle-validation.md).

## Validation

Use the SQL-backed membership tests, team API tests and account/teams component tests. Validate a fresh/existing-account invite, resend/revoke, role downgrade, leave and wrong-account attempt against real authenticated local Cloudflare preview on desktop and mobile. Apply all team migrations through `0035_team_ownership_lifecycle.sql` first; local validation does not establish live mail delivery or production deployment.
