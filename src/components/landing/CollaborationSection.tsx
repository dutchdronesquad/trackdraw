"use client";

import { ArrowRight, Bot, Users } from "lucide-react";
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
        <Reveal className="mb-10">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="collaboration-heading"
            className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("heading")}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
            {t("description")}
          </p>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-2 md:gap-12">
          <Reveal className="border-border/50 border-t pt-6">
            <Users aria-hidden="true" className="text-brand-primary size-6" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {t("teams.title")}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t("teams.description")}
            </p>
            <Link
              href="/studio?dialog=account&section=teams"
              prefetch={false}
              className="text-brand-primary hover:text-brand-primary/85 mt-5 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {t("teams.action")}{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Reveal>
          <Reveal className="border-border/50 border-t pt-6">
            <Bot aria-hidden="true" className="text-brand-secondary size-6" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {t("assistant.title")}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t("assistant.description")}
            </p>
            <blockquote className="border-brand-secondary/40 mt-4 border-l-2 pl-4 text-sm leading-7 italic">
              {t("assistant.example")}
            </blockquote>
            <p className="text-muted-foreground mt-3 text-xs leading-6">
              {t("assistant.note")}
            </p>
            <a
              href="https://github.com/dutchdronesquad/trackdraw/blob/main/docs/mcp.md"
              className="text-brand-secondary hover:text-brand-secondary/85 mt-5 inline-flex items-center gap-2 text-sm font-medium transition-colors"
            >
              {t("assistant.action")}{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
