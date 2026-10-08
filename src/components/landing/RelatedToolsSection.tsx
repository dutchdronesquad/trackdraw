"use client";

import { ArrowUpRight, CodeXml, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/landing/Motion";

export function RelatedToolsSection() {
  const t = useTranslations("landing.relatedTools");

  return (
    <section
      id="related-tools"
      aria-labelledby="related-tools-heading"
      className="border-border/40 bg-muted/[0.035] border-t"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
        <Reveal className="mb-10">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="related-tools-heading"
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
            <Palette aria-hidden="true" className="text-brand-primary size-6" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {t("artwork.title")}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t("artwork.description")}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              <a
                href="https://designer.trackdraw.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:text-brand-primary/85 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {t("artwork.action")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
              <a
                href="https://github.com/dutchdronesquad/track-assets"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                {t("github")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
          </Reveal>

          <Reveal className="border-border/50 border-t pt-6">
            <CodeXml
              aria-hidden="true"
              className="text-brand-secondary size-6"
            />
            <h3 className="mt-4 text-xl font-semibold tracking-tight">
              {t("viewer.title")}
            </h3>
            <p className="text-muted-foreground mt-3 text-sm leading-7">
              {t("viewer.description")}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              <a
                href="https://viewer.trackdraw.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-secondary hover:text-brand-secondary/85 inline-flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {t("viewer.action")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
              <a
                href="https://github.com/dutchdronesquad/track-viewer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                {t("github")}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
