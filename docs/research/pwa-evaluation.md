# PWA Evaluation

This document evaluates whether TrackDraw should add Progressive Web App capabilities beyond the current web app.

Status: research only. This is not a build commitment.

## Current State

TrackDraw does not currently appear to ship explicit PWA features.

In the repo there is currently no clear sign of:

- a web app manifest
- installability-oriented app metadata
- a service worker
- offline caching strategy
- install-prompt handling

That means TrackDraw is currently a capable mobile-friendly web app, not a deliberate PWA.

## Why PWA Is Worth Evaluating

PWA work is potentially relevant because TrackDraw is already:

- local-first while editing
- intentionally usable on mobile
- used in venue-side contexts where connection quality may vary
- oriented around repeated return usage rather than one-off page visits

Unlike wrapper work, a PWA path keeps the product fully web-first.

## What PWA Could Improve

Most plausible benefits:

- installability to home screen or desktop shelf
- cleaner app-like launch behavior
- better perceived permanence for repeat users
- selective offline support for static assets and shell UI
- a possible path toward opening TrackDraw more like a tool than a website

Potentially interesting later:

- file handling hooks for project files where browser support is good enough
- more predictable venue-side startup when the network is flaky

## What PWA Does Not Automatically Solve

PWA work would not automatically provide:

- offline publish/share creation
- cross-device sync
- durable cloud project storage
- account-linked project libraries
- native filesystem access parity across all browsers and devices

Because TrackDraw publish/read flows already depend on Cloudflare-hosted backend behavior, PWA is mostly a packaging, installability, and resilience improvement, not a replacement architecture.

## Technical Fit With TrackDraw

TrackDraw is a reasonable PWA candidate because:

- Next.js App Router has first-class support for manifest metadata files
- the product already behaves like an application more than a document site
- much of the user value is in editing, viewing, and exporting a local project rather than only consuming server-rendered content

But there are real constraints:

- service-worker behavior must not interfere with share routes, metadata, or fresh deploys
- caching mistakes would be expensive because stale share views or stale editor code can be confusing
- offline claims should be narrow and defensible rather than broad marketing language

## Recommended Scope If Explored

If PWA work becomes active, the first slice should stay small:

1. add a proper manifest
2. add icons and installable metadata
3. validate standalone launch behavior on mobile
4. add a minimal service worker only if caching goals are extremely clear

Good first outcome:

- installable app shell
- no ambitious offline promises yet
- no heavy caching of share routes or dynamic server-backed surfaces

## Suggested Research Questions

1. Does installability materially improve repeat usage for venue-side users?
2. Which app surfaces should be safe offline: landing page, studio shell, last-open local project, or none?
3. Would a service worker create more deployment/cache risk than value at this stage?
4. Are file handlers or share-target hooks realistically useful for TrackDraw JSON project workflows?
5. Which browsers used by TrackDraw users would actually benefit from the first PWA slice?

## Recommendation

PWA is more attractive than wrapper work in the near term.

Reason:

- it stays web-first
- it can improve installability and venue-side ergonomics with much lower platform overhead
- it does not force TrackDraw into desktop or mobile distribution complexity too early

But it should still be treated as research first, and any first implementation should be intentionally narrow.

## References

- Next.js manifest metadata file convention: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- Next.js PWA guide: https://nextjs.org/docs/app/guides/progressive-web-apps
- MDN installability guide: https://developer.mozilla.org/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN manifest reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/index.html
