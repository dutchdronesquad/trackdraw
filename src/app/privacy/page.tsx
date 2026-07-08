import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";
import LanguageProvider from "@/i18n/LanguageProvider";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("privacy.metaTitle"),
    description: t("privacy.metaDescription"),
    alternates: {
      canonical: "/privacy",
    },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  type BodyItem = string | { intro: string; list: string[] };

  const sections: { title: string; body: BodyItem[] }[] = [
    {
      title: t("privacy.s1Title"),
      body: [t("privacy.s1Body")],
    },
    {
      title: t("privacy.s2Title"),
      body: [
        {
          intro: t("privacy.s2Intro"),
          list: [
            t("privacy.s2Item1"),
            t("privacy.s2Item2"),
            t("privacy.s2Item3"),
            t("privacy.s2Item4"),
            t("privacy.s2Item5"),
          ],
        },
      ],
    },
    {
      title: t("privacy.s3Title"),
      body: [t("privacy.s3Body")],
    },
    {
      title: t("privacy.s4Title"),
      body: [t("privacy.s4Body")],
    },
    {
      title: t("privacy.s5Title"),
      body: [t("privacy.s5Body")],
    },
    {
      title: t("privacy.s6Title"),
      body: [t("privacy.s6Body")],
    },
    {
      title: t("privacy.s7Title"),
      body: [t("privacy.s7Body")],
    },
    {
      title: t("privacy.s8Title"),
      body: [t("privacy.s8Body")],
    },
    {
      title: t("privacy.s9Title"),
      body: [t("privacy.s9Body")],
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
                {t("privacy.breadcrumbLegal")}
              </p>
              <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-normal sm:text-5xl">
                {t("privacy.pageTitle")}
              </h1>
              <p className="text-muted-foreground mt-5 max-w-2xl text-sm leading-7">
                {t("privacy.effectiveDate")}
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
                      {section.body.map((item, i) =>
                        typeof item === "string" ? (
                          <p key={i}>{item}</p>
                        ) : (
                          <div key={i} className="space-y-2">
                            <p>{item.intro}</p>
                            <ul className="list-disc space-y-1.5 pl-5">
                              {item.list.map((li) => (
                                <li key={li}>{li}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                ))}

                <section className="border-border/50 bg-muted/18 rounded-2xl border p-6">
                  <h2 className="text-xl font-semibold tracking-normal">
                    {t("privacy.s10Title")}
                  </h2>
                  <p className="text-muted-foreground mt-3 text-sm leading-7">
                    {t("privacy.s10Body")}
                  </p>
                </section>

                <p className="text-muted-foreground text-sm leading-7">
                  {t.rich("privacy.seeTerms", {
                    link: (chunks) => (
                      <Link
                        href="/terms"
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
