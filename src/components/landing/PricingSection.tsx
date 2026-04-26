import Link from "next/link";
import { ArrowRight, Check, Info, Minus } from "lucide-react";
import { Reveal } from "@/components/landing/Motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PlanKey = "guest" | "account";

type PlanCard = {
  key: PlanKey;
  eyebrow: string;
  title: string;
  priceLabel: string;
  description: string;
  href: string;
  ctaLabel: string;
  highlighted?: boolean;
  delay?: number;
};

type CompareRow = {
  label: string;
  guest: boolean;
  account: boolean;
  guestDetail?: string;
  accountDetail?: string;
  info?: string;
};

const compareSections: Array<{ title: string; rows: CompareRow[] }> = [
  {
    title: "Design",
    rows: [
      { label: "Full track designer", guest: true, account: true },
      { label: "2D & 3D preview", guest: true, account: true },
      { label: "PDF, SVG, PNG & JSON export", guest: true, account: true },
    ],
  },
  {
    title: "Sharing",
    rows: [
      {
        label: "Share links",
        guest: true,
        account: true,
        guestDetail: "Temporary links",
        accountDetail: "Published until revoked",
        info: "Guest share links are temporary. Account-published links stay live until revoked and can also be embedded.",
      },
      {
        label: "Embeds",
        guest: false,
        account: true,
      },
      {
        label: "Gallery publishing",
        guest: false,
        account: true,
      },
    ],
  },
  {
    title: "Projects",
    rows: [
      { label: "Cloud-synced projects", guest: false, account: true },
      { label: "Open projects on any device", guest: false, account: true },
    ],
  },
];

const planCards: PlanCard[] = [
  {
    key: "guest",
    eyebrow: "No sign-up",
    title: "Guest",
    priceLabel: "Free",
    description:
      "Best for quick drafts, one-off temporary review links, and local export without creating an account.",
    href: "/studio",
    ctaLabel: "Open Studio",
  },
  {
    key: "account",
    eyebrow: "With account",
    title: "Account",
    priceLabel: "Free",
    description:
      "Best for durable published links, embeds, gallery publishing, and reopening projects on another device.",
    href: "/login",
    ctaLabel: "Create account",
    highlighted: true,
    delay: 0.07,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
      <span className="bg-muted-foreground/50 size-1 rounded-full" />
      {children}
    </p>
  );
}

function PlanFeatureList({ plan }: { plan: PlanKey }) {
  return (
    <div className="mt-6 space-y-4">
      {compareSections.map((section) => (
        <div key={section.title}>
          <p className="text-muted-foreground/70 text-[10px] font-semibold tracking-[0.16em] uppercase">
            {section.title}
          </p>
          <ul className="mt-2 space-y-2.5">
            {section.rows.map((row) => {
              const enabled = row[plan];
              const detail =
                plan === "guest" ? row.guestDetail : row.accountDetail;

              return (
                <li
                  key={row.label}
                  className="flex items-start gap-2.5 text-sm"
                >
                  {enabled ? (
                    <Check className="text-brand-primary mt-0.5 size-3.5 shrink-0" />
                  ) : (
                    <Minus className="text-muted-foreground/40 mt-0.5 size-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        enabled ? "text-foreground" : "text-muted-foreground/40"
                      }
                    >
                      {row.label}
                    </span>
                    {row.info ? (
                      <Tooltip>
                        <TooltipTrigger
                          type="button"
                          aria-label={`${row.label} details`}
                          className="text-muted-foreground hover:text-foreground ml-1 inline-flex align-[-2px] transition-colors"
                        >
                          <Info className="size-3" />
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {row.info}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {detail ? (
                      <span
                        className={
                          enabled
                            ? "text-muted-foreground mt-0.5 block text-[11px] leading-snug"
                            : "text-muted-foreground/35 mt-0.5 block text-[11px] leading-snug"
                        }
                      >
                        {detail}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="plans" className="border-border/40 border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <Reveal className="mb-12">
          <Eyebrow>Plans</Eyebrow>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Start now, sign up when you need more.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
            Both current options are free. Guest mode keeps the core editor open
            without setup; accounts add durable publishing, embeds, gallery
            listing, and project continuity across devices.
          </p>
        </Reveal>

        <div className="-mx-6 scroll-px-6 overflow-x-auto px-6 pb-2 sm:mx-auto sm:max-w-2xl sm:scroll-px-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <div className="flex w-max min-w-full snap-x snap-mandatory gap-4 sm:grid sm:w-auto sm:min-w-0 sm:grid-cols-2">
            {planCards.map((plan) => (
              <Reveal key={plan.key} delay={plan.delay}>
                <div
                  className={
                    plan.highlighted
                      ? "border-brand-primary/25 bg-brand-primary/5 from-brand-primary/8 relative mr-6 flex h-full max-w-78 min-w-74 snap-start flex-col overflow-hidden rounded-2xl border bg-linear-to-br to-transparent p-6 sm:mr-0 sm:max-w-none sm:min-w-0"
                      : "border-border/50 bg-card/20 flex h-full max-w-78 min-w-74 snap-start flex-col rounded-2xl border p-6 sm:max-w-none sm:min-w-0"
                  }
                >
                  {plan.highlighted ? (
                    <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[#1E93DB] opacity-[0.12] blur-2xl" />
                  ) : null}
                  <p
                    className={
                      plan.highlighted
                        ? "text-brand-primary text-[11px] font-semibold tracking-[0.2em] uppercase"
                        : "text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase"
                    }
                  >
                    {plan.eyebrow}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <p className="text-xl font-semibold">{plan.title}</p>
                    <p className="text-muted-foreground pb-0.5 text-sm">
                      {plan.priceLabel}
                    </p>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {plan.description}
                  </p>
                  <Link
                    href={plan.href}
                    className={
                      plan.highlighted
                        ? "mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#1E93DB] px-5 text-sm font-medium text-white shadow-md shadow-[#1E93DB]/25 transition hover:brightness-110"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-full border px-5 text-sm transition"
                    }
                  >
                    {plan.ctaLabel} <ArrowRight className="size-3.5" />
                  </Link>
                  <PlanFeatureList plan={plan.key} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
