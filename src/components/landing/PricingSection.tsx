"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Info, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/Motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { appTooltipContentClassName } from "@/components/AppTooltip";

function InfoPopover({ info, label }: { info: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={`${label} details`}
        className="text-muted-foreground hover:text-foreground ml-1 inline-flex align-[-2px] transition-colors"
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        <Info className="size-3" />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={6}
        className={`w-64 p-3 text-xs leading-relaxed ${appTooltipContentClassName}`}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
      >
        {info}
      </PopoverContent>
    </Popover>
  );
}

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
      <span className="bg-muted-foreground/50 size-1 rounded-full" />
      {children}
    </p>
  );
}

function PlanFeatureList({
  plan,
  compareSections,
}: {
  plan: PlanKey;
  compareSections: Array<{ title: string; rows: CompareRow[] }>;
}) {
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
                      <InfoPopover info={row.info} label={row.label} />
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
  const t = useTranslations("landing");

  const compareSections: Array<{ title: string; rows: CompareRow[] }> = [
    {
      title: t("pricing.categories.design"),
      rows: [
        {
          label: t("pricing.features.fullDesigner"),
          guest: true,
          account: true,
        },
        {
          label: t("pricing.features.preview2d3d"),
          guest: true,
          account: true,
        },
        { label: t("pricing.features.export"), guest: true, account: true },
      ],
    },
    {
      title: t("pricing.categories.sharing"),
      rows: [
        {
          label: t("pricing.features.shareLinks"),
          guest: true,
          account: true,
          guestDetail: t("pricing.features.temporaryLinks"),
          accountDetail: t("pricing.features.publishedLinks"),
          info: t("pricing.features.shareLinksNote"),
        },
        {
          label: t("pricing.features.embeds"),
          guest: false,
          account: true,
          accountDetail: t("pricing.features.embedsDetail"),
        },
        {
          label: t("pricing.features.gallery"),
          guest: false,
          account: true,
        },
      ],
    },
    {
      title: t("pricing.categories.projects"),
      rows: [
        {
          label: t("pricing.features.cloudProjects"),
          guest: false,
          account: true,
          info: t("pricing.features.cloudProjectsDetail"),
        },
        {
          label: t("pricing.features.sections"),
          guest: false,
          account: true,
          info: t("pricing.features.sectionsDetail"),
        },
      ],
    },
    {
      title: t("pricing.categories.integration"),
      rows: [
        {
          label: t("pricing.features.api"),
          guest: false,
          account: true,
          accountDetail: t("pricing.features.apiDetail"),
        },
      ],
    },
  ];

  const planCards: PlanCard[] = [
    {
      key: "guest",
      eyebrow: t("pricing.guest.badge"),
      title: t("pricing.guest.name"),
      priceLabel: t("pricing.guest.price"),
      description: t("pricing.guest.description"),
      href: "/studio",
      ctaLabel: t("pricing.guest.cta"),
    },
    {
      key: "account",
      eyebrow: t("pricing.account.badge"),
      title: t("pricing.account.name"),
      priceLabel: t("pricing.account.price"),
      description: t("pricing.account.description"),
      href: "/login",
      ctaLabel: t("pricing.account.cta"),
      highlighted: true,
      delay: 0.07,
    },
  ];

  return (
    <section id="plans" className="border-border/40 border-t">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <Reveal className="mb-12">
          <Eyebrow>{t("pricing.sectionEyebrow")}</Eyebrow>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("pricing.sectionHeading")}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
            {t("pricing.sectionDescription")}
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
                  <PlanFeatureList
                    plan={plan.key}
                    compareSections={compareSections}
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
