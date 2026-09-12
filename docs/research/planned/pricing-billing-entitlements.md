# Pricing, Billing, And Entitlements

## Summary

TrackDraw should stay free to start and useful without an account. If hosting, storage, published embeds, or support costs eventually require revenue, the first paid option should feel like a practical way to back TrackDraw and unlock heavier account-backed features, not like a paywall around the core editor.

This is not an implementation plan for immediate payment work. It is a product and architecture direction so the current plans UI, account model, share lifecycle, and future feature gates do not paint the product into a corner.

## Top-Level Checklist

- [ ] Keep the current free guest and free account model intact.
- [ ] Keep the landing pricing/plans UI data-driven so a third plan can be added later.
- [ ] Define paid-feature boundaries around costly account-backed features, not core editing.
- [ ] Add a central entitlement model before adding any payment provider.
- [ ] Choose a payment provider only when there is a real business/legal setup.
- [ ] Integrate hosted checkout and hosted billing portal instead of building custom billing UI.
- [ ] Use billing webhooks to update TrackDraw entitlements.

## Product Direction

Current plans:

- `Guest`: free, no sign-up, local-first editing, import/export, temporary share links.
- `Account`: free, account-backed project continuity, durable published links, embeds, gallery publishing.

Possible future plan:

- A single paid option with a "support TrackDraw and get more capacity" feeling.
- Avoid naming it `Supporter` for now, because that can sound donation-only and vague.
- Possible names to evaluate later: `TrackDraw Plus`, `TrackDraw Pro`, `Builder`, `Club`, or `Organizer`.
- The plan should feel useful for serious organizers, clubs, and repeat race directors, while still making free TrackDraw feel complete for normal design work.

## What Should Stay Free

These should remain free where possible:

- Core 2D editor
- 3D preview
- Local browser projects
- JSON import/export
- PDF, PNG, SVG export
- Temporary share links
- Basic account creation
- A reasonable amount of account-backed project sync
- A reasonable amount of durable publishing while the platform is small

The product should avoid making the editor feel like a trial. The paid option should mostly increase durability, capacity, presentation, or team/club workflow.

## Candidate Paid Value

Good paid candidates are features that create ongoing hosting, storage, bandwidth, or support cost:

- More account-backed projects
- More active published shares
- More active embeds
- Higher embed/gallery usage limits
- Published share version history and rollback
- Custom branding or cleaner white-label embeds
- Club/team workspace
- Shared venue or club inventory records
- Advanced race-day document packs
- Priority support or early access to larger workflow features

Poor first paid candidates:

- Basic editing tools
- Basic import/export
- Basic 2D/3D preview
- Simple temporary sharing
- Anything that makes a first-time user feel blocked before understanding the product

## Technical Model

TrackDraw should separate billing state from product access.

The app should not ask Stripe, Paddle, Lemon Squeezy, or another provider directly throughout the product code. Instead, TrackDraw should have its own entitlement layer.

Example concepts:

```ts
type PlanCode = "free" | "plus";

type Entitlements = {
  maxAccountProjects: number;
  maxActivePublishedShares: number;
  maxActiveEmbeds: number;
  publishedShareVersionHistory: boolean;
  customEmbedBranding: boolean;
  clubWorkspace: boolean;
};
```

Feature code should ask product questions:

```ts
canCreateProject(userId);
canPublishShare(userId);
canUsePublishedEmbed(userId);
canUseCustomEmbedBranding(userId);
getPlanLimits(userId);
```

It should not ask billing-provider questions:

```ts
// Avoid this style in product code:
isStripeSubscriptionActive(userId);
isPaddleCustomerPaid(userId);
```

## Suggested Database Shape

Exact schema can wait, but the model should likely include:

- `billing_customers`
  - `user_id`
  - `provider`
  - `provider_customer_id`
  - timestamps

- `subscriptions`
  - `user_id`
  - `provider`
  - `provider_subscription_id`
  - `plan_code`
  - `status`
  - `current_period_end`
  - `cancel_at_period_end`
  - timestamps

- `account_entitlements`
  - `user_id`
  - `plan_code`
  - explicit limits or a denormalized entitlement JSON
  - `source`
  - timestamps

The entitlement table can be derived from subscription state, but storing the resolved entitlement snapshot makes feature checks simple and provider-independent.

## Payment Provider Direction

When payment becomes real, prefer hosted checkout and hosted billing management.

Options:

- **Merchant of Record provider** such as Paddle or Lemon Squeezy:
  - Better fit if TrackDraw does not yet have a full business, tax, VAT, refund, and chargeback process.
  - Provider handles more tax/compliance burden.
  - TrackDraw consumes webhooks and updates entitlements.

- **Stripe Billing**:
  - Strong developer platform.
  - Useful if the business/accounting/tax setup is ready.
  - More direct responsibility for merchant, tax, and operational details unless paired with additional services.

Current product and architecture decision:

- **Use Stripe Billing** as the selected provider for implementation planning.
- Evaluate the integration against hosted checkout, billing portal support, webhook reliability, subscription lifecycle handling, and maintenance effort.
- Keep the TrackDraw entitlement layer provider-neutral so switching provider later remains possible.

Launch assumptions to validate:

- Confirm provider onboarding eligibility and the intended business registration before enabling payments.
- Validate the applicable tax, VAT, invoicing, refund, and accounting responsibilities for the intended customer markets with qualified advice and current official guidance.
- Record the validated operational setup separately. Provider selection does not establish launch readiness, eligibility for a tax scheme, or exemptions from registration and filing obligations.

## Billing Flow

Preferred future flow:

1. User opens Account or Plans page.
2. User selects the paid plan.
3. TrackDraw creates a hosted checkout session with the provider.
4. Provider handles payment and confirmation; invoice and tax configuration follow the validated operating setup.
5. Provider sends webhook to TrackDraw.
6. TrackDraw verifies webhook signature.
7. TrackDraw stores subscription state.
8. TrackDraw updates resolved entitlements.
9. Product features check entitlements, not provider state.

Billing management:

1. User clicks "Manage billing".
2. TrackDraw creates a hosted billing portal session.
3. Provider handles payment method changes, invoices, cancellation, and plan changes.
4. Provider sends webhooks for changes.
5. TrackDraw updates subscription state and entitlements.

## Implementation Phases

### Phase 1: Product Preparation

Start state:

- Current plans are free.
- Pricing UI is informational.
- No payment provider exists.

Done state:

- Plans UI is data-driven.
- Product copy does not promise that all current account-backed features will be free forever.
- Roadmap keeps payment as future product infrastructure, not current scope.

### Phase 2: Entitlement Foundation

Start state:

- Account users have feature access based mostly on authentication.

Done state:

- A central entitlement helper exists.
- Account-backed limits can be checked consistently from UI and API routes.
- Tests cover entitlement behavior without involving a billing provider.

### Phase 3: Provider Evaluation

Start state:

- TrackDraw has no payment provider.
- Business/legal setup is still undecided.

Done state:

- Provider is selected based on Merchant of Record need, supported countries, fees, subscription support, webhook quality, and billing portal quality.
- Plan naming and price are decided.
- Tax/accounting responsibilities are understood before launch.

**Current status: provider selected; launch validation remains open.** Stripe Billing is the chosen provider. The intended business registration and tax/accounting setup are planning assumptions to validate before payments go live; this provider decision does not complete the launch criteria above.

### Phase 4: Checkout And Webhooks

Start state:

- Entitlements exist but are assigned manually or statically.

Done state:

- Hosted checkout can create a subscription.
- Webhooks update subscription state.
- Entitlements update from subscription state.
- Billing portal lets users manage payment and cancellation.
- Failed payment and cancellation states degrade access predictably.

### Phase 5: Paid Plan Launch

Start state:

- Payment integration is technically working.

Done state:

- One paid plan is available publicly.
- Paid features are limited to capacity, durability, branding, club/workspace, or advanced workflow value.
- Core editing remains free and credible.
- Support, refund, and cancellation language exists.

## Dependency: Usage Metrics

Free plan limits should not be set without real usage data. Before finalizing limits, run plan limit simulations against the existing user base to understand what percentage of users would be affected by a given threshold.

See [admin-metrics-analytics.md](../implemented/admin-metrics-analytics.md) for the metrics research and implementation approach.

## Community And Clubs

TrackDraw is already being linked to organically by at least one club on their website. This is a signal worth building on.

Future directions to consider:

- A community showcase or featured tracks section on the homepage
- A clubs page listing organizations that use TrackDraw, with their published tracks
- Club embeds on external websites as a paid capacity feature

These are not immediate priorities but should inform how the paid plan is positioned. A club or race director audience is a natural fit for a paid plan — they have recurring events, need durable links, and benefit from presenting tracks professionally.

## Open Product Questions

- What should the paid plan be called?
- Should the first paid plan target individual race directors, clubs, or both?
- Which feature should be the first clearly paid-only value?
- What free limits feel generous but sustainable?
- Should early users be grandfathered into higher limits?
- Should gallery publishing stay free if embeds become a paid-capacity feature later?
- Should paid plans include custom embed branding, or is that too business-focused for the first paid option?

## Current Recommendation

Do not build payments yet.

Do build with the assumption that payment may exist later:

- Keep the plans UI data-driven.
- Keep product copy flexible.
- Avoid scattering hardcoded plan checks through UI and server code.
- Introduce entitlements before billing.
- Use hosted checkout and a hosted billing portal when payment becomes real.
- Prefer a single paid plan that feels like backing and growing TrackDraw, while giving serious users more durable capacity and presentation options.
