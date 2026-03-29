# Share Domain Model

This document defines the first database-backed share model for TrackDraw.

It is intentionally scoped to the first persisted share flow:

- publish a share from the current editor state
- open a share by token
- render metadata and OG image from stored share state

It does not yet try to solve full account, project, or collaboration workflows.

## Goal

Move TrackDraw from payload-in-URL sharing to stored share objects while preserving:

- `/share/[token]` as the canonical public route
- a clean read-only viewing flow
- room for future account and project storage

## Core Concepts

### Share

A `share` is the public, durable object behind a published TrackDraw link.

The first version of a share should represent:

- one published snapshot of a design
- one public token used in `/share/[token]`
- enough stored metadata to render the shared view and social metadata without decoding the full design from the URL

### Published Snapshot

A `published snapshot` is the serialized design state that a share points to.

For the first implementation, the share and the published snapshot can live in the same row if that keeps the implementation simpler.

The model should still conceptually distinguish between:

- working editor state
- published share state

That distinction matters later for:

- republishing
- saved projects
- accounts
- revision history

### Legacy Share

A `legacy share` is the earlier payload-in-URL token format.

Legacy shares are deprecated.

The retirement path should support one of these explicit behaviors:

- fail safely with a clear message and fallback path
- optionally offer a republish path later

The codebase should not keep both share systems forever.

## First Public Contract

The public route shape stays:

- `/share/[token]`

But the meaning of `token` changes:

- old system: compressed full design payload
- new system: durable public share token that resolves to stored state

This lets TrackDraw keep the public URL shape stable while replacing the underlying model.

## First Database Shape

Recommended first table:

- `shares`

Recommended first columns:

- `id` `uuid` primary key
- `token` `text` unique not null
- `design_json` `jsonb` not null
- `title` `text` null
- `description` `text` null
- `field_width` `numeric` null
- `field_height` `numeric` null
- `shape_count` `integer` not null default `0`
- `created_at` `timestamptz` not null default `now()`
- `updated_at` `timestamptz` not null default `now()`
- `published_at` `timestamptz` not null default `now()`
- `expires_at` `timestamptz` not null default `now() + interval '90 days'`
- `revoked_at` `timestamptz` null

## Why This First Shape

This first schema keeps the implementation practical:

- `design_json` stores the canonical shareable design snapshot
- the denormalized metadata fields avoid recomputing basic share metadata on every request
- `token` is independent from internal IDs
- `expires_at` supports a sensible default lifetime without forcing permanent public links
- future fields for ownership and lifecycle can be added without breaking the public route shape

This should not be over-normalized yet.

The first goal is safe publish/read behavior, not a perfect future-proof relational model.

## Token Rules

Recommended token properties:

- opaque
- URL-safe
- not derived from internal IDs
- stable for the lifetime of the share

Good candidates:

- generated random token
- short URL-safe ID

Avoid:

- sequential IDs
- exposing database UUIDs directly as the public token
- embedding full design state in the token

## First Publish Semantics

The first publish flow should do this:

1. accept the current design state from the editor
2. validate and normalize it
3. generate a public token
4. compute share metadata
5. store the published state in `shares`
6. return `/share/[token]`

For the first version, publishing can always create a new share.

Do not add update-in-place semantics until the product decision is clearer.

That keeps the first model simple:

- one publish action
- one stored share object
- one public token

Default lifetime:

- new stored shares expire after 90 days unless a different supported expiry is chosen

## First Read Semantics

The first read flow should do this:

1. read `token` from `/share/[token]`
2. look up the share row by token
3. reject revoked, expired, or missing shares safely
4. deserialize `design_json`
5. render the read-only view
6. render metadata and OG image from stored share state

## Metadata Strategy

Stored shares should be able to render:

- page title
- page description
- OG image content

The initial strategy should be:

- persist enough derived metadata at publish time
- still allow fallback derivation from `design_json` if needed

This avoids unnecessary read-time recomputation while keeping the model robust.

## Legacy Link Transition

The migration needs an explicit boundary.

Recommended first transition:

1. add stored-share support
2. keep legacy URL decoding only long enough to validate the stored-share flow
3. prefer stored-share lookup for new links
4. mark legacy payload links as deprecated in product messaging
5. remove legacy decoding only after the stored-share flow is stable

When legacy decoding is removed, the failure path should remain graceful.

Recommended failure behavior:

- show a clear invalid/outdated share screen
- show a clear expired-share screen when a stored share has passed `expires_at`
- explain that old share links may no longer be supported
- point users toward republishing from the current editor state if possible

## Forward Compatibility

This first share model should not block future work on:

- user accounts
- saved projects
- multiple published snapshots per project
- ownership rules
- revoke behavior for locally managed published links; regenerate is deferred until account-backed ownership exists

To keep that path open:

- do not treat `share` and `project` as the same concept
- do not couple the public token to an internal project identifier
- keep database access behind a narrow persistence layer
- keep the route contract stable even if the storage model evolves

## First Repository Responsibilities

The first code shape should likely include:

- `src/lib/server/db.ts` for low-level database access
- `src/lib/server/shares.ts` for share persistence functions
- a D1 migration for the `shares` table
- a publish endpoint or server action
- updates to `/share/[token]` page, metadata, and OG image code to read stored shares

## Immediate Next Steps

1. create and apply the first migration for `shares`
2. add a minimal persistence module for:
   - `createShare`
   - `getShareByToken`
3. wire the shared page to read a stored share by token
4. retire the legacy token path behind a safe failure screen
5. move OG metadata to the stored share path
