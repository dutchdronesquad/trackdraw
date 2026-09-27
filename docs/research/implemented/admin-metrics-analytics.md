# Admin Metrics And Analytics

> [!IMPORTANT]
> [`product-metrics-contract.md`](./product-metrics-contract.md) is the normative source of truth for product-event names, schemas, identity boundaries, and metric definitions. This document records the earlier implementation research and shipped first slice; where it conflicts with the versioned contract, the contract wins.

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

Shipped: user population cohorts, activation funnel, consolidated content totals and monthly content growth, user growth, plain-language account usage distributions, share and gallery health, privacy-safe product usage, retention cohorts, and plan limit simulation across three thresholds. The admin Metrics page also covers every tracked event type through focused export, share, and editor behavior breakdowns.

**Dashboard interpretation principle:** show each raw count once, then use the rest of the page to add context. A short needs-attention area surfaces up to three factual operational issues or 30-day movements once two complete comparison windows exist. The overview keeps creator journey, usage, embed reach, growth, and operational exceptions close at hand; detailed account distributions and plan-limit simulations live on the dedicated plan-decisions page. Movements are investigation prompts rather than causal claims, and early totals are not labelled as trends while the baseline is still building.

**Tier 2 — requires event tracking:**
Metrics about what happens inside the editor and on public pages require a lightweight event log. The first slice is shipped for editor sessions, exports, 3D preview opens, imports, element placement, and public share views. More detailed guest-to-account conversion remains a possible later extension.

### Tier 2: Event Tracking Design

TrackDraw already has an `audit_events` table used for account security and moderation trails (role changes, key lifecycle, share revocations). Product analytics events should go in a **separate `product_events` table** rather than reusing `audit_events`. Reasons: audit events are always actor-linked and identity-sensitive, while product events may be session-scoped pseudonymous or account-linked; mixing them pollutes the audit dashboard with high-volume signal noise; and product events have a different retention and pruning lifecycle.

The earlier first-slice implementation introduced a single `product_events` table in D1 with the narrow schema below. This is an implementation snapshot, not the v1 contract; [`product-metrics-contract.md`](./product-metrics-contract.md) defines the required logical envelope and closed per-event schemas.

```sql
create table product_events (
  id          text primary key,
  event_type  text not null,         -- e.g. "share.viewed", "export.completed", "editor.3d_opened"
  session_id  text,                  -- ephemeral pseudonymous browser-session token
  user_id     text,                  -- nullable; only set when a signed-in user triggers the event
  project_id  text,                  -- nullable; the relevant project if applicable
  share_token text,                  -- nullable; for share-related events
  metadata_json text,                -- bounded scalar metadata, such as export format
  created_at  text not null
);
```

Keep it narrow: no IP addresses, no user-agent strings, no geolocation. Session IDs should be ephemeral and must not persistently link pre-authentication activity to an account. They remain pseudonymous while TrackDraw can single out a session. The goal is aggregate product signals, not individual tracking.

**Existing instrumentation snapshot — first slice (non-normative):**

| Event                    | Trigger                              | Key fields                                     |
| ------------------------ | ------------------------------------ | ---------------------------------------------- |
| `share.viewed`           | Public share or embed load           | `share_token`, surface metadata                |
| `export.completed`       | An export finishes                   | `project_id`, format metadata                  |
| `editor.3d_opened`       | 3D preview first opened in a session | `project_id`                                   |
| `editor.element_placed`  | One or more elements added           | `project_id`, kind and count metadata          |
| `project.imported`       | JSON import completes                | `user_id` when signed in, imported shape count |
| `editor.session_started` | Editor opened in a browser session   | `session_id`, `user_id` when signed in         |

**Metrics unlocked by Tier 2:**

- Share and embed view counts
- Export format distribution across PNG, SVG, 3D render, Race Pack, project JSON, WebM, and Velocidrone
- 3D preview adoption (how many users ever open it)
- Most-placed element types across all projects
- Imported shape volume and average import size

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
- Privacy-oriented defaults: no cookies and no fingerprinting; the controller must still assess the configured processing and applicable consent rules
- Integrated directly in the Cloudflare dashboard
- Zero infrastructure to maintain

This is the right starting point. It covers country distribution, referral sources, top pages, and visit trends.

Cloudflare traffic by country does not establish where people actively use the editor or which interface language they prefer. TrackDraw therefore measures future localization demand separately under [`L10N-001`](./localization-demand-metrics.md): an identifier-free daily aggregate of creator sessions by normalized primary browser language, selected interface locale, and thresholded country context. It must not be reconstructed from Cloudflare traffic or joined to product events.

### Alternative: Plausible or Fathom

If more detail is needed later (custom events, funnels, goal tracking), external analytics products can be evaluated separately. A vendor's privacy or compliance claim does not by itself determine TrackDraw's GDPR legal basis or whether Dutch device-storage rules require consent.

Do not add a third-party analytics product until its exact configuration, recipients, transfers, storage behavior, legal basis, and consent requirements have been assessed against the normative product metrics contract.

### What Web Analytics Should Answer

- Which countries do visitors come from?
- Which pages get the most traffic?
- Where does traffic originate (direct, search, social, referral)?
- Is traffic growing over time?

## Open Questions

- Raw product events are retained for 180 days, which supports recent retention cohorts while keeping the dataset bounded.
- `editor.element_placed` records actual placement counts, grouping bulk insertions by element kind.
- `share.viewed` is deduplicated per share token and browser session across share and embed surfaces.

### Embed placement sources

Embed placement measurement uses a separate aggregate from raw product events. The browser reduces the embedding page referrer to a validated public hostname before sending it. TrackDraw rejects full URLs, paths, query parameters, IP-address hosts, local hosts, and TrackDraw-owned hosts.

The server increments one daily counter per published share and hostname. These rows contain no user ID, browser-session ID, IP address, user agent, or device data. Publishers see a hostname only after at least three detected views, limited to the last 30 days. Daily rows expire after 90 days and cascade-delete with the published share.

Do not merge historical Cloudflare HTTP Analytics into these counters automatically. Cloudflare may provide a short, plan-dependent window grouped by embed path and referrer hostname, but those sampled request totals are not equivalent to TrackDraw's browser-session-deduplicated counts. Any one-off historical reconstruction must remain visibly labelled as an estimate and separate from first-party aggregates.

## Dashboard period selection

The shared date selector controls user growth, localization demand, editor usage, exports, share viewing, thresholded embed reach, and content growth. Usage sections display the effective complete UTC days; the current incomplete UTC day is excluded. Comparisons use the immediately preceding equally long period and stay unavailable when its history is incomplete. Raw-event breakdowns respect the 180-day retention boundary, while embed-hostname aggregates respect 90 days. Coverage begins conservatively after the earliest observed day, subject to retention; it does not prove that collection had no outages. A missing or out-of-coverage period must not be presented as measured zero activity. Available partial counts are explicitly labelled.

Content growth counts creation dates of currently stored projects, signed-in shares, and presets; it is not an immutable creation ledger and excludes deleted records. Share/gallery health represents the current state. Core product metrics, acquisition, feature adoption, retention, and reliability keep their contract-defined fixed windows and are labelled independently of the selector. Fixed raw-event API-key usage remains a 30-day operational measurement, outside these selectable views.

Changing the selection reloads the affected data through server actions requiring `admin.metrics.read`. Loading and retryable error states replace stale results, and responses for superseded selections cannot overwrite the displayed period. Measurement collection, retention policies, and public data access are unchanged.

## Selected-period product analysis

Four analytical views use existing versioned events inside the selected complete UTC days and the 180-day raw-event retention boundary. They introduce no new collection, session identifiers, external exchange, or changes to the stable MTR definitions. The server returns aggregate counts and duration statistics only.

- **Weekly activity (Overview):** Monday–Sunday UTC buckets for distinct recorded editor-start sessions, completed export events, and share/embed view events. Weeks at selection, retention, or observation boundaries are marked partial. Weeks before observed coverage have unavailable values rather than invented zeroes. Exports and views are event counts, not unique people. The accessible table exposes the same counts and coverage as the chart.
- **Where sessions stop (Creation):** cohorts are assigned to the first recorded editor start in the selected period. A meaningful edit must follow that start; a valuable result must follow that edit in the same session. Results include successful exports, share creation, and gallery publication. Each session counts once per stage. Drop-off uses the preceding stage as its denominator; a zero denominator has no percentage. Weekly cohort counts and start-to-result conversion show how progression changes. These are observed incomplete journeys, not proof of abandonment or its cause. Outcomes after the selected end are excluded, so recent cohorts can still mature.
- **Time to first result (Creation):** elapsed seconds from that start to the first subsequent result in the same session, without requiring an edit. Report the median, nearest-rank 75th percentile, and number of completed sessions. The even-sample median averages the two middle values. Unfinished sessions are counted separately and excluded from duration statistics; an empty sample has no duration. Idle time is included. This is not an export processing-time measurement, a user-level first-ever milestone, or a causal UX diagnosis.
- **Export reliability by format (Distribution):** pair `export.completed` and `export.failed` from contract `1.1.0`, grouped by the same format. Failure rate is failed / (successful + failed) recorded terminal attempts. Retries are separate attempts; unfinished or undelivered attempts are unknown. Contract `1.0.0` successes and legacy `operation.failed` export failures are listed together as older events without a format-level rate. Unknown formats also have no rate. Never combine legacy successes with newer format-level failures in one denominator.

Denominators or duration samples below 30 carry a limited-sample label; this is an interpretation guard, not a statistical significance claim. Partial coverage is displayed with the existing period controls and does not qualify for automated trend warnings. The per-week views do not sum overlapping rolling MTR aggregates.
