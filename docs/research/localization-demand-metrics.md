# Localization Demand Metrics Contract

## Contract status

| Field       | Value                                    |
| ----------- | ---------------------------------------- |
| Contract ID | `trackdraw-localization-demand`          |
| Version     | `1.0.0`                                  |
| Metric ID   | `L10N-001`                               |
| Owner       | Product                                  |
| Purpose     | Prioritize supported interface languages |
| Window      | Last 28 complete UTC days                |
| Retention   | At most 24 months                        |

This contract is separate from the versioned product-event contract. It never adds geographic or language properties to `product_events` and must not be joined to product-event, account, project, share, audit, or security data.

## Measurement

`L10N-001` counts writable editor sessions by primary browser language. Collection begins when the editor becomes usable and is attempted at most once per top-level browser session. Read-only shares and embeds are excluded.

The server derives and immediately normalizes:

- the highest-priority primary language from `Accept-Language` to an allowlisted ISO 639-1 code or `unknown`;
- the Cloudflare edge country to an ISO 3166-1 alpha-2 code or `unknown`;
- the selected TrackDraw interface locale from the closed supported-locale enum sent by the client.

The write increments one UTC daily cell containing only `preferred_language`, `served_locale`, `country_code`, and `creator_sessions`. It stores no event row, timestamp below day precision, IP address, user agent, browser-session identifier, account, project, share, path, referrer, or track content. Cloudflare country information exists only in request memory before the daily counter is incremented.

## Disclosure and interpretation

The dashboard shows a language only after at least five creator sessions in the selected complete period. Lower-volume languages are merged into `other`. Country context is independently thresholded at five sessions within a displayed language; lower-volume countries are merged into `other`. The total for unsupported preferred languages is hidden while below five.

A period is:

- `not_started` when the measurement-start row is absent;
- `building` until 28 complete UTC days have elapsed;
- `low_volume` below 30 creator sessions;
- `healthy` after complete coverage and sufficient volume.

Previous-period values are shown only after two complete 28-day windows. The metric counts browser sessions, not unique people. Browser language can differ from the language a person wants for TrackDraw, and country inference can be affected by VPNs, relays, corporate networks, or geolocation errors. Language demand therefore informs prioritization but does not automatically authorize or schedule a translation.

## Choice and lifecycle

The existing Product analytics preference governs this aggregate. The client does not send the request after a browser opt-out, and the server rejects it for a signed-in account with an upheld objection. Admin and likely bot traffic are excluded. Because stored cells contain no identifier, a completed aggregate cannot be located or rewritten for one browser or account. Daily cells older than 24 months are removed by scheduled cleanup.

Historical demand before migration `0017_localization_demand_daily.sql` is unavailable and must not be inferred from accounts, projects, locale preferences, Cloudflare traffic, or product events.
