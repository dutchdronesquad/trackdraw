# Notifications And Email Strategy

## Summary

TrackDraw currently sends email only for transactional auth flows (magic link, verification, email change) via Plunk (pattern in `src/lib/server/auth-email.ts`). There is no marketing email, no persistent in-app notification system, and no notification preference model on the user record. In-app feedback today is limited to Sonner toasts, which are ephemeral and don't represent a real notification channel.

This is not an implementation plan. It is product direction so future work doesn't conflate two channels that have different audiences, different legal requirements, and different build order.

## Top-Level Checklist

- [ ] Keep transactional auth email on its existing Plunk pattern; don't touch it.
- [ ] Treat marketing/broadcast email and in-app/transactional notifications as two separate concerns, not one notification system.
- [ ] Build marketing email first: consent/opt-in model, unsubscribe handling, Plunk broadcast sending.
- [ ] Do not build the in-app notification table/UI until marketing email is in place and this direction is revisited.
- [ ] When in-app notifications are eventually built, route all event-driven/transactional notifications through them, not through email.

## Two Channels, Two Purposes

**Marketing / broadcast email** (via Plunk):

- Audience: all users (or segments) who opted in.
- Triggers: business decisions, not product events — e.g. announcing a future paid tier, offering existing free users a discount code as thanks for early usage, product announcements.
- Legal: requires explicit consent/opt-in and a working unsubscribe link under GDPR. This is distinct from the existing transactional auth email, which doesn't need consent.
- Status: **next to build.**

**Event-driven / transactional notifications** (in-app, not email):

- Audience: a single user, triggered by something that happened to their account or project — e.g. "someone shared a project with you."
- Channel: in-app only. These should not go out as email.
- Requires: a notification table, a UI surface (e.g. bell icon + list), and read/unread state — none of which exist yet.
- Status: **deferred.** Until this is built, event-driven notifications have no delivery channel at all. That gap is accepted for now; marketing email ships first.

## Why Not One System

Marketing email and in-app transactional notifications have different consent models, different audiences (broadcast vs. per-user), and different urgency. Building one generic "notification" abstraction that tries to serve both up front risks a data model that fits neither well. Revisit a shared event→channel abstraction only once both sides have concrete shape.

## Expected Volume

Marketing email is expected to be sporadic, not a regular campaign cadence — a handful of sends a year (e.g. a paid-tier announcement), not a newsletter. This should shape scope: lean toward whatever opt-in/sending mechanism is simplest to build and GDPR-correct, rather than investing in segmentation, campaign scheduling, or analytics tooling that sporadic use wouldn't justify.

## Open Product Questions

- What does the opt-in flow look like — checkbox at signup, a preferences page, or both? Not yet decided; pick whatever fits TrackDraw best and satisfies GDPR, evaluate at implementation time rather than prescribing it here.
- Where does unsubscribe state live (user table field vs. separate preferences table)?
- What's the first marketing email use case in practice? Not yet decided — no concrete first send is planned.
- When in-app notifications are eventually built, does read state sync across devices, and does it need its own settings page?

## Current Recommendation

Build marketing email next: add a consent/opt-in field, unsubscribe handling, and broadcast-sending on top of the existing Plunk integration. Given the expected low/sporadic volume, favor the simplest GDPR-correct opt-in mechanism over building campaign tooling. Do not start the in-app notification table or UI yet. Keep transactional auth email untouched on its current pattern.
