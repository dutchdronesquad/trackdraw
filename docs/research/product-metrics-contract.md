# Product Metrics Contract

## Contract status

| Field           | Value                                                            |
| --------------- | ---------------------------------------------------------------- |
| Contract ID     | `trackdraw-product-metrics`                                      |
| Version         | `1.0.0`                                                          |
| Status          | Proposed; authoritative when merged                              |
| Owner           | Product                                                          |
| Technical owner | TrackDraw maintainers                                            |
| Privacy owner   | Dutch Drone Squad data controller                                |
| Applies from    | The first production event carrying `contract_version = "1.0.0"` |
| Review cadence  | Before every schema change and at least annually                 |

This document is the source of truth for TrackDraw product-event names, payloads, identities, and metric definitions. Implementation code and dashboards must reference the stable `EVT-*` and `MTR-*` identifiers below. Event names are API values and may not be repurposed. A changed meaning or payload requires a new event ID or a major contract version; an optional backwards-compatible enum value requires a minor version; wording-only clarification requires a patch version.

The contract covers product measurement only. Security audit logs, operational logs, billing records, Cloudflare HTTP analytics, and the separate thresholded embed-referrer aggregate are different datasets with different purposes and must not be joined into product metrics unless a later contract version explicitly permits it.

## Normative privacy boundary

The words **must**, **must not**, **should**, and **may** are normative.

- Measurement must answer aggregate product questions, never profile a person, target advertising, score a user, or reconstruct a track.
- Anonymous measurement must be scoped to one browser session. It must use a cryptographically random UUID held in `sessionStorage`, must not be copied into persistent storage, and must not be derived from device or network characteristics. The HTML standard defines session storage per origin and top-level browsing context, which gives the intended tab/session boundary ([WHATWG HTML, Web storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-sessionstorage-attribute)).
- The server, not the browser, must resolve an authenticated `user_id`. The browser session ID must rotate whenever authentication state changes, before another product event is sent. Events collected before sign-in must not be retrospectively attached to the account, and signing out must not create cross-session linkage.
- A session, user, project, or share identifier is at most pseudonymous, not anonymous. Pseudonymisation reduces linkability but does not take data outside the GDPR; only data that can no longer be linked to an individual by reasonably likely means is anonymous ([GDPR Article 4(5)](https://eur-lex.europa.eu/eli/reg/2016/679/art_4/oj/eng), [Recital 26](https://eur-lex.europa.eu/eli/reg/2016/679/recital_26/oj/eng), [EDPB overview](https://www.edpb.europa.eu/topics/ai-and-technology/anonymisationpseudonymisation_en)).
- Only allowlisted event fields and allowlisted enum values may be accepted. Unknown fields, unknown enum values, overlong strings, non-finite numbers, and payloads above the endpoint limit must be rejected rather than silently stored.
- Product tracking must remain best effort and must never block editing, saving, sharing, publishing, viewing, or exporting.

These rules implement purpose limitation, data minimisation, storage limitation, security, and accountability under [GDPR Article 5](https://eur-lex.europa.eu/eli/reg/2016/679/art_5/oj/eng), as well as data protection by design and by default under [GDPR Article 25](https://eur-lex.europa.eu/eli/reg/2016/679/art_25/oj/eng).

### Payloads that are always forbidden

No event or event-adjacent log may contain:

- free-form user input or arbitrary metadata keys;
- track/design content, shape geometry, map coordinates, paths, route points, notes, titles, descriptions, filenames, or imported/exported file contents;
- account names, display names, email addresses, phone numbers, or other direct contact data;
- IP addresses, user-agent strings, device IDs, browser fingerprints, or hashes derived from any of them;
- full referrer or landing URLs, URL paths, query strings, fragments, search terms, or raw campaign parameters;
- share URLs, API keys, auth/session tokens, cookies, credentials, or secrets;
- exception messages, stack traces, request/response bodies, rendered content, or screenshots;
- values copied from forbidden fields after hashing, encoding, truncating, or encrypting them.

An event-specific schema may allow a bounded scalar or enum only when listed in this contract. `metadata: Record<string, scalar>` is not a compliant schema.

## Identity and event envelope

Every v1 event uses this logical envelope. Storage column names may differ, but semantics may not.

| Field                | Source                       | Requirement                                                         |
| -------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `contract_version`   | Client/server constant       | Required literal `1.0.0`                                            |
| `event_id`           | Server                       | Random UUID row identifier                                          |
| `event_name`         | Event catalog                | Required allowlisted value                                          |
| `occurred_at`        | Server                       | UTC timestamp; client timestamps are not accepted                   |
| `browser_session_id` | Browser                      | Nullable random UUID from `sessionStorage`; rotates at auth changes |
| `user_id`            | Authenticated server session | Nullable; never accepted from the request body                      |
| `project_id`         | Event schema                 | Nullable opaque TrackDraw ID; allowed only for creator actions      |
| `share_token`        | Event schema                 | Nullable opaque token; allowed only for sharing/publication actions |
| `properties`         | Event schema                 | Optional closed object defined per event below                      |

An **actor** is `user:<user_id>` when the event was authenticated and otherwise `session:<browser_session_id>`. These namespaces never merge. An event with neither identifier can contribute only to non-unique raw counts. A **creator session** is a `browser_session_id` with `editor.session_started`; signed-in sessions additionally carry `user_id`. Browser-session counts are device-context counts, not people, and this limitation must be disclosed in metric interpretation.

Project and share identifiers are included only where necessary to deduplicate a product action. They must not be exposed in dashboards, exports, or small-cell drill-downs. A pre-authentication browser session ID may not be joined to an account, post-authentication session ID, security log, IP-derived datum, or embed-referrer hostname.

## Event data dictionary

`shipped` describes instrumentation present before this contract. Such data is **legacy** until the endpoint enforces `contract_version`, closed per-event schemas, and opt-out. `planned` events may not be emitted until their implementation and tests reference this contract.

| Stable ID | Event name                         | State   | Successful trigger                                                      | Allowed properties                                                                                                                                                                                                                                                                                                      | Dedupe                                                                       |
| --------- | ---------------------------------- | ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `EVT-001` | `editor.session_started`           | shipped | Writable editor becomes usable for a project                            | none                                                                                                                                                                                                                                                                                                                    | Once per project per browser session                                         |
| `EVT-002` | `editor.3d_opened`                 | shipped | 3D editor view is first shown                                           | none                                                                                                                                                                                                                                                                                                                    | Once per project per browser session                                         |
| `EVT-003` | `editor.element_placed`            | shipped | One or more elements are successfully added                             | `kind`: registry-backed element-kind enum; `count`: integer `1..500`                                                                                                                                                                                                                                                    | One event per kind per completed insertion operation                         |
| `EVT-004` | `editor.meaningful_edit_completed` | planned | A committed edit changes the design in a way that survives undo history | `edit_type`: `place`, `transform`, `delete`, `route`, `layout`, `settings`, `import`                                                                                                                                                                                                                                    | Once per committed editor operation; continuous gestures emit only on commit |
| `EVT-005` | `project.imported`                 | shipped | A validated import replaces the current design                          | `shape_count`: integer `0..5000`                                                                                                                                                                                                                                                                                        | Once per completed import                                                    |
| `EVT-006` | `export.completed`                 | shipped | Export artifact is generated successfully                               | `format`: `png`, `svg`, `json`, `pdf`, `webm`, `race_pack`, `velocidrone`, `render_3d`                                                                                                                                                                                                                                  | Once per completed export                                                    |
| `EVT-007` | `share.viewed`                     | shipped | Public share/embed becomes usable                                       | `surface`: `share` or `embed`; `share_type`: server-derived `temporary` or `published`                                                                                                                                                                                                                                  | Once per share token per browser session across both surfaces                |
| `EVT-008` | `share.created`                    | planned | Share creation succeeds and a usable link exists                        | `share_type`: `temporary` or `published`                                                                                                                                                                                                                                                                                | Once per successful share request/share token                                |
| `EVT-009` | `publication.gallery_published`    | planned | A share first becomes publicly listed in the gallery                    | none                                                                                                                                                                                                                                                                                                                    | Once per gallery publication transition/share token                          |
| `EVT-010` | `acquisition.session_attributed`   | planned | First eligible TrackDraw entry in a browser session is classified       | `source`: `direct`, `search`, `social`, `community`, `referral`, `campaign`, `internal`, `unknown`; `landing_surface`: `home`, `studio`, `gallery`, `share`, `embed`, `other`                                                                                                                                           | Once per browser session                                                     |
| `EVT-011` | `operation.failed`                 | planned | A user-visible product operation fails after it was attempted           | `operation`: `editor_load`, `import`, `export`, `share_create`, `gallery_publish`, `share_view`, `project_save`; `category`: `validation`, `authentication`, `authorization`, `conflict`, `rate_limited`, `network`, `storage`, `rendering`, `unsupported`, `unknown`; `surface`: `editor`, `share`, `embed`, `gallery` | Once per failed operation                                                    |

Additional event rules:

- `EVT-001` does not fire for read-only share/embed views.
- `EVT-003` uses the canonical item registry value, never a label or custom name. Bulk placement emits one bounded count per kind. Counts above the bound are split; zero is rejected.
- `EVT-004` is the canonical activity signal. Opening a panel, selecting an item, panning, zooming, or making a change that is cancelled does not qualify. An import emits both `EVT-004` with `edit_type = import` and `EVT-005` after the replacement commits.
- `EVT-005` records only a count after schema validation. It never records the source filename or import content.
- `EVT-006` fires only after completion, not when the dialog opens or a format is selected. The implementation must reconcile its current format strings to the closed enum before v1 starts.
- `EVT-007` keeps its existing cross-surface dedupe semantics: the first share or embed view wins for a share in a session. The server derives `share_type` from the resolved share; the browser may not assert it.
- `EVT-008` is a creator sharing action. `temporary` and account-backed `published` links remain distinguishable without storing their URL; temporary link creation is not publication.
- `EVT-009` records the transition to public discovery, not edits, moderation state, title, description, or preview image.
- `EVT-010` classifies the referrer in memory and discards it. Search, social, community, and campaign mappings are versioned server-side allowlists. Contract v1.0.0 accepts no campaign identifier; a later minor version may add an explicit closed enum, but a raw `utm_*` or other query value may never be accepted. `referral` means an external source that matches no named category. No hostname is retained in this event. `internal` is same-site navigation and must be excluded from new-acquisition metrics.
- `EVT-011` is categorical telemetry, not an error log. It must never contain status text, exceptions, response bodies, raw status codes, or dynamic route values. The v1 client must not retry product-event delivery; a later retry design requires a new client-generated, operation-scoped idempotency field in the contract.

## Metric dictionary

Event timestamps and aggregate boundaries are stored in UTC. All windows are UTC half-open intervals `[start, end)`. Cockpit metrics use the last **7 complete UTC days**, excluding the current partial day, unless their row specifies a cohort window. Analytical metrics default to the last **28 complete UTC days**. A previous-period comparison uses the immediately preceding equally sized complete period. Daily labels and calendar grouping are presented in `Europe/Amsterdam`; the UI must make daylight-saving transitions explicit rather than shifting stored UTC facts. Calendar-week/month views may be added only as differently labelled presentations of the same stable metric.

The **measurement start** for each metric is the later of (1) the contract applies-from timestamp and (2) the start of uninterrupted compliant coverage for every required event. It is fixed and stored with the metric series; it does not move with a requested report window. A requested period that crosses that date is incomplete. Legacy unversioned events must not be mixed into v1 metrics. No backfill may infer an event from unrelated tables unless this dictionary explicitly names that source.

Quality status is computed with the metric, never hand-edited:

- `not_started`: no uninterrupted contract-compliant coverage exists yet; no value is shown;
- `building`: fewer than 28 complete days since measurement start;
- `low_volume`: complete window but below the metric's minimum denominator;
- `healthy`: complete window, minimum volume met, all required event/schema checks pass, ingestion error rate below 1%, and no known outage spans more than 1% of the window;
- `degraded`: usable but a required quality check or availability threshold fails; dashboard must show the reason;
- `invalid`: event semantics changed, opt-out enforcement failed, forbidden payloads were accepted, or the denominator cannot be reconstructed; value must be hidden.

Minimum volume is a display/interpretation guard, not a claim of statistical significance. Counts remain available to authorized operators, but rates below threshold are labelled `low_volume`; acquisition buckets below five sessions are rolled into `other` in any exported or broadly visible breakdown.

| Stable ID | Metric                       | Numerator                                                                                                   | Denominator                                                                                    | Window                                        | Measurement start                                                                                        | Minimum volume                                     | Quality at v1 merge | Owner                 |
| --------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------- | --------------------- |
| `MTR-001` | Active creators              | Distinct actors with at least one `EVT-004`                                                                 | Not applicable; report a count                                                                 | 7 complete days                               | First complete UTC day with compliant `EVT-001` and `EVT-004` coverage                                   | 30 editor sessions for `healthy`                   | `not_started`       | Product               |
| `MTR-002` | Active creator rate          | Distinct actors from `MTR-001`                                                                              | Distinct actors with `EVT-001`                                                                 | 7 complete days                               | First complete UTC day with compliant `EVT-001` and `EVT-004` coverage                                   | 30 denominator actors                              | `not_started`       | Product               |
| `MTR-003` | Valuable sessions            | Distinct creator sessions with `EVT-004` followed by `EVT-006`, `EVT-008`, or `EVT-009` in the same session | Not applicable; report a count                                                                 | 7 complete days                               | First complete UTC day with compliant `EVT-001`, `EVT-004`, `EVT-006`, `EVT-008`, and `EVT-009` coverage | 30 editor sessions for `healthy`                   | `not_started`       | Product               |
| `MTR-004` | Valuable session rate        | Sessions from `MTR-003`                                                                                     | Distinct sessions with `EVT-001`                                                               | 7 complete days                               | Same stored start as `MTR-003`                                                                           | 30 denominator sessions                            | `not_started`       | Product               |
| `MTR-005` | Signed-in 30-day return rate | Signed-in users with `EVT-001` in a different session 1–30 days after their first `EVT-004`                 | Signed-in users whose first `EVT-004` has a complete 30-day observation window                 | Latest fully matured 30-day activation cohort | First mature cohort after 30 complete days of compliant `EVT-001` and `EVT-004` coverage                 | 20 denominator users                               | `not_started`       | Product               |
| `MTR-006` | Published browser sessions   | Distinct browser session IDs with `EVT-007` where server-derived `share_type = published`                   | Not applicable; report a count                                                                 | 7 complete days                               | First complete UTC day with compliant `EVT-007` and server-derived `share_type` coverage                 | 30 public viewing sessions for `healthy`           | `not_started`       | Product               |
| `MTR-007` | Publication session rate     | Sessions in the denominator whose outcome is `EVT-008` with `share_type = published` or `EVT-009`           | Distinct sessions that meet the `MTR-003` valuable-session predicate in the same 28-day window | 28 complete days                              | Same stored start as `MTR-003`                                                                           | 30 denominator sessions                            | `not_started`       | Product               |
| `MTR-008` | Acquisition source mix       | Sessions with `EVT-010`, grouped by `source`, excluding `internal`                                          | All sessions with `EVT-010`, excluding `internal`                                              | 28 complete days                              | First complete UTC day with compliant `EVT-010` coverage                                                 | 30 denominator sessions and 5 per displayed bucket | `not_started`       | Product               |
| `MTR-009` | Feature adoption rate        | Distinct eligible sessions using the named feature event                                                    | Distinct eligible creator sessions with `EVT-001`                                              | 28 complete days                              | Per feature: first complete UTC day with compliant `EVT-001` and mapped event coverage                   | 20 eligible sessions                               | `not_started`       | Product               |
| `MTR-010` | Categorized failure rate     | `EVT-011` count for one `operation` and `category`                                                          | Successful terminal events plus `EVT-011` for the same operation                               | 7 complete days                               | Per operation: first complete UTC day with compliant `EVT-011` and success-event coverage                | 30 terminal operation outcomes                     | `not_started`       | TrackDraw maintainers |

Interpretation rules:

- `MTR-001` uses a namespaced actor key. It does not claim people-level reach because anonymous sessions cannot be deduplicated across tabs or visits.
- `MTR-003` enforces order: a session with an outcome before its first meaningful edit is not valuable. Import alone is an edit, not an outcome.
- `MTR-005` is signed-in only. Anonymous return measurement would require a persistent identifier and is prohibited by v1. A user is counted once in the cohort irrespective of devices and must return in another session; same-session activity is not a return.
- `MTR-005` requires a minimal `creator_activated_at` account fact so raw-event expiry cannot make a later edit look like a user's first. It stores no session, project, or feature detail, is deleted with the account or an upheld analytics objection, and feeds a finalized anonymous cohort aggregate after the 30-day observation window.
- `MTR-006` measures public consumption, not the creator action that published the share. It always uses the browser session ID, including for a signed-in viewer, and excludes temporary anonymous links.
- `MTR-009` is a metric family. Its required feature mapping is: 3D preview → `EVT-002`; import → `EVT-005`; export → `EVT-006`; share-link creation → `EVT-008`; gallery publication → `EVT-009`. The feature event must occur in the same session as `EVT-001`. For 3D, import, export, and share-link creation, every writable editor session is eligible. For gallery publication, only signed-in editor sessions with publication permission are eligible. `share.viewed` is not creator feature adoption.
- `MTR-010` may be published only for operations with a defined success event: import → `EVT-005`, export → `EVT-006`, share create → `EVT-008`, gallery publish → `EVT-009`, share view → `EVT-007`. Editor load and project save remain failure counts until success events are defined in a later contract version; no rate may be fabricated for them.
- Dashboard labels must show the metric ID, window, measurement start, quality status, and owner. Percentage cards must expose their numerator and denominator.
- Comparisons and warnings require a current `healthy` period and at least eight preceding equally sized `healthy` periods. A count may warn only when its deviation from the historical median is both at least 30% and at least three median absolute deviations; a rate must differ by at least 10 percentage points and three median absolute deviations. If the median absolute deviation is zero, the percentage or percentage-point threshold still applies. Periods crossing measurement start, outages, or schema changes are excluded. No metric-specific threshold means no warning.
- Metrics must not be used to infer causation. Product experiments need a separate approved experiment contract.

## Retention, deletion, objection, and anonymisation

### Raw retention

Raw v1 product events are retained for at most **180 days** from `occurred_at`, matching the current scheduled cleanup policy. Every row must carry `expires_at = occurred_at + 180 days`; scheduled cleanup must delete expired rows and alert on failure.

Deletion from active storage is not always immediate deletion from recovery copies. The private operations runbook must record the applicable recovery window and ensure that a restore cannot permanently reintroduce expired or erased product events. Infrastructure-specific recovery procedures do not belong in this public repository.

### Account deletion and erasure

- Account deletion must delete raw product events by `user_id` **and** by project/share IDs owned by that account before ownership rows disappear. Merely setting `user_id` to null is pseudonymisation, not anonymisation.
- Account anonymisation follows the same rule unless every remaining event and aggregate is irreversibly de-identified. Replacing `user_id` with another stable value while project, share, or session linkage remains is pseudonymisation and stays in scope for access, objection, retention, and erasure.
- Events from a genuinely unlinked anonymous session cannot be found after the browser identifier is gone. TrackDraw must not collect extra identity merely to make those rows discoverable; [GDPR Article 11](https://eur-lex.europa.eu/eli/reg/2016/679/art_11/oj/eng) does not require retaining additional identifying information solely to identify a data subject.
- A verified erasure request must delete identifiable raw rows and any non-anonymous derived rows. The controller must ensure that recovery does not permanently reintroduce them and must document completion across active data and applicable recovery windows in the private operations runbook.
- Existing truly anonymous aggregate counts need not be rewritten because no data subject can be identified. If an aggregate still permits singling out or linkage, it is not anonymous and remains in erasure scope. [GDPR Article 17](https://eur-lex.europa.eu/eli/reg/2016/679/art_17/oj/eng) describes when erasure applies and its exceptions.

### Objection and opt-out

V1 requires a visible **Product analytics** control before new events ship:

1. Browser opt-out is available without an account and is reachable from privacy/settings surfaces.
2. The client checks the preference before creating a browser session ID or sending any event.
3. Opting out calls a same-origin endpoint that deletes rows for the current anonymous session, then clears the session ID and per-session dedupe keys. If deletion fails, the UI reports that failure and still prevents future collection.
4. A signed-in objection is stored as an account preference and enforced server-side so a modified client cannot bypass it. Upholding the objection deletes linkable raw product events and blocks future writes on every device.
5. Opt-out never degrades core editor, import/export, sharing, gallery, or read-only use. It affects product analytics only, not strictly necessary security or operational processing, which must be explained separately.

Where processing relies on legitimate interests, the right to object and the controller's duty to stop unless overriding grounds apply follow [GDPR Article 21](https://eur-lex.europa.eu/eli/reg/2016/679/art_21/oj/eng). The right must be explicitly brought to the user's attention, not hidden only in this engineering document.

### Anonymous aggregates

Privacy-minimized daily aggregates may be retained for at most **24 months** and only after a documented anonymisation review confirms that individuals cannot reasonably be singled out or linked:

- aggregate by UTC day and approved low-cardinality dimensions only;
- remove every event, session, user, project, and share identifier;
- do not retain joins or lookup tables that recreate a link;
- merge cells below five contributing actors into `other` before broader access or export;
- delete the source raw rows on schedule;
- re-review whenever dimensions, access, or external datasets change.

Aggregation and removal of direct identifiers are safeguards, not proof of anonymity. The review must apply the identifiability standard in GDPR Recital 26 and record its reasoning.

## Privacy and legal-basis assessment

This section is an engineering assessment, not legal advice or final controller approval.

### Candidate legal basis

The current English privacy notice states legitimate interests for privacy-safe product analytics. That is the plausible candidate for this narrow first-party dataset, but it is not automatic. Product-improvement and engagement metrics are generally not objectively necessary to perform a service contract; the EDPB specifically distinguishes service improvement from strict Article 6(1)(b) necessity ([EDPB Guidelines 2/2019, paragraphs 48–49](https://www.edpb.europa.eu/documents/guideline/guidelines-22019-on-the-processing-of-personal-data-under-article-61b-gdpr-in_en)). The controller must select and document a lawful basis under [GDPR Article 6](https://eur-lex.europa.eu/eli/reg/2016/679/art_6/oj/eng).

Before v1 collection ships, Dutch Drone Squad must approve a legitimate-interests assessment for each purpose:

1. **Purpose:** improve creator activation, successful output/sharing/publication, acquisition understanding, feature adoption, and reliability.
2. **Necessity:** show why the defined aggregate cannot be obtained from less intrusive operational/database counts.
3. **Balancing:** assess reasonable expectations, anonymous and signed-in users, children, identifiers, granularity, 180-day retention, access, opt-out, and consequences.

If the assessment does not support legitimate interests, the affected events require valid prior consent or must not be collected. Consent, if chosen, must be freely given, specific, informed, unambiguous, and as easy to withdraw as to give.

### Dutch device-storage/ePrivacy check

The UUID and dedupe flags use browser storage, so GDPR legal basis alone is not the whole analysis. Dutch authorities say analytical storage with no or little privacy impact may be used without consent, while privacy-sensitive analytics and tracking require consent ([ACM, Cookies plaatsen](https://www.acm.nl/nl/verkoop-aan-consumenten/reclame-en-verleiden/online-beinvloeden/cookies-plaatsen), [Dutch government, cookie rules](https://www.rijksoverheid.nl/vraag-en-antwoord/telecommunicatie/mag-een-website-ongevraagd-cookies-plaatsen)).

The controller must document whether TrackDraw's session-scoped, first-party event measurement meets the Dutch low-impact analytics exception. The contract reduces impact—no persistent anonymous ID, no fingerprinting, no cross-site profiling, closed properties, opt-out, and bounded retention—but this document does not decide the legal question. Until that assessment is approved, do not claim that no consent is required.

### Privacy and terms surfaces

The current English privacy page already discloses event type, timestamp, ephemeral session ID, optional account/project/share/export references, exclusions, legitimate-interest purpose, 180-day retention, browser storage, and the right to object. It therefore provides a strong baseline, consistent with the categories required by [GDPR Article 13](https://eur-lex.europa.eu/eli/reg/2016/679/art_13/oj/eng).

Before v1 implementation ships, update the English privacy source and effective date to:

- describe acquisition-source categories and categorized failure telemetry;
- link to the usable browser/account opt-out or objection control;
- clarify that anonymous session rows cannot be linked across visits and are not retrospectively attached at sign-in;
- disclose the minimal account-linked creator-activation timestamp used for 30-day return cohorts;
- state recipients/processor categories and relevant international-transfer safeguards if not already covered elsewhere;
- align deletion wording with active data and recovery-history handling.

Run the repository's localization checks after that English-only change; Crowdin owns target catalogs. The terms page does **not** require a change for this contract alone because no user obligation, license, warranty, or service rule changes. Reassess it if analytics later becomes a condition of service or data is reused for a contractual purpose.

## Implementation and validation gates

No new v1 event or dashboard metric is ready to ship until all applicable boxes are satisfied:

- [ ] Event references one stable `EVT-*` ID and sends `contract_version`.
- [ ] Server validates a closed event-specific schema and rejects unknown fields.
- [ ] Tests cover allowed payload, each forbidden field class, bounds, and unknown enum values.
- [ ] Authenticated identity is server-derived; anonymous identity is session-only; no stitching or fingerprinting exists.
- [ ] Opt-out/objection is enforced before ID creation and again at ingestion.
- [ ] Account deletion, anonymous-session opt-out deletion, scheduled expiry, and recovery re-deletion are tested.
- [ ] Metric references one stable `MTR-*` ID and exposes numerator, denominator, window, measurement start, minimum volume, quality, and owner.
- [ ] Monitoring detects ingestion rejection spikes, cleanup failures, unknown contract versions, and missing event intervals without logging rejected payloads.
- [ ] Privacy notice and effective date match the shipped event set.
- [ ] Legal-basis and Dutch device-storage assessments are approved by the controller.
- [ ] `npm run i18n:check`, `npm run i18n:scan-hardcoded`, relevant unit tests, typecheck, lint, and build pass.

## Current implementation gaps

Repository inspection at contract drafting time found:

- the six `shipped` event names already exist in `src/lib/product-events.ts` and write to `product_events`;
- anonymous IDs already use `sessionStorage`, authenticated IDs are already resolved server-side, and raw cleanup already targets 180 days;
- the browser session ID does not yet rotate when authentication state changes, so pre-sign-in and signed-in events remain linkable within that session;
- the endpoint still accepts generic scalar metadata rather than event-specific objects and has no `contract_version`;
- event payloads can currently include project/share identifiers beyond the event-specific need because the schema is generic;
- account deletion removes events by `user_id`, but does not explicitly delete events by IDs of projects/shares owned by the account;
- there is no product-analytics opt-out/account objection control or ingestion enforcement;
- meaningful-edit, acquisition, share-creation, gallery-publication, and categorized-failure events do not yet exist;
- current dashboard metrics do not consistently expose stable IDs, exact denominators, quality status, minimum volume, and owner;
- legacy event rows cannot be assumed v1-compliant and must remain excluded from v1 metric series.

These are follow-up implementation issues, not reasons to weaken the contract.

## Changelog

- `1.0.0` — Initial versioned event and metric dictionary; identity, payload, retention, deletion, objection, anonymisation, and legal ship gates.
