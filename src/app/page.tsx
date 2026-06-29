import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  DEFAULT_LANDING_DEMO_POSTER,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  getLandingDemoVideoUrl,
  getSiteMediaUrl,
  getSiteUrl,
  serializeJsonLd,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.metadata");

  return {
    title: {
      absolute: t("homeTitle"),
    },
    description: t("homeDescription"),
    keywords: SITE_KEYWORDS,
    authors: [SITE_AUTHOR],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: t("homeSocialTitle"),
      description: t("homeSocialDescription"),
      url: "/",
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE,
          width: DEFAULT_SOCIAL_IMAGE_WIDTH,
          height: DEFAULT_SOCIAL_IMAGE_HEIGHT,
          alt: DEFAULT_OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      title: t("homeSocialTitle"),
      description: t("homeSocialDescription"),
      images: [DEFAULT_SOCIAL_IMAGE],
    },
  };
}
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import { PublicSiteHeader } from "@/components/landing/PublicSiteHeader";
import VersionTag from "@/components/VersionTag";

import {
  ArrowRight,
  Bookmark,
  Boxes,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Orbit,
  Route,
  Share2,
  FileText,
} from "lucide-react";
import { Screenshot } from "@/components/landing/Screenshot";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { PricingSection } from "@/components/landing/PricingSection";
import {
  Reveal,
  RevealStagger,
  RevealStaggerItem,
} from "@/components/landing/Motion";
import LanguageProvider from "@/i18n/LanguageProvider";

// ── Eyebrow label ───────────────────────────────────────────────
function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase ${className}`}
    >
      <span className="bg-muted-foreground/50 size-1 rounded-full" />
      {children}
    </p>
  );
}

// ── Data ────────────────────────────────────────────────────────

const landingDemoVideoSrc = getLandingDemoVideoUrl();
const landingDemoPosterSrc = DEFAULT_LANDING_DEMO_POSTER;
const landingPageUrl = getSiteUrl();

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: landingPageUrl,
  author: {
    "@type": "Organization",
    name: SITE_AUTHOR.name,
    url: SITE_AUTHOR.url,
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

const videoObjectJsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoObject",
  name: "TrackDraw drone race track builder demo",
  description:
    "A quick product demo showing how TrackDraw helps FPV race directors build a drone race track layout, review it in 3D, and share it with pilots and crew.",
  thumbnailUrl: [landingDemoPosterSrc],
  contentUrl: landingDemoVideoSrc,
  embedUrl: landingPageUrl,
};

function LandingVideo({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="bg-background/40 overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_56px_rgba(15,23,42,0.18)] ring-1 ring-white/5 backdrop-blur-[2px]">
        <video
          autoPlay
          muted
          loop
          playsInline
          controls
          controlsList="nodownload"
          disablePictureInPicture
          preload="metadata"
          poster={landingDemoPosterSrc}
          className="block h-auto w-full bg-black"
        >
          <source src={landingDemoVideoSrc} type="video/webm" />
        </video>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default async function Home() {
  const t = await getTranslations("landing");

  const faq = (
    t.raw("faq.items") as Array<{ question: string; answer: string }>
  ).map((item) => ({
    q: item.question,
    a: item.answer,
  }));

  const features = [
    {
      icon: Route,
      color: "text-brand-primary",
      bg: "bg-brand-primary/12",
      border: "border-brand-primary/20",
      surface:
        "from-brand-primary/[0.12] via-brand-primary/[0.03] to-transparent",
      glow: "#1E93DB",
      title: t("features.trueToScale.title"),
      text: t("features.trueToScale.description"),
    },
    {
      icon: Boxes,
      color: "text-brand-secondary",
      bg: "bg-brand-secondary/12",
      border: "border-brand-secondary/20",
      surface:
        "from-brand-secondary/[0.13] via-brand-secondary/[0.035] to-transparent",
      glow: "#F0761D",
      title: t("features.obstacleCatalog.title"),
      text: t("features.obstacleCatalog.description"),
    },
    {
      icon: Orbit,
      color: "text-emerald-400",
      bg: "bg-emerald-500/12",
      border: "border-emerald-500/20",
      surface: "from-emerald-500/[0.13] via-emerald-500/[0.035] to-transparent",
      glow: "#34d399",
      title: t("features.preview3d.title"),
      text: t("features.preview3d.description"),
    },
    {
      icon: Share2,
      color: "text-violet-400",
      bg: "bg-violet-500/12",
      border: "border-violet-500/20",
      surface: "from-violet-500/[0.13] via-violet-500/[0.035] to-transparent",
      glow: "#a855f7",
      title: t("features.shareLinks.title"),
      text: t("features.shareLinks.description"),
    },
    {
      icon: Bookmark,
      color: "text-amber-400",
      bg: "bg-amber-500/12",
      border: "border-amber-500/20",
      surface: "from-amber-500/[0.13] via-amber-500/[0.035] to-transparent",
      glow: "#f59e0b",
      title: t("features.sections.title"),
      text: t("features.sections.description"),
    },
    {
      icon: FileText,
      color: "text-rose-400",
      bg: "bg-rose-500/12",
      border: "border-rose-500/20",
      surface: "from-rose-500/[0.13] via-rose-500/[0.035] to-transparent",
      glow: "#fb7185",
      title: t("features.export.title"),
      text: t("features.export.description"),
    },
  ];

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const heroPillClassName =
    "inline-flex min-h-7.5 items-center rounded-full border px-3.5 py-1 text-xs font-medium";

  return (
    <LanguageProvider namespaces={["common", "landing"]}>
      <div id="top" className="bg-background text-foreground min-h-screen">
        <script
          id="software-application-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(softwareApplicationJsonLd),
          }}
        />
        <script
          id="video-object-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(videoObjectJsonLd),
          }}
        />
        <script
          id="faq-page-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(faqPageJsonLd),
          }}
        />
        {/* ── Nav ─────────────────────────────────────────────── */}
        <PublicSiteHeader currentPage="home" />

        {/* ── Hero ────────────────────────────────────────────── */}
        <div className="relative overflow-hidden">
          {/* Ambient glow — top-left, keyed to the text column */}
          <div className="pointer-events-none absolute -top-32 left-0 h-150 w-150 rounded-full bg-[#1E93DB] opacity-[0.06] blur-[120px]" />

          <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14 sm:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.45fr] lg:gap-16">
              {/* Left: text */}
              <div>
                <Reveal>
                  <div className="flex items-center gap-3">
                    <span
                      className={`border-brand-primary/25 bg-brand-primary/8 text-brand-primary ${heroPillClassName} gap-2`}
                    >
                      <span className="bg-brand-primary size-1.5 animate-pulse rounded-full" />
                      {t("hero.eyebrow")}
                    </span>
                    <VersionTag
                      className={`${heroPillClassName} border-amber-500/30 bg-amber-500/10 font-sans text-amber-500 hover:bg-amber-500/15 hover:text-amber-400`}
                    />
                  </div>
                </Reveal>

                <Reveal delay={0.07} className="mt-5">
                  <h1 className="text-[clamp(40px,11vw,58px)] leading-[1.04] font-semibold tracking-[-0.04em] sm:leading-[1.08]">
                    {t("hero.headingLine1")}
                    <br />
                    <span className="from-brand-primary bg-linear-to-r to-sky-300 bg-clip-text text-transparent">
                      {t("hero.headingLine2")}
                    </span>
                  </h1>
                </Reveal>

                <Reveal delay={0.13} className="mt-5">
                  <p className="text-muted-foreground max-w-sm text-[15px] leading-7">
                    {t("hero.description")}
                  </p>
                </Reveal>

                <Reveal
                  delay={0.18}
                  className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <Link
                    href="/studio"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1E93DB] px-6 text-sm font-medium text-white shadow-lg shadow-[#1E93DB]/25 transition hover:brightness-110"
                  >
                    {t("hero.ctaStudio")} <ArrowRight className="size-3.5" />
                  </Link>
                  <a
                    href="#features"
                    className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex h-10 items-center justify-center gap-2 rounded-full border px-6 text-sm transition"
                  >
                    {t("hero.ctaFeatures")}
                  </a>
                </Reveal>

                <Reveal delay={0.23}>
                  <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5">
                    {[
                      t("hero.feature1"),
                      t("hero.feature2"),
                      t("hero.feature3"),
                      t("hero.feature4"),
                    ].map((item) => (
                      <li
                        key={item}
                        className="text-muted-foreground flex items-center gap-2 text-sm"
                      >
                        <span className="bg-brand-primary/15 flex size-4 shrink-0 items-center justify-center rounded-full">
                          <Check className="text-brand-primary size-2.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>

              {/* Right: product demo */}
              <Reveal delay={0.12}>
                <LandingVideo className="sm:min-h-90" />
              </Reveal>
            </div>
          </section>
        </div>

        <main>
          {/* ── Features grid ────────────────────────────────── */}
          <section id="features" className="border-border/40 border-t">
            <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
              <Reveal className="mb-12">
                <Eyebrow>{t("features.sectionTitle")}</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("features.sectionHeading")}
                </h2>
                <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                  {t("features.sectionDescription")}
                </p>
              </Reveal>

              <RevealStagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {features.map((f) => (
                  <RevealStaggerItem key={f.title} className="h-full">
                    <div
                      className={`group border-border/50 bg-card/20 hover:bg-card/45 relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${f.border}`}
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 bg-linear-to-br ${f.surface} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
                      />
                      {/* Per-card colour glow in the top-right corner */}
                      <div
                        className="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                        style={{ background: f.glow }}
                      />
                      <div
                        className={`relative inline-flex size-9 items-center justify-center rounded-xl border border-white/8 ${f.bg}`}
                      >
                        <f.icon className={`size-4 ${f.color}`} />
                      </div>
                      <div className="relative">
                        <h3 className="text-sm font-semibold">{f.title}</h3>
                        <p className="text-muted-foreground mt-1.5 text-sm leading-6">
                          {f.text}
                        </p>
                      </div>
                    </div>
                  </RevealStaggerItem>
                ))}
              </RevealStagger>
            </div>
          </section>

          {/* ── In depth ─────────────────────────────────────── */}
          <section
            id="in-depth"
            className="border-border/40 bg-muted/[0.035] border-t"
          >
            <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
              <Reveal className="mb-12 sm:mb-20">
                <Eyebrow>{t("workflow.sectionEyebrow")}</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t("workflow.sectionHeading")}
                </h2>
                <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                  {t("workflow.sectionDescription")}
                </p>
              </Reveal>

              <div className="space-y-16 sm:space-y-28">
                <Reveal>
                  <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
                    <Screenshot
                      src={getSiteMediaUrl(
                        "/landing/screenshots/editor-element-library.png"
                      )}
                      alt={t("workflow.layout.screenshotAlt")}
                      className="order-last lg:order-first"
                    />
                    <div className="order-first lg:order-last">
                      <div className="border-brand-primary/20 bg-brand-primary/8 text-brand-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase">
                        <Route className="size-3" />{" "}
                        {t("workflow.layout.title")}
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight">
                        {t("workflow.layout.subtitle")}
                      </h3>
                      <p className="text-muted-foreground mt-3 text-sm leading-7">
                        {t("workflow.layout.description")}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {(t.raw("workflow.layout.bullets") as string[]).map(
                          (b) => (
                            <li
                              key={b}
                              className="text-muted-foreground flex items-center gap-2.5 text-sm"
                            >
                              <CheckCircle2 className="text-brand-primary size-3.5 shrink-0" />{" "}
                              {b}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </Reveal>

                <Reveal>
                  <div className="grid items-center gap-8 sm:gap-9 lg:grid-cols-[1.28fr_0.72fr] lg:gap-14">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] text-emerald-400 uppercase">
                        <ClipboardCheck className="size-3" />{" "}
                        {t("workflow.fineTune.title")}
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight">
                        {t("workflow.fineTune.subtitle")}
                      </h3>
                      <p className="text-muted-foreground mt-3 text-sm leading-7">
                        {t("workflow.fineTune.description")}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {(t.raw("workflow.fineTune.bullets") as string[]).map(
                          (b) => (
                            <li
                              key={b}
                              className="text-muted-foreground flex items-center gap-2.5 text-sm"
                            >
                              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />{" "}
                              {b}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <Screenshot
                      src={getSiteMediaUrl(
                        "/landing/screenshots/editor-mobile-settings.png"
                      )}
                      alt={t("workflow.fineTune.screenshotAlt")}
                      aspect="portrait"
                      accentClassName="bg-emerald-500/16"
                      className="mx-auto w-full max-w-51.25 self-center sm:max-w-57.5 lg:max-w-62.5"
                    />
                  </div>
                </Reveal>

                <Reveal>
                  <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
                    <Screenshot
                      src={getSiteMediaUrl(
                        "/landing/screenshots/editor-3d-flythroug.png"
                      )}
                      alt={t("workflow.preview.screenshotAlt")}
                      className="order-last lg:order-first"
                    />
                    <div className="order-first lg:order-last">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] text-purple-400 uppercase">
                        <Orbit className="size-3" />{" "}
                        {t("workflow.preview.title")}
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight">
                        {t("workflow.preview.subtitle")}
                      </h3>
                      <p className="text-muted-foreground mt-3 text-sm leading-7">
                        {t("workflow.preview.description")}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {(t.raw("workflow.preview.bullets") as string[]).map(
                          (b) => (
                            <li
                              key={b}
                              className="text-muted-foreground flex items-center gap-2.5 text-sm"
                            >
                              <CheckCircle2 className="size-3.5 shrink-0 text-purple-400" />{" "}
                              {b}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </Reveal>

                <Reveal>
                  <div className="grid items-center gap-8 sm:gap-9 lg:grid-cols-[1.28fr_0.72fr] lg:gap-14">
                    <div>
                      <div className="border-brand-secondary/20 bg-brand-secondary/8 text-brand-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase">
                        <Share2 className="size-3" />{" "}
                        {t("workflow.handOff.title")}
                      </div>
                      <h3 className="mt-4 text-xl font-semibold tracking-tight">
                        {t("workflow.handOff.subtitle")}
                      </h3>
                      <p className="text-muted-foreground mt-3 text-sm leading-7">
                        {t("workflow.handOff.description")}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {(t.raw("workflow.handOff.bullets") as string[]).map(
                          (b) => (
                            <li
                              key={b}
                              className="text-muted-foreground flex items-center gap-2.5 text-sm"
                            >
                              <CheckCircle2 className="text-brand-secondary size-3.5 shrink-0" />{" "}
                              {b}
                            </li>
                          )
                        )}
                      </ul>
                      <Link
                        href="/gallery"
                        className="text-brand-secondary hover:text-brand-secondary/85 mt-6 inline-flex items-center gap-2 text-sm font-medium transition-colors"
                      >
                        {t("workflow.handOff.gallery")}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                    <Screenshot
                      src={getSiteMediaUrl(
                        "/landing/screenshots/editor-share-readonly-mobile.png"
                      )}
                      alt={t("workflow.handOff.screenshotAlt")}
                      aspect="portrait"
                      accentClassName="bg-brand-secondary/18"
                      className="mx-auto w-full max-w-51.25 self-center sm:max-w-57.5 lg:max-w-62.5"
                    />
                  </div>
                </Reveal>
              </div>
            </div>
          </section>

          <PricingSection />

          {/* ── FAQ ──────────────────────────────────────────── */}
          <section id="faq" className="border-border/40 border-t">
            <div className="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
              <Reveal className="mb-10">
                <Eyebrow>{t("faq.sectionTitle")}</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                  {t("faq.sectionHeading")}
                </h2>
              </Reveal>
              <FaqAccordion items={faq} />
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </LanguageProvider>
  );
}
