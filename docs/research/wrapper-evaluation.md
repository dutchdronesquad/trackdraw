# Wrapper Evaluation

This document evaluates whether TrackDraw should gain a desktop wrapper through Electron or a mobile wrapper through Capacitor.

Status: research only. This is not a build commitment.

## Question

Would a wrapper materially improve TrackDraw beyond the current web app, and if so, which platform is the better first candidate?

## Current Product Reality

TrackDraw today is:

- a Next.js App Router app
- local-first for active editing
- already usable on mobile in the browser
- dependent on a real runtime for publish/read share flows through `/share/[token]`
- backed by Cloudflare Workers and D1 for published shares

That last point matters. A wrapper would not replace the hosted app by itself, because the published-share system already depends on a networked backend.

## What A Wrapper Could Improve

Potential benefits worth investigating:

- more dependable local project storage than browser-only storage
- clearer file open/save flows for JSON projects
- better native share-sheet, file-picker, and import/export integration
- more app-like launch behavior for frequent venue-side use
- stronger offline behavior for editing and viewing local projects

## What A Wrapper Does Not Automatically Solve

A wrapper does not automatically give TrackDraw:

- offline share publishing
- a simpler backend model
- less deployment complexity overall
- better editor UX by itself

In practice, a wrapper adds another delivery surface while the Cloudflare-hosted web app still remains necessary for public sharing.

## Electron Assessment

### Where Electron Fits

Electron is strongest when TrackDraw needs to behave more like a serious desktop tool than a browser tab.

Most promising gains:

- native file open/save dialogs for JSON projects
- a more durable local project directory instead of relying mainly on browser persistence
- clearer recovery and backup strategies for local-first work
- better support for repeat desktop use by race directors and organizers

### Why Electron Is Technically Plausible

Electron's `BrowserWindow` model is straightforward for wrapping a React/Next front-end, and Electron is designed around a separate main-process/runtime boundary rather than forcing the whole app into one browser context.

Relevant references:

- Electron `BrowserWindow`: https://www.electronjs.org/docs/api/browser-window

### Main Technical Caveats

- The current app is built around Next.js plus Cloudflare/OpenNext for hosted runtime behavior.
- Published share creation uses a server route at [`src/app/api/shares/route.ts`](../../src/app/api/shares/route.ts).
- D1 access is currently bound through Cloudflare context in [`src/lib/server/db.ts`](../../src/lib/server/db.ts).

This means an Electron app has two realistic paths:

1. Hosted-web wrapper
   Load the deployed TrackDraw app inside Electron and add desktop-native file/project integrations around it.

2. Separate desktop distribution
   Package a desktop-specific runtime and replace or bypass Cloudflare-specific server features locally.

The first path is much lower risk. The second path is a materially different platform effort.

### Electron Recommendation

If wrapper work ever starts, Electron is the better first candidate.

Reason:

- TrackDraw is already credible on mobile web
- desktop gets the clearest net-new value from filesystem and local-project improvements
- desktop distribution can be treated as an enhancement to the existing web product rather than a replacement for it

## Capacitor Assessment

### Where Capacitor Fits

Capacitor is strongest when the product already works well as a web app and mainly needs native mobile capabilities around it.

Most promising gains:

- native file access for import/export
- native share-sheet integration
- better installability and app-icon launch behavior
- optional offline handling with native storage and network awareness

Relevant references:

- Capacitor overview: https://capacitorjs.com/docs/next

### Main Technical Caveats

- TrackDraw already treats mobile browser support as real scope, not as an afterthought.
- The product's biggest current mobile questions are workflow and usability, not raw app-shell availability.
- Capacitor would add iOS and Android packaging, signing, release, and support overhead.
- A native shell would not remove the need for the hosted backend behind published shares.

### Capacitor Recommendation

Capacitor is not the best first wrapper candidate.

It could become attractive later if mobile-native file handling, offline behavior, or venue-side launch experience become recurring pain points that the PWA/web path cannot solve cleanly.

## Recommended Position For TrackDraw

Short version:

- do not start wrapper implementation now
- keep the web app as the primary product surface
- treat wrappers as a research track, not a roadmap commitment
- if a wrapper is ever explored further, start with Electron rather than Capacitor

## Suggested Research Questions

Before any build work, answer these:

1. What user pain is severe enough that the web app cannot solve it well enough?
2. Is the main opportunity desktop file/project handling or mobile venue-side usage?
3. Would a wrapper load the hosted app, or would it need its own local runtime strategy?
4. How should local projects be stored outside browser persistence?
5. Which platform-specific integrations are actually required: file open/save, share sheet, offline cache, deep links, or something else?
6. What new release and support burden comes with desktop installers or mobile app-store delivery?

## Suggested Proof Of Concept Boundary

If this ever becomes active work, keep the first proof of concept narrow:

- Electron only
- hosted-web wrapper first
- native open/save for JSON projects
- native local project directory experiment
- no attempt to replace Cloudflare-backed publish/read flows

That would answer the core product question without forcing a second platform architecture too early.

## Conclusion

TrackDraw does not need a wrapper to justify v1 or near-term roadmap work.

A wrapper may become valuable later, but only if it clearly improves local project handling, native file workflows, or venue-side ergonomics in a way the web product cannot match cleanly.

Today, the highest-confidence position is:

- keep web first
- treat wrappers as a research topic
- prefer Electron over Capacitor if the research turns into a proof of concept
