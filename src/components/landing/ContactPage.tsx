"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  HelpCircle,
  Lightbulb,
  Mail,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";

const contactEmail = "info@trackdraw.app";

export default function ContactPage() {
  const t = useTranslations("landing.contact");

  return (
    <div className="bg-background text-foreground min-h-screen overflow-x-clip">
      <PublicSiteHeader currentPage="contact" />
      <main className="relative">
        <section className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 left-0 h-150 w-150 rounded-full bg-[#1E93DB] opacity-[0.06] blur-[120px]"
          />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-14 pb-10 sm:pt-20 sm:pb-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
                {t("eyebrow")}
              </p>
              <h1 className="mt-4 text-[clamp(34px,9vw,56px)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:leading-[1.08]">
                <span className="block">{t("headingLine1")}</span>
                <span className="from-brand-primary mt-1.5 block bg-linear-to-r to-sky-300 bg-clip-text pb-1 leading-[1.12] text-transparent sm:mt-0">
                  {t("headingLine2")}
                </span>
              </h1>
              <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-[15px] leading-7">
                {t("description")}
              </p>
            </div>
          </div>
        </section>

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-14 sm:pb-20">
          <section className="border-brand-primary/20 from-brand-primary/8 via-card to-card rounded-3xl border bg-linear-to-br p-6 shadow-[0_12px_48px_-24px_rgba(30,147,219,0.3)] sm:p-10">
            <div className="bg-brand-primary/12 text-brand-primary mb-6 flex size-12 items-center justify-center rounded-2xl">
              <Mail aria-hidden="true" className="size-6" />
            </div>
            <div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
              <div className="max-w-md">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t("emailTitle")}
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-7">
                  {t("emailDescription")}
                </p>
              </div>
              <div className="shrink-0 sm:text-center">
                <Button
                  asChild
                  size="lg"
                  className="h-11 rounded-full bg-[#1E93DB] px-6 text-white shadow-md shadow-[#1E93DB]/20 hover:bg-[#1E93DB]/90"
                >
                  <a href={`mailto:${contactEmail}`}>
                    {t("emailAction")} <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
                <p className="text-muted-foreground mt-3 text-xs">
                  {contactEmail}
                </p>
              </div>
            </div>
          </section>

          <div className="divide-border/50 mt-10 grid divide-y sm:mt-12 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <section className="pb-8 sm:pr-9 sm:pb-0">
              <div className="text-brand-primary bg-brand-primary/8 mb-4 flex size-10 items-center justify-center rounded-xl">
                <Lightbulb aria-hidden="true" className="size-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {t("feedbackTitle")}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {t("feedbackDescription")}
              </p>
              <a
                href="https://github.com/dutchdronesquad/trackdraw/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline"
              >
                {t("feedbackAction")}{" "}
                <ArrowUpRight aria-hidden="true" className="size-4" />
              </a>
            </section>
            <section className="pt-8 sm:pt-0 sm:pl-9">
              <div className="text-brand-primary bg-brand-primary/8 mb-4 flex size-10 items-center justify-center rounded-xl">
                <HelpCircle aria-hidden="true" className="size-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {t("faqTitle")}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {t("faqDescription")}
              </p>
              <Link
                href="/#faq"
                prefetch={false}
                className="text-brand-primary mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium hover:underline"
              >
                {t("faqAction")}{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
