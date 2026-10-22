# Team ownership lifecycle validation

Validation for [#1025](https://github.com/dutchdronesquad/trackdraw/issues/1025), performed against the local Cloudflare preview on 22 October 2026. This records local runtime evidence; it does not assert production deployment, external email delivery or acceptance in a third-party MCP client.

## Lifecycle contract

An owner transfers ownership to an accepted, verified, non-banned member. One atomic D1 statement demotes the previous owner to editor, promotes the recipient, moves public-share/gallery attribution and records the audit event. Failure rolls back the complete transfer. Exactly one owner remains. Direct owner removal, demotion and personal account deletion remain blocked, and owner accounts stay excluded from inactivity deletion.

Team deletion is an explicit permanent operation, with no trash or recovery period. The owner reviews project/member/invitation/share/gallery/session counts and types the exact team name. The deletion statement rechecks ownership, name and those counts. It cancels invitations and editing sessions, removes public shares and gallery entries, then purges the team's projects, memberships and invitation history. Existing durable media cleanup retries physical R2 removal through the hourly job. A failed audit write rolls back the D1 deletion. Other teams and personal projects remain intact.

Local editor cleanup is best effort in an online, running client: logout resets the team workspace and selection, live role/membership checks reject stale queued saves, and confirmed access loss clears the team canvas, undo state and recovery draft. Management changes notify other running same-origin tabs; lease renewal, polling and focus checks enforce server authorization independently. Offline or previously exported copies cannot be recalled.

## Authenticated Cloudflare preview

All migrations through `0035_team_ownership_lifecycle.sql` were applied to local D1. Four disposable accounts used the normal magic-link request/verification/session flow. Local mail fallback was used; no external email provider was configured. Authentication rate limits stayed enabled.

- Owner created a team and sent editor/viewer invitations. Acceptance succeeded only for the intended signed-in account; wrong-account and replay attempts failed.
- Editor created a private team project. Viewer could read, but could not acquire editing; outsider could not read. Editor acquired a lease, saved, and a stale revision was rejected.
- Owner published a snapshot on the canonical share route. Personal account deletion was blocked while owning the team.
- Owner transferred to the accepted viewer. The former owner lost publication-management rights. The old owner then left and deleted their personal account; the share still loaded.
- The project creator left. A queued save using the former editing session failed. Their personal account was deleted; the new owner could still read the team project and public snapshot.
- The new owner reviewed impact, confirmed the team name and deleted the team. Both the team project API and canonical public share returned not found. Remaining disposable accounts were deleted.

## Desktop and mobile

The account Teams surface was checked in the authenticated preview at the normal desktop viewport and at 390 × 844. A separate disposable team with two blank projects and an accepted member exercised the actual owner menus, transfer confirmation and deletion impact form. The destructive submit stayed disabled until the exact name matched. The form and typed confirmation survived the responsive portal change; counts, labels and action buttons remained readable without horizontal overflow. Transfer confirmation opens a focused dialog with Cancel initially focused; the member role selector is available on desktop and mobile and the action menu contains only transfer/removal. The viewport was restored and the disposable team, projects and account were removed; existing user teams were preserved.

A follow-up account UI check verified uniform 36 px input/select heights, a member menu without duplicate role actions, and the Sonner success toast after a role change in a separate empty local test team. The shared confirmation dialog initially focused Cancel and remained usable after switching to the mobile viewport. Member removal, leaving, API-key revocation and MCP disconnection now use this same dialog rather than replacing a row with inline controls. Component coverage verifies cancellation, no mutation before confirmation, pending-request protection and retry after an MCP disconnection failure. That disposable team and member were removed afterwards. Team creation and other management successes also use toasts rather than inserting a saved notice above the form. Owners rename directly in the heading using Enter/Escape; the old rename screen and team action/refresh menu are removed. Delete team is a quiet footer action. Component coverage verifies draft preservation during automatic revalidation and clears the roster when membership disappears.

The owner directory includes a three-avatar preview and remaining-member counter. Authenticated local Cloudflare preview rendered a four-member team as three avatars plus +1 on desktop and at 390 × 844, without truncating the team name. The refined directory was also checked at both viewports with active project counts and inline role labels; desktop aligns projects in a separate column before the member preview; mobile places both below the team name. SQL-backed tests verify its bound, exclusion of pending invitations, outsider isolation and immediate preview revocation after ownership transfer; non-owners receive no preview or member count.

## Automated coverage and limits

The full Vitest suite passed with 1779 tests. Focused SQLite tests additionally verify gallery attribution surviving former-owner and creator deletion, banned/unverified transfer rejection, atomic audit-failure rollback, stale deletion reviews, invitation replay after purge, media cleanup queuing and unaffected personal/other-team data. Existing lease tests cover crash expiry, successor-session protection, role changes, conflicts and stale writes. Component tests cover access-loss recovery cleanup, explicit confirmations and logout selection cleanup. API/MCP authorization regressions run in the full suite.

Gallery handoff/purge and crash/lease expiry were exercised by SQL-backed regression tests, not by waiting for expiry or creating a gallery listing in the four-account HTTP walkthrough. Production migrations, remote media cleanup, external delivery and real third-party MCP client acceptance remain deployment/acceptance checks.
