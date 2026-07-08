import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";
import LanguageProvider from "@/i18n/LanguageProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("terms.metaTitle"),
    description: t("terms.metaDescription"),
    alternates: {
      canonical: "/terms",
    },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  const sections = [
    {
      title: t("terms.s1Title"),
      body: [t("terms.s1Body")],
    },
    {
      title: t("terms.s2Title"),
      body: [t("terms.s2Body")],
    },
    {
      title: t("terms.s3Title"),
      body: [t("terms.s3Body")],
    },
    {
      title: t("terms.s4Title"),
      body: [t("terms.s4Body1"), t("terms.s4Body2")],
    },
    {
      title: t("terms.s5Title"),
      body: [t("terms.s5Body")],
    },
    {
      title: t("terms.s6Title"),
      body: [t("terms.s6Body")],
    },
    {
      title: t("terms.s7Title"),
      body: [t("terms.s7Body")],
    },
    {
      title: t("terms.s8Title"),
      body: [t("terms.s8Body")],
    },
    {
      title: t("terms.s9Title"),
      body: [t("terms.s9Body")],
    },
  ];

  return (
    <LanguageProvider namespaces={["common", "landing"]}>
      <div className="bg-background text-foreground min-h-screen">
        <PublicSiteHeader currentPage="legal" />

        <main>
          <section className="border-border/40 border-b">
            <div className="mx-auto w-full max-w-4xl px-6 py-14 sm:py-20">
              <p className="text-brand-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
                {t("terms.breadcrumbLegal")}
              </p>
              <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
                {t("terms.pageTitle")}
              </h1>
              <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
                {t("terms.effectiveDate")}
              </p>
            </div>
          </section>

          <section>
            <div className="mx-auto w-full max-w-4xl px-6 py-12 sm:py-16">
              <div className="space-y-10">
                {sections.map((section) => (
                  <section key={section.title}>
                    <h2 className="text-xl font-semibold tracking-normal">
                      {section.title}
                    </h2>
                    <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-7">
                      {section.body.map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="border-border/50 bg-muted/18 rounded-2xl border p-6">
                  <h2 className="text-xl font-semibold tracking-normal">
                    {t("terms.s10Title")}
                  </h2>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {t("terms.s10Body")}
                  </p>
                </section>

                <p className="text-muted-foreground text-sm leading-7">
                  {t.rich("terms.seePrivacy", {
                    link: (chunks) => (
                      <Link
                        href="/privacy"
                        className="text-brand-primary hover:text-brand-primary/85 font-medium transition-colors"
                      >
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </LanguageProvider>
  );
}
