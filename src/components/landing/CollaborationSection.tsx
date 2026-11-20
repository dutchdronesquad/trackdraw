"use client";

import { ArrowRight, Bot, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/Motion";

export function CollaborationSection() {
  const t = useTranslations("landing.collaboration");

  return (
    <section
      aria-labelledby="collaboration-heading"
      className="border-border/40 border-t"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Reveal className="order-first lg:order-last">
            <p className="text-brand-primary inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
              <Users aria-hidden="true" className="size-3.5" />
              {t("eyebrow")}
            </p>
            <h2
              id="collaboration-heading"
              className="mt-4 max-w-sm text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"
            >
              {t("heading")}
            </h2>
            <p className="text-muted-foreground mt-4 text-sm leading-7">
              {t("teams.description")}
            </p>
            <ul className="mt-5 space-y-3">
              {(t.raw("teams.bullets") as string[]).map((benefit) => (
                <li
                  key={benefit}
                  className="text-muted-foreground flex items-start gap-2.5 text-sm leading-6"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-brand-primary mt-1 size-3.5 shrink-0"
                  />
                  {benefit}
                </li>
              ))}
            </ul>
            <Link
              href="/studio?dialog=account&section=teams"
              prefetch={false}
              className="bg-brand-primary mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-white transition hover:brightness-110"
            >
              {t("teams.action")}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </Reveal>
          <figure className="order-last mx-auto w-full max-w-sm min-w-0 lg:order-first lg:max-w-none">
            <Reveal className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
              <picture>
                <source
                  media="(min-width: 1024px)"
                  srcSet="/assets/screenshots/team-project-library-light.jpg"
                />
                {/* oxlint-disable-next-line nextjs/no-img-element */}
                <img
                  src="/assets/screenshots/team-project-library-mobile-light.jpg"
                  alt={t("teams.screenshotAlt")}
                  className="block h-auto w-full"
                  loading="lazy"
                />
              </picture>
            </Reveal>
            <Reveal>
              <figcaption className="text-muted-foreground mt-4 text-center text-xs leading-5">
                {t("teams.screenshotCaption")}
              </figcaption>
            </Reveal>
          </figure>
        </div>

        <Reveal className="border-border/50 mt-12 grid gap-6 border-t pt-8 sm:mt-16 md:grid-cols-[0.85fr_1.15fr] md:gap-12 lg:gap-16">
          <div>
            <div className="flex items-center gap-2.5">
              <Bot
                aria-hidden="true"
                className="text-brand-secondary size-5 shrink-0"
              />
              <h3 className="text-base font-semibold tracking-tight">
                {t("assistant.title")}
              </h3>
            </div>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t("assistant.description")}
            </p>
            <a
              href="https://github.com/dutchdronesquad/trackdraw/blob/main/docs/mcp.md"
              className="text-brand-secondary hover:text-brand-secondary/85 mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {t("assistant.action")}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </a>
          </div>
          <div className="self-center">
            <blockquote className="border-brand-secondary/40 border-l-2 pl-4 text-sm leading-7 italic">
              {t("assistant.example")}
            </blockquote>
            <p className="text-muted-foreground mt-3 text-xs leading-6">
              {t("assistant.note")}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
