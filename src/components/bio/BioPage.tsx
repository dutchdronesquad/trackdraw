"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BioConfig } from "@/lib/bio";
import { cn } from "@/lib/utils";

// Keep the package's bundled rendering runtime out of the OpenNext Worker.
const BioTrackViewer = dynamic(() => import("./BioTrackViewer"), {
  ssr: false,
  loading: BioTrackPlaceholder,
});

function BioTrackPlaceholder() {
  const t = useTranslations("landing.bio.track");
  return (
    <section aria-labelledby="bio-track-heading" className="mt-8">
      <h2
        id="bio-track-heading"
        className="mb-4 text-lg font-semibold tracking-tight"
      >
        {t("heading")}
      </h2>
      <div
        role="status"
        className="border-border bg-muted text-muted-foreground flex h-[322px] items-center justify-center rounded-lg border px-6 text-center text-sm sm:h-[362px]"
      >
        {t("loading")}
      </div>
      <p className="text-muted-foreground mt-3 text-xs leading-5">
        {t("hint2D")}
      </p>
    </section>
  );
}

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export default function BioPage({ config }: { config: BioConfig }) {
  const t = useTranslations("landing.bio");

  return (
    <main className="bg-background text-foreground min-h-svh px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-7 text-center">
          <Image
            src="/assets/brand/trackdraw-logo-color-lightbg.svg"
            alt=""
            width={1027}
            height={200}
            priority
            className="mx-auto h-auto w-48 dark:hidden"
          />
          <Image
            src="/assets/brand/trackdraw-logo-color-darkbg.svg"
            alt=""
            width={1027}
            height={200}
            priority
            className="mx-auto hidden h-auto w-48 dark:block"
          />
          <h1 className="sr-only">{t("name")}</h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xs text-sm leading-6">
            {t("tagline")}
          </p>
        </header>

        {config.links
          .filter((item) => item.primary)
          .map((item) => (
            <Link
              key={item.id}
              href={item.href}
              prefetch={false}
              className={cn(
                "bg-primary text-primary-foreground hover:bg-primary/90 flex min-h-16 items-center justify-between gap-4 rounded-xl px-5 py-4",
                focus
              )}
            >
              <span>
                <span className="block text-base font-semibold">
                  {t(`items.${item.id}.label`)}
                </span>
                <span className="mt-1 block text-sm opacity-85">
                  {t(`items.${item.id}.description`)}
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
            </Link>
          ))}

        <BioTrackViewer />

        {config.featured.length > 0 && (
          <section
            aria-label={t("featured")}
            className="border-border mt-7 border-t"
          >
            {config.featured.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className={cn(
                  "flex min-h-14 items-center justify-between gap-4 py-4 text-sm",
                  focus
                )}
              >
                {t(`items.${item.id}.label`)}
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
              </a>
            ))}
          </section>
        )}

        {config.links.some((item) => !item.primary) && (
          <nav aria-label={t("explore")} className="mt-7">
            <ul className="divide-border border-border divide-y border-y">
              {config.links
                .filter((item) => !item.primary)
                .map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        "hover:text-brand-primary flex min-h-16 items-center justify-between gap-4 py-4",
                        focus
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block text-base font-semibold">
                          {t(`items.${item.id}.label`)}
                        </span>
                        <span className="text-muted-foreground mt-1 block text-sm leading-5">
                          {t(`items.${item.id}.description`)}
                        </span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-5 shrink-0"
                      />
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        )}

        {config.socials.length > 0 && (
          <nav aria-label={t("socials")} className="border-border mt-5 pt-1">
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1">
              {config.socials.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 text-sm",
                      focus
                    )}
                  >
                    {t(`items.${item.id}.label`)}
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <footer className="mt-5 text-center">
          <Link
            href="/"
            prefetch={false}
            className={cn(
              "text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-xs underline underline-offset-4",
              focus
            )}
          >
            {t("home")}
          </Link>
        </footer>
      </div>
    </main>
  );
}
