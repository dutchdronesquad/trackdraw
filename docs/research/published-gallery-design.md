# Published Gallery — Page Design

Date: April 18, 2026

Status: draft, pending approval

Related documents:
- [Published Gallery PVA](../pva/published-gallery-pva.md)
- [Published Gallery Evaluation](published-gallery-evaluation.md)

## Summary

This document defines the visual structure, layout, and integration points for the public gallery browse surface. The gallery is a standalone public page at `/gallery` that shows curated and recent track designs. Visitors browse cards and click through to the existing `/share/[token]` share viewer.

This document covers the gallery page design, the opt-in flow in the share dialog, and where the gallery is reachable from across the site.

## URL and Routing

Route: `/gallery`

Rationale: matches the product language already established in the PVA and evaluation document. Short, discoverable, and distinct from `/share` (destination) and `/studio` (editor). `/explore` and `/tracks` were considered but `gallery` best describes the intent — a curated, intentional surface, not a live feed.

No sub-routes in v1. Detail pages (`/gallery/[id]`) are out of scope; cards link directly to `/share/[token]`.

## Site Integration

### Landing page nav

Add a `Gallery` link to the existing landing page navigation, between `Features` and `In depth`. The nav already has five anchored links; the gallery is the first real route added to that bar.

```
Home  Features  Gallery  In depth  Pricing  FAQ  |  [Open Studio →]
```

The gallery link is always visible, not hidden behind a dropdown. On mobile the nav is currently not shown — the gallery link follows the same behaviour as the existing nav items.

### Landing page body

At Phase 5, if the gallery is ready to represent the product publicly: add a small `Showcase` section near the bottom of the landing page, above the FAQ, showing three featured gallery cards with a `Browse the gallery →` link. This is a Phase 5 decision and does not need to be built alongside the gallery itself.

### Studio — share dialog

After a user has a valid published share, the share dialog shows a secondary `Show in gallery` action. This is the primary opt-in entry point. See the opt-in flow section below.

### Studio — account menu

After a user has opted in to the gallery, the account popover can optionally show a `Your gallery entry` link. This is a v1 nice-to-have, not a hard requirement.

### Admin dashboard

A `Gallery` module in the dashboard sidebar gives operators full visibility over all entries. See the PVA Phase 4 checklist.

## Page Structure

The gallery page uses the same sticky header and footer as the landing page. The max content width is `max-w-6xl` to match.

```
[Sticky header — same as landing page]

[Page header section]
  Eyebrow: Gallery
  Heading: "Community tracks."
  Subtext: Browse track designs shared by the FPV community.
  [Optional: entry count or soft stats once the gallery has content]

[Featured section]
  Eyebrow: Featured
  [Featured card grid]

[Recent section]
  Eyebrow: Recent
  [Recent card grid]
  [Load more button or end-of-list indicator]

[Empty state — shown when no entries exist]

[Footer — same as landing page]
```

The page is server-rendered with no auth requirement. Any visitor can browse without an account.

## Featured Section

Featured entries are manually curated by moderators or admins. Featured is the primary section and appears first.

### Layout

Desktop: a 3-column grid of standard cards. No hero card in v1 — a hero variant adds layout complexity and is harder to manage when the featured set changes. Three equal cards gives the moderator flexibility to feature 1, 2, or 3 entries without the layout breaking.

Tablet (md): 2 columns.

Mobile (sm): 1 column.

### Visual treatment

Featured cards get a subtle brand-primary accent: a faint border highlight or a small `Featured` badge on the card image. This distinguishes them from recent cards without requiring a different card component.

### Count

Recommended initial count: 3 featured entries. The dashboard module allows adding or removing featured status on any entry.

If fewer than 3 entries are featured, the grid fills with however many exist. If no entries are featured, the Featured section is hidden and the page opens directly with Recent.

## Recent Section

Recent shows gallery-visible entries (including featured) in reverse chronological order by `gallery_published_at`, excluding hidden entries.

### Layout

Desktop: 3-column grid, same as Featured.

Tablet: 2 columns.

Mobile: 1 column, or 2 columns with compact cards if screen width allows.

### Pagination

v1 uses a `Load more` button rather than infinite scroll or numbered pagination. Load more is simpler to implement, avoids scroll-position management, and works well at low entry counts.

Initial page: 12 cards. Each load-more step adds 12 more.

### Relationship to Featured

Featured entries can appear in both sections simultaneously: at the top as Featured, and again in their chronological position in Recent. This is acceptable in v1 because the Featured set is small. If it feels redundant, Recent can exclude already-featured entries — but that is a product refinement for later.

## Card Design

Each gallery card represents one gallery entry. All cards use the same component regardless of whether they appear in Featured or Recent. The Featured badge is the only visual difference.

### Anatomy

```
┌─────────────────────────────────┐
│                                 │
│        Preview image            │  ← 16:9, fills full card width
│        [Featured badge]         │  ← top-left, only if featured
│                                 │
├─────────────────────────────────│
│  Title                          │  ← font-semibold, single line, truncated
│  By Author name                 │  ← text-muted-foreground, text-sm
│  ─────────────────────────────  │
│  ⬛ 40×60 m    ◈ 12 obstacles   │  ← compact metadata row
└─────────────────────────────────┘
```

### Specs

- Card background: `bg-card/20` with `border border-border/50`, `rounded-2xl` — matches landing page feature cards
- Preview image: 16:9 aspect ratio, `object-cover`, `rounded-t-2xl`
- Card body padding: `p-4`
- Title: `text-sm font-semibold`, one line, truncated with ellipsis
- Author: `text-xs text-muted-foreground`, one line, truncated
- Separator: `border-t border-border/40 mt-3 pt-3`
- Metadata row: `text-xs text-muted-foreground flex items-center gap-3`
- Metadata items: field size (e.g. `40×60 m`) and obstacle count (e.g. `12 obstacles`) — both derived from the share data

### Hover state

- Subtle scale: `hover:scale-[1.015]` with `transition-transform duration-200`
- Border lightens: `hover:border-border/80`
- Optional: faint glow behind the preview image on hover, using the brand primary color at low opacity

### Click behaviour

The entire card is a link to `/share/[token]`. The link opens in the same tab. No intermediate gallery detail page in v1.

### Featured badge

A small pill in the top-left corner of the preview image: `bg-background/80 backdrop-blur text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full`. Text: `Featured`. Only shown on featured cards.

### Missing or loading preview

If the preview image fails to load: show a placeholder with the TrackDraw mark centered on a muted background. Do not show a broken image icon.

## Page Header

```
Gallery                            ← Eyebrow component (same as landing page)
Community tracks.                  ← h1, same size/style as landing page section headings
Browse track designs shared        ← text-muted-foreground, text-sm, leading-7
by the FPV community. Open a
card to view the full layout.
```

The page header does not include a search bar or filter in v1. Leave empty space below the subtext for a future search bar without requiring a layout change.

## Empty and Low-Content States

### Fully empty (no gallery entries at all)

Show the page header as normal, then a centered empty state:

```
[TrackDraw mark, muted, size-12]
No tracks yet.
The gallery will grow as race directors share their designs.
```

No CTA to upload or opt in from this page. The opt-in path stays in the studio share dialog.

### Low content (1–5 entries)

Show the entries that exist. Do not show the Featured section label if no entries are featured. Do not show the Recent label if fewer than 3 entries exist — just show the entries in a grid without section labels. This avoids the gallery feeling sparse when it is just starting.

### Featured section empty, Recent has entries

Skip the Featured section entirely. The page opens directly with the Recent grid and its label.

## Opt-In Flow in the Share Dialog

This is the primary route for owners to list a track in the gallery. The share dialog already exists; the gallery opt-in is a secondary layer added on top.

### Share dialog — updated structure

When a user has a valid published share, the share dialog shows:

```
[Share link field with copy button]

Share visibility
○ Link only          Anyone with the link can view.
○ Show in gallery    Also listed on the public gallery.
```

The visibility toggle is a radio group, not a standalone button. This makes it clear that the two states are mutually exclusive choices for this share.

If the share is already gallery-visible, the dialog shows `Gallery visible` as the active state with a `Remove from gallery` option.

### Gallery opt-in confirmation step

When the user selects `Show in gallery`, do not apply it immediately. Open a small confirmation step, either a second dialog view or a slide-in panel within the same dialog:

```
List in gallery

Track title        [pre-filled from project title, editable]
Short description  [pre-filled from project description, editable]
Your name          [pre-filled from account display name, read-only with note]

A preview image will be generated automatically from your track design.

This track becomes browseable by anyone visiting the gallery. Your
share link will remain active as long as this entry is in the gallery.
You can remove this track from the gallery at any time.

[Cancel]  [List in gallery →]
```

Read-only fields (author name) should explain why they are not editable here: `Shown as your account display name. Change this in your profile settings.`

### Validation

Block the `List in gallery` action if:

- title is empty
- description is empty or fewer than 10 characters
- account display name is not set

Show inline errors for each missing field rather than a single generic message.

### After opt-in

The share dialog returns to the main view and shows the updated state: `Gallery visible`. A short success line: `Your track is now listed in the gallery.` with a `View in gallery →` link if the gallery page is live.

### Remove from gallery

In the share dialog, when the share is gallery-visible: show `Remove from gallery` as a secondary action. Clicking shows a short confirmation: `This will remove your track from the gallery. Your share link continues to work.` with `Cancel` and `Remove` buttons.

Removal happens immediately on confirm. No additional steps.

## SEO and Open Graph

### Gallery index page (`/gallery`)

- Title: `Gallery — TrackDraw`
- Description: `Browse FPV drone race track designs shared by the TrackDraw community. Open any track in the full read-only viewer.`
- OG image: the same default TrackDraw social image used on the landing page
- Canonical: `/gallery`
- No `noindex` — the gallery should be publicly indexable

### Individual gallery entries

Gallery entries do not have their own URLs in v1 (`/gallery/[id]` is out of scope). The canonical destination for each entry is `/share/[token]`, which already handles its own metadata.

If a `Gallery` section is added to the landing page in Phase 5, it uses static OG metadata, not per-card metadata.

## Mobile Layout

The gallery page header stacks vertically on mobile (same as landing page sections).

Card grid:

- Mobile: 1 column
- Tablet (sm: 640px): 2 columns
- Desktop (lg: 1024px): 3 columns

The sticky header on mobile follows the same pattern as the landing page: the nav links are hidden, and only the logo and the `Open Studio` button are shown.

Load more button: full-width on mobile, auto-width centered on desktop.

## Graceful Degradation

### Featured entry share revoked

Gallery-visible shares do not expire passively — opting into the gallery pins the share. The only way a featured entry disappears is if the owner manually revokes the underlying share, or a moderator hides the entry. If a featured entry is removed, the featured section shrinks or disappears gracefully; no error state is shown to the visitor.

### Preview image fails

Show the TrackDraw mark placeholder rather than a broken image. The card remains clickable; the share viewer generates its own preview.

### Gallery unavailable

If the gallery data endpoint fails: show the page header and an error state below it: `Gallery unavailable. Try again shortly.` Do not show a full error page or redirect.

## What Is Explicitly Out of Scope for V1

- `/gallery/[id]` detail page
- Search or filter bar
- Sorting options (by date, by popularity)
- Likes, comments, or engagement counts on cards
- Public profile links from the author byline
- Remix or fork from gallery
- Embedding gallery cards on external sites
- Gallery RSS or API endpoint
- Landing page gallery section (Phase 5 decision)
