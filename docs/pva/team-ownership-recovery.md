# Inactive owners and team recovery

## Decision

Team ownership does not extend personal account retention. Owners receive the normal eleven-month warning, twelve-month minimum inactivity period and final notice with at least seven days to return. Valid sessions and acknowledged delivery still protect the account. Voluntary deletion requires resolving team ownership first.

The first eligible editor to complete the notified thirty-day waiting period becomes owner. There is no member voting, consent collection, objection mechanism or manual approval queue. Members with concerns contact TrackDraw; an administrator can correct ownership through **Dashboard → Teams**.

## Member procedure

Open **Account → Teams → your team** to see the ownership request and exact deadline.

- The first acknowledged owner warning opens a case and snapshots accepted, verified, unbanned editors. Viewers, pending invitations, new members and removed/rejoined memberships cannot apply.
- Requesting ownership requires explicit confirmation. The owner and current members are notified. Each request's thirty-day waiting period starts after all remaining recipients' sends are acknowledged. New members receive notices without becoming eligible applicants.
- The first completed, still-eligible request wins. Equal completion times use request time and then request ID as deterministic tie breakers. Withdrawn or ineligible applicants do not block another eligible request. Live membership, verification, bans and the five-team ownership limit are checked again atomically.
- Owner activity or a valid owner session cancels inactivity succession. A deleted identity cannot reclaim ownership by registering the same address again.

Cases do not postpone personal account deletion. Without a successor, a team becomes ownerless and read-only for ninety days. Existing members can view and export projects, but cannot change projects, membership or publications. Leases expire; Studio, REST and MCP enforce the same restrictions. Published shares and gallery URLs retain team attribution during recovery. The successor gains management of them.

The fixed deadline starts in the account-deletion transaction, alongside durable recovery notices. Applications cannot start with less than thirty days left. Reminders are due thirty and seven days before cleanup. Missing delivery or insufficient reminder lead time holds cleanup and reports failure for operator action; it does not retain the former owner's account. After the deadline no new applications, automatic transfers or admin owner corrections are accepted. Teams without members still receive the ninety-day retention period.

Final cleanup permanently removes team projects, membership and public links, with preview media queued for routine cleanup. There is no trash or restoration flow. Downloaded copies cannot be recalled.

## Administrator procedure

**Dashboard → Teams** lists all teams, their owner, member/project counts and ownership status. Search and **Needs attention** narrow the paginated directory. Selecting a team opens a standard dashboard Sheet or mobile drawer with members and recovery details.

**Change owner** lets an administrator assign an existing verified, unbanned editor with available ownership capacity. Select the recipient, provide a reason and confirm. The previous owner becomes an editor; pending recovery ends and publication management follows the new owner. The server checks the current owner against the owner shown when confirming, rejecting stale concurrent changes. A dedicated audit event records the actual administrator, previous/new owner and reason. Administrators cannot appoint outsiders or silently promote viewers through this action.

Expand **Notice delivery** to inspect pending sends. Delivery claims are durable, provider keys remain stable during retries, and ambiguous delivery stops replay after the twenty-three-hour safe window. These failures remain visible in scheduled-task results. Verify the exact notice in the mail provider before **Confirm provider delivery**, recording receipt evidence. The full waiting/reminder period starts conservatively from reconciliation. Use **Retry verified unsent notice** only when the provider confirms the previous attempt was never accepted or sent; record that evidence to create a new delivery generation. Never retry an ambiguous accepted request. Completed cases with uncertain outcome notices remain accessible in their team's panel.

## Implementation and rollout

- `0036_team_inactivity_succession.sql` preserves gallery data while allowing ownerless publication attribution, adds case/application/outbox and atomic command records, and permits owner detachment only from the existing guarded retention batch.
- Shared authorization and database guards enforce read-only recovery. `team-succession-jobs.ts` owns notice delivery, automatic succession and purge; `admin-teams.ts` owns the restricted directory and corrections.
- Session routes `/api/teams/succession` and `/api/admin/teams` use private responses, bounded bodies and trusted-origin mutations. `/dashboard/teams` is administrator-only. Existing REST/MCP credential grants do not gain administrative access.
- The existing hourly cron becomes `15,30,45 * * * *`; midnight remains unchanged. Minute 45 sends at most two notices, advances at most two applicants and checks at most two purge cases. Fairness timestamps rotate blocked work. No new binding, secret or feature flag is required; existing mail configuration is reused. Delivery failures do not suppress independent safe lifecycle work.
- Announce this policy before migration/deployment. Existing owners receive a fresh complete notice cycle. Apply migration 0036 before application code; migration itself deletes no accounts or teams. Application rollback does not reverse transfers, deletions or schema changes.

## Acceptance

Validate exact lifecycle boundaries, first-completion ordering, atomic correction, stale owner/member/session/ban races, publication preservation and cleanup, reminder lead times and administrator-only access in migrated SQLite tests. Validate the selected layout and primary interactions in authenticated Cloudflare preview on desktop/mobile. Distinguish local fixture clock/delivery acknowledgements from real elapsed waiting periods and external email delivery; do not send to fixture addresses.
