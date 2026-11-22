"use client";

import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";

const contactEmail = "info@trackdraw.app";

export default function ContactPage() {
  const t = useTranslations("landing.contact");

  return (
    <div className="bg-background text-foreground min-h-screen">
      <PublicSiteHeader currentPage="contact" />
      <main>
        <section className="border-border/40 border-b">
          <div className="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
            <p className="text-brand-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
              {t("description")}
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
          <section>
            <h2 className="text-2xl font-semibold tracking-normal">
              {t("emailTitle")}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-7">
              {t("emailDescription")}
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 rounded-full bg-[#1E93DB] text-white shadow-md shadow-[#1E93DB]/20 hover:bg-[#1E93DB]/90"
            >
              <a href={`mailto:${contactEmail}`}>
                <Mail aria-hidden="true" />
                {t("emailAction")}
              </a>
            </Button>
            <p className="text-muted-foreground mt-3 text-sm">{contactEmail}</p>
          </section>

          <div className="border-border/50 mt-12 grid gap-10 border-t pt-10 sm:grid-cols-2 sm:gap-12">
            <section>
              <h2 className="text-xl font-semibold tracking-normal">
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
            <section>
              <h2 className="text-xl font-semibold tracking-normal">
                {t("faqTitle")}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {t("faqDescription")}
              </p>
              <Link
                href="/#faq"
                prefetch={false}
                className="text-brand-primary mt-4 inline-flex min-h-11 items-center text-sm font-medium hover:underline"
              >
                {t("faqAction")}
              </Link>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
