import type { Metadata } from "next";
import Image from "next/image";
import {
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_SOCIAL_IMAGE_HEIGHT,
  DEFAULT_SOCIAL_IMAGE_WIDTH,
  SITE_AUTHOR,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "TrackDraw | Drone Race Track Planner",
  },
  description:
    "TrackDraw is a drone race track planner for FPV race directors. Design tracks to scale, review track flow in 3D, and share read-only race-day layouts.",
  keywords: SITE_KEYWORDS,
  authors: [SITE_AUTHOR],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TrackDraw | Drone Race Track Planner",
    description:
      "Plan drone race tracks to scale, review FPV track flow in 3D, and share read-only race-day layouts.",
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
    title: "TrackDraw | Drone Race Track Planner",
    description:
      "Plan drone race tracks to scale, review FPV track flow in 3D, and share read-only race-day layouts.",
    images: [DEFAULT_SOCIAL_IMAGE],
  },
};
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import VersionTag from "@/components/VersionTag";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Minus,
  Orbit,
  Route,
  Share2,
  Waves,
  FileText,
} from "lucide-react";
import { Screenshot } from "@/components/landing/Screenshot";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Reveal,
  RevealStagger,
  RevealStaggerItem,
} from "@/components/landing/Motion";

// ── Brand logo ──────────────────────────────────────────────────
function BrandLogo({
  mono = false,
  className = "h-8 w-auto",
}: {
  mono?: boolean;
  className?: string;
}) {
  const light = mono
    ? "/assets/brand/trackdraw-logo-mono-lightbg.svg"
    : "/assets/brand/trackdraw-logo-color-lightbg.svg";
  const dark = mono
    ? "/assets/brand/trackdraw-logo-mono-darkbg.svg"
    : "/assets/brand/trackdraw-logo-color-darkbg.svg";
  return (
    <span className={`inline-flex ${className}`}>
      <span className="relative block aspect-17/4 h-full dark:hidden">
        <Image
          src={light}
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </span>
      <span className="relative hidden aspect-17/4 h-full dark:block">
        <Image
          src={dark}
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </span>
    </span>
  );
}

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
const features = [
  {
    icon: Route,
    color: "text-brand-primary",
    bg: "bg-brand-primary/12",
    border: "border-brand-primary/20",
    surface:
      "from-brand-primary/[0.12] via-brand-primary/[0.03] to-transparent",
    glow: "#1E93DB",
    title: "True-to-scale canvas",
    text: "Set field dimensions, drop elements and snap to a real-scale grid. What you design is what the crew builds.",
  },
  {
    icon: FileText,
    color: "text-brand-secondary",
    bg: "bg-brand-secondary/12",
    border: "border-brand-secondary/20",
    surface:
      "from-brand-secondary/[0.13] via-brand-secondary/[0.035] to-transparent",
    glow: "#F0761D",
    title: "Built-in obstacle set",
    text: "Design with the elements race crews actually use: gates, flags, cones, start pads, ladders, dive gates, labels and race lines.",
  },
  {
    icon: Waves,
    color: "text-emerald-400",
    bg: "bg-emerald-500/12",
    border: "border-emerald-500/20",
    surface: "from-emerald-500/[0.13] via-emerald-500/[0.035] to-transparent",
    glow: "#34d399",
    title: "Elevation-aware planning",
    text: "Add height to the race line while you plan so vertical problems show up before anyone starts setting the track.",
  },
  {
    icon: Share2,
    color: "text-violet-400",
    bg: "bg-violet-500/12",
    border: "border-violet-500/20",
    surface: "from-violet-500/[0.13] via-violet-500/[0.035] to-transparent",
    glow: "#a855f7",
    title: "Shared review links",
    text: "Send one current plan to pilots, judges and crew without asking anyone to install or log in first.",
  },
  {
    icon: ClipboardCheck,
    color: "text-sky-400",
    bg: "bg-sky-500/12",
    border: "border-sky-500/20",
    surface: "from-sky-500/[0.13] via-sky-500/[0.035] to-transparent",
    glow: "#38bdf8",
    title: "Venue-ready mobile use",
    text: "Handle practical touch edits on phones and tablets when the real venue forces a quick change.",
  },
  {
    icon: FileText,
    color: "text-rose-400",
    bg: "bg-rose-500/12",
    border: "border-rose-500/20",
    surface: "from-rose-500/[0.13] via-rose-500/[0.035] to-transparent",
    glow: "#fb7185",
    title: "Portable deliverables",
    text: "Turn the design into briefing files, print assets and reusable project data without rebuilding it elsewhere.",
  },
];

const compareRows = [
  { label: "Full track designer", guest: true, account: true },
  { label: "2D & 3D preview", guest: true, account: true },
  { label: "PDF, SVG, PNG & JSON export", guest: true, account: true },
  { label: "Read-only share links", guest: true, account: true },
  { label: "Cloud-synced projects", guest: false, account: true },
  { label: "Access across devices", guest: false, account: true },
];

const faq = [
  {
    q: "What is the best way to plan an FPV race track?",
    a: "Start with the field dimensions, drop in the obstacles you actually have, then review the flow in 3D. TrackDraw is built around that exact sequence — from first sketch to team hand-off.",
  },
  {
    q: "Can pilots review the layout without an account?",
    a: "Yes. Share links open in read-only mode on any device, no account or app needed. Send it to pilots, judges, or crew and everyone sees the same current version.",
  },
  {
    q: "Does it work on a tablet at the venue?",
    a: "Yes. The editor is touch-friendly, so quick adjustments on a phone or tablet are practical when the real venue forces a change.",
  },
  {
    q: "What export formats are available?",
    a: "PDF, PNG, SVG, and JSON. That covers printed race briefs, image exports, and reusable project files you can import for future events.",
  },
  {
    q: "Do I need an account to get started?",
    a: "No. Open the studio and start designing right away. Creating an account adds cloud storage so your projects are accessible from any device.",
  },
  {
    q: "Can I reuse a layout for a future event?",
    a: "Yes. Export the project as JSON and import it whenever you want to build on an older layout.",
  },
];

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "DesignApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: getSiteUrl(),
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

// ── Page ────────────────────────────────────────────────────────
export default function Home() {
  const heroPillClassName =
    "inline-flex min-h-7.5 items-center rounded-full border px-3.5 py-1 text-xs font-medium";

  return (
    <div id="top" className="bg-background text-foreground min-h-screen">
      <script
        id="software-application-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-border/40 bg-background/75 sticky top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-8 w-auto sm:h-9" />
          </Link>
          <div className="text-muted-foreground hidden items-center gap-7 text-sm sm:flex">
            <a href="#top" className="hover:text-foreground transition-colors">
              Home
            </a>
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#in-depth"
              className="hover:text-foreground transition-colors"
            >
              In depth
            </a>
            <a
              href="#plans"
              className="hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <Link
              href="/studio"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1E93DB] px-4 text-sm font-medium text-white shadow-md shadow-[#1E93DB]/30 transition hover:brightness-110"
            >
              Open Studio <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </nav>
      </header>

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
                    Built for FPV race directors
                  </span>
                  <VersionTag
                    className={`${heroPillClassName} border-amber-500/30 bg-amber-500/10 font-sans text-amber-500 hover:bg-amber-500/15 hover:text-amber-400`}
                  />
                </div>
              </Reveal>

              <Reveal delay={0.07} className="mt-5">
                <h1 className="text-[clamp(40px,11vw,58px)] leading-[1.04] font-semibold tracking-[-0.04em] sm:leading-[1.08]">
                  Race day starts
                  <br />
                  <span className="from-brand-primary bg-linear-to-r to-sky-300 bg-clip-text text-transparent">
                    with a plan.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={0.13} className="mt-5">
                <p className="text-muted-foreground max-w-sm text-[15px] leading-7">
                  TrackDraw is a browser-based drone race track planner for FPV
                  race directors. Build tracks to scale, review the flow in 3D,
                  share a read-only layout with pilots and crew, and make quick
                  edits from desktop or mobile.
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
                  Open Studio <ArrowRight className="size-3.5" />
                </Link>
                <a
                  href="#features"
                  className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex h-10 items-center justify-center gap-2 rounded-full border px-6 text-sm transition"
                >
                  See the features
                </a>
              </Reveal>

              <Reveal delay={0.23}>
                <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    "5+ element types",
                    "2D and 3D preview",
                    "PDF, SVG and PNG export",
                    "Read-only sharing",
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

            {/* Right: screenshot */}
            <Reveal delay={0.12}>
              <Screenshot
                src="/assets/screenshots/editor-project-workflow.png"
                alt="TrackDraw editor overview with active canvas and inspector"
                className="min-h-90"
              />
            </Reveal>
          </div>
        </section>
      </div>

      <main>
        {/* ── Features grid ────────────────────────────────── */}
        <section id="features" className="border-border/40 border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
            <Reveal className="mb-12">
              <Eyebrow>Features</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Plan, review, and hand off.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                TrackDraw gives FPV race directors a clean way to design a track
                properly: real field dimensions, the right obstacle set, and
                enough structure to map the lap before anyone starts building.
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
              <Eyebrow>In depth</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                From first layout to team hand-off.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                The tool works best as a sequence: map the drone race track in
                2D, check it in 3D, make practical edits when reality changes,
                then hand the same plan to pilots and crew.
              </p>
            </Reveal>

            <div className="space-y-16 sm:space-y-28">
              <Reveal>
                <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
                  <Screenshot
                    src="/assets/screenshots/editor-element-library.png"
                    alt="TrackDraw 2D layout editor with obstacle library and track plan"
                    className="order-last lg:order-first"
                  />
                  <div className="order-first lg:order-last">
                    <div className="border-brand-primary/20 bg-brand-primary/8 text-brand-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase">
                      <Route className="size-3" /> 2D Layout
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Build the track on a field that matches reality.
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      Start with the field dimensions, then place the elements
                      crews already recognize. That makes the first version of
                      the plan useful immediately, instead of just being a rough
                      sketch.
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {[
                        "Scale-accurate field dimensions",
                        "Gates, flags, cones, start pads and larger features",
                        "Race line and labels for briefing clarity",
                      ].map((b) => (
                        <li
                          key={b}
                          className="text-muted-foreground flex items-center gap-2.5 text-sm"
                        >
                          <CheckCircle2 className="text-brand-primary size-3.5 shrink-0" />{" "}
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="grid items-center gap-8 sm:gap-9 lg:grid-cols-[1.28fr_0.72fr] lg:gap-14">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] text-emerald-400 uppercase">
                      <ClipboardCheck className="size-3" /> Fine-Tune
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Keep editing when the venue forces a change.
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      A good plan changes cleanly. Inspector controls and
                      mobile-friendly editing make it possible to adjust object
                      properties, reposition items and keep the design usable
                      even when the real venue refuses to stay static.
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {[
                        "Inspector controls for dimensions, rotation and color",
                        "Touch-friendly editing on phones and tablets",
                        "Fast adjustments without leaving the main plan",
                      ].map((b) => (
                        <li
                          key={b}
                          className="text-muted-foreground flex items-center gap-2.5 text-sm"
                        >
                          <CheckCircle2 className="size-3.5 shrink-0 text-emerald-400" />{" "}
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Screenshot
                    src="/assets/screenshots/editor-mobile-settings.png"
                    alt="TrackDraw mobile editor with settings panel open"
                    aspect="portrait"
                    accentClassName="bg-emerald-500/16"
                    className="mx-auto w-full max-w-51.25 self-center sm:max-w-57.5 lg:max-w-62.5"
                  />
                </div>
              </Reveal>

              <Reveal>
                <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-12">
                  <Screenshot
                    src="/assets/screenshots/editor-3d-flythroug.png"
                    alt="TrackDraw 3D preview showing track flow and elevation"
                    className="order-last lg:order-first"
                  />
                  <div className="order-first lg:order-last">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] text-purple-400 uppercase">
                      <Orbit className="size-3" /> 3D Preview
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Walk the track before you build it.
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      One click switches from the flat 2D plan to a live 3D
                      scene. Assign elevation to each waypoint on the race line
                      to model the full vertical profile. Catch dangerous
                      approaches before a single peg is in the ground.
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {[
                        "Live 3D rendered directly from your 2D design",
                        "Per-waypoint altitude on the race line",
                        "Elevation graph in the inspector panel",
                      ].map((b) => (
                        <li
                          key={b}
                          className="text-muted-foreground flex items-center gap-2.5 text-sm"
                        >
                          <CheckCircle2 className="size-3.5 shrink-0 text-purple-400" />{" "}
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className="grid items-center gap-8 sm:gap-9 lg:grid-cols-[1.28fr_0.72fr] lg:gap-14">
                  <div>
                    <div className="border-brand-secondary/20 bg-brand-secondary/8 text-brand-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase">
                      <Share2 className="size-3" /> Hand-Off
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Give pilots and crew the same current version.
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      A plan only matters if other people can open it. Shared
                      read-only links and exports turn the layout into something
                      pilots can review, crew can print and organizers can reuse
                      later.
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {[
                        "Read-only links that open on any device",
                        "PDF, PNG and SVG for briefing and print workflows",
                        "JSON export to archive and reuse layouts later",
                      ].map((b) => (
                        <li
                          key={b}
                          className="text-muted-foreground flex items-center gap-2.5 text-sm"
                        >
                          <CheckCircle2 className="text-brand-secondary size-3.5 shrink-0" />{" "}
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Screenshot
                    src="/assets/screenshots/editor-share-readonly-mobile.png"
                    alt="TrackDraw read-only shared view open on mobile"
                    aspect="portrait"
                    accentClassName="bg-brand-secondary/18"
                    className="mx-auto w-full max-w-51.25 self-center sm:max-w-57.5 lg:max-w-62.5"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Compare ──────────────────────────────────────── */}
        <section id="plans" className="border-border/40 border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
            <Reveal className="mb-12">
              <Eyebrow>Pricing</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Start now, sign up when it matters.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                TrackDraw works without an account. Sign up to keep your
                projects in the cloud — accessible on any device, always there
                when you need them.
              </p>
            </Reveal>

            <div className="-mx-6 overflow-x-auto px-6 pb-2 sm:mx-auto sm:max-w-2xl sm:overflow-visible sm:px-0 sm:pb-0">
              <div className="flex snap-x snap-mandatory gap-4 sm:grid sm:grid-cols-2">
                {/* Guest */}
                <Reveal>
                  <div className="border-border/50 bg-card/20 flex h-full max-w-[19.5rem] min-w-[18.5rem] snap-start flex-col rounded-2xl border p-6 sm:max-w-none sm:min-w-0">
                    <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
                      Without account
                    </p>
                    <p className="mt-2 text-xl font-semibold">Guest</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Open the studio and start immediately.
                    </p>
                    <Link
                      href="/studio"
                      className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-full border px-5 text-sm transition"
                    >
                      Open Studio <ArrowRight className="size-3.5" />
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {compareRows.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          {row.guest ? (
                            <Check className="text-brand-primary size-3.5 shrink-0" />
                          ) : (
                            <Minus className="text-muted-foreground/40 size-3.5 shrink-0" />
                          )}
                          <span
                            className={
                              row.guest
                                ? "text-foreground"
                                : "text-muted-foreground/40"
                            }
                          >
                            {row.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>

                {/* Account */}
                <Reveal delay={0.07}>
                  <div className="border-brand-primary/25 bg-brand-primary/5 from-brand-primary/8 relative flex h-full max-w-[19.5rem] min-w-[18.5rem] snap-start flex-col overflow-hidden rounded-2xl border bg-linear-to-br to-transparent p-6 sm:max-w-none sm:min-w-0">
                    <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[#1E93DB] opacity-[0.12] blur-2xl" />
                    <p className="text-brand-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
                      With account
                    </p>
                    <p className="mt-2 text-xl font-semibold">Free</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Cloud storage, any device, always safe.
                    </p>
                    <Link
                      href="/login"
                      className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#1E93DB] px-5 text-sm font-medium text-white shadow-md shadow-[#1E93DB]/25 transition hover:brightness-110"
                    >
                      Create account <ArrowRight className="size-3.5" />
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {compareRows.map((row) => (
                        <li
                          key={row.label}
                          className="flex items-center gap-2.5 text-sm"
                        >
                          {row.account ? (
                            <Check className="text-brand-primary size-3.5 shrink-0" />
                          ) : (
                            <Minus className="text-muted-foreground/40 size-3.5 shrink-0" />
                          )}
                          <span
                            className={
                              row.account
                                ? "text-foreground"
                                : "text-muted-foreground/40"
                            }
                          >
                            {row.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="border-border/40 border-t">
          <div className="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
            <Reveal className="mb-10">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Good to know.
              </h2>
            </Reveal>
            <FaqAccordion items={faq} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
