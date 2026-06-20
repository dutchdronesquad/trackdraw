# Admin Metrics And Analytics

## Summary

TrackDraw needs internal visibility into how the product is actually used. This serves two purposes: informing pricing and plan limits before introducing a paid tier, and giving ongoing insight into product health, user growth, and feature adoption.

This document covers internal usage metrics (built on TrackDraw's own database) and web analytics (visitor traffic and geographic origin). These are separate concerns and can be built independently.

## Why This Matters Now

Before setting free plan limits, TrackDraw needs real data:

- What is the average number of projects per user?
- What is the average number of active published shares per user?
- Are there power users with significantly higher usage?
- Where do users come from geographically?

Without this data, limits are guesswork and risk frustrating existing users unnecessarily.

## Internal Usage Metrics

These are derived from TrackDraw's own database and displayed in the existing admin dashboard.

### Candidate Metrics

**User metrics:**

- Total registered accounts
- New accounts per week / month
- Active accounts (at least one project or share action in last 30 days)

**Project metrics:**

- Total projects across all users
- Projects per user (average, median, max)
- Distribution: how many users have 1, 2-5, 6-10, 10+ projects

**Share metrics:**

- Total active published shares
- Shares per user (average, median, max)
- Share link usage (view counts if tracked)

**Preset metrics:**

- Total presets across all users
- Presets per user (average, median, max)

**Plan limit simulation:**

- Given a proposed free limit (e.g. 5 projects), what percentage of current users would be affected?
- This is the most actionable metric for pricing decisions.

**Activation metrics:**

- Users who registered but never created a project (indicates onboarding friction)
- Time between account creation and first project created
- Guest sessions that converted to an account registration (requires event tracking)

**Retention metrics:**

- Users active in multiple distinct weeks (returning users vs. one-time visitors)
- Churned users: accounts with no activity in 90+ days
- Week-over-week and month-over-month active user trend

**Editor and content metrics:**

- Which track elements are placed most often (gates, flags, obstacles, MultiGP elements)
- Average number of elements per design (track complexity)
- Most used export formats (PDF, PNG, SVG, JSON) — requires event tracking
- 3D preview usage (how many users ever open it)
- Import frequency vs. starting from scratch

**Share engagement metrics:**

- Shares created but never viewed (dead links)
- Average number of views per share link
- Share links still receiving traffic after 30 / 60 / 90 days (indicates long-lived use cases like club event pages)

**Geographic distribution:**

- Country distribution of registered users (from IP at signup or billing address)
- Country distribution of share link viewers if view tracking is added

**Growth metrics:**

- New accounts per week and month, plotted as a trend
- Projects created per week and month
- Cumulative totals vs. rate of change

**API metrics:**

- Active API keys in use
- Request volume per API key (indicates power users or integrations)

**Health metrics:**

- Archived vs. active projects (users tidying up vs. abandoning)
- Revoked vs. expired vs. active share links

### Implementation Approach

No external tooling needed. The data lives in the existing D1 database. Add a metrics page to the existing admin dashboard with simple aggregate queries.

Queries can be added incrementally — start with the most relevant ones for plan limit decisions (projects per user, shares per user) and expand over time.

Access should be restricted to admin role, consistent with the existing role system.

### Implementation Tiers

Not all metrics are equally easy to build. They fall into two tiers:

**Tier 1 — database queries only (no new instrumentation):**
Everything that can be answered from the existing `projects`, `shares`, `users`, `layout_presets`, and `apikey` tables. This includes all count/distribution/limit simulation metrics and most growth and health metrics.

Shipped: user population cohorts, content overview, weekly new user growth, projects/shares/presets per user averages and maximums, gallery health, and plan limit simulation across three thresholds. These are displayed in the admin Metrics page.

**Tier 2 — requires event tracking:**
Metrics about what happens inside the editor (element usage, export format, 3D preview, import vs. scratch) and on public pages (share link views, guest-to-account conversion). These require a lightweight event log.

### Tier 2: Event Tracking Design

TrackDraw already has an `audit_events` table used for account security and moderation trails (role changes, key lifecycle, share revocations). Product analytics events should go in a **separate `product_events` table** rather than reusing `audit_events`. Reasons: audit events are always actor-linked and identity-sensitive, product events can be fully anonymous; mixing them pollutes the audit dashboard with high-volume signal noise; and product events have a different retention and pruning lifecycle.

The recommended approach is a single `product_events` table in D1 with a narrow, privacy-safe schema:

```sql
create table product_events (
  id          text primary key,
  event       text not null,         -- e.g. "share.viewed", "export.pdf", "editor.3d_opened"
  session_id  text,                  -- anonymous session token, not user-identifiable
  user_id     text,                  -- nullable; only set when a signed-in user triggers the event
  project_id  text,                  -- nullable; the relevant project if applicable
  share_token text,                  -- nullable; for share-related events
  created_at  text not null
);
```

Keep it narrow: no IP addresses, no user-agent strings, no geolocation. Session IDs should be ephemeral, not linked to a persistent identity. The goal is aggregate product signals, not individual tracking.

**Event catalog — first slice:**

| Event                   | Trigger                              | Key fields                               |
| ----------------------- | ------------------------------------ | ---------------------------------------- |
| `share.viewed`          | Public share page load               | `share_token`                            |
| `export.completed`      | PDF/PNG/SVG/JSON export finishes     | `project_id`, format in event name       |
| `editor.3d_opened`      | 3D preview first opened in a session | `project_id`                             |
| `editor.element_placed` | Element placed on canvas             | `project_id`, element type in event name |
| `project.imported`      | JSON import completes                | `user_id` (if signed in)                 |

**Metrics unlocked by Tier 2:**

- Share link view counts and dead link detection (shares with zero views after 30 days)
- Export format distribution (which of PDF/PNG/SVG/JSON is most used)
- 3D preview adoption (how many users ever open it)
- Most-placed element types across all projects
- Import vs. from-scratch ratio

**Privacy boundary:**

- Do not log events for operations that involve private data (project content, map locations, account settings)
- Do not store IP addresses or device fingerprints
- Session IDs should rotate per browser session and never be linked back to a user account unless the user is explicitly signed in and triggers an event that requires ownership context
- Events should be purgeable per `user_id` on account deletion to stay GDPR-compliant

## Web Analytics

Web analytics cover visitor traffic, geographic origin, referral sources, and page popularity. This is separate from internal usage metrics and does not require authentication.

### Recommended Approach: Cloudflare Web Analytics

TrackDraw already runs on Cloudflare. Cloudflare Web Analytics is:

- Free
- Privacy-friendly: no cookies, no fingerprinting, no GDPR consent banner required
- Integrated directly in the Cloudflare dashboard
- Zero infrastructure to maintain

This is the right starting point. It covers country distribution, referral sources, top pages, and visit trends.

### Alternative: Plausible or Fathom

If more detail is needed later (custom events, funnels, goal tracking), Plausible or Fathom are privacy-friendly paid options (~€9-19/month). Both are GDPR-compliant without consent banners.

Avoid Google Analytics: requires a consent banner, adds GDPR complexity, and is disproportionate for a small product.

### What Web Analytics Should Answer

- Which countries do visitors come from?
- Which pages get the most traffic?
- Where does traffic originate (direct, search, social, referral)?
- Is traffic growing over time?

## Open Questions

- What is the right retention window for raw events? 90 days of raw data with monthly rollup aggregates is a reasonable starting point.
- Should `editor.element_placed` fire once per element type per session (cheaper) or once per actual placement (more accurate)?
- Should `share.viewed` deduplicate repeat views from the same session, or count all page loads?
