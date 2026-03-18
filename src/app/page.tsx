import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "TrackDraw - FPV Race Track Planner",
  description:
    "Design FPV drone race tracks to scale, preview in 3D, and share with your pilots in seconds. Built for race directors.",
  keywords: [
    "FPV",
    "drone racing",
    "track design",
    "race track planner",
    "FPV track builder",
    "Dutch Drone Squad",
  ],
  authors: [{ name: "Dutch Drone Squad", url: "https://dutchdronesquad.nl" }],
  openGraph: {
    type: "website",
    siteName: "TrackDraw",
    title: "TrackDraw - FPV Race Track Planner",
    description:
      "Design FPV drone race tracks to scale, preview in 3D, and share with your pilots in seconds.",
    images: [
      {
        url: "/assets/screenshots/editor-overview.png",
        width: 1920,
        height: 1080,
        alt: "TrackDraw editor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackDraw - FPV Race Track Planner",
    description:
      "Design FPV drone race tracks to scale, preview in 3D, and share with your pilots in seconds.",
    images: ["/assets/screenshots/editor-overview.png"],
  },
};
import Link from "next/link";
import { Footer } from "@/components/landing/Footer";
import VersionTag from "@/components/VersionTag";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Orbit,
  Route,
  Share2,
  Waves,
  Spline,
  FileText,
} from "lucide-react";
import { SectionScreenshot } from "@/components/landing/ScreenshotFrame";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  FadeUp,
  StaggerGrid,
  StaggerItem,
} from "@/components/landing/LandingClient";

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
      <Image
        src={light}
        alt="TrackDraw"
        width={170}
        height={40}
        className="block h-full w-auto dark:hidden"
        priority
      />
      <Image
        src={dark}
        alt="TrackDraw"
        width={170}
        height={40}
        className="hidden h-full w-auto dark:block"
        priority
      />
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
    bg: "bg-brand-primary/10",
    glow: "#1E93DB",
    title: "True-to-scale canvas",
    text: "Set field dimensions, drop elements and snap to a real-scale grid. What you design is what the crew builds.",
  },
  {
    icon: Orbit,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    glow: "#a855f7",
    title: "3D preview",
    text: "Switch from the flat 2D plan to a live 3D scene in one click. No extra software needed.",
  },
  {
    icon: Waves,
    color: "text-brand-secondary",
    bg: "bg-brand-secondary/10",
    glow: "#F0761D",
    title: "Elevation on the race line",
    text: "Assign altitude to every waypoint and catch vertical problems before you're on-site.",
  },
  {
    icon: Share2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    glow: "#34d399",
    title: "Share with one link",
    text: "Send one link to pilots, judges and crew. Everyone sees the same plan, no app or account needed.",
  },
  {
    icon: Spline,
    color: "text-brand-primary",
    bg: "bg-brand-primary/10",
    glow: "#1E93DB",
    title: "Smooth race-line path",
    text: "Draw the flight path with smooth curves and directional arrows. Pilots know where to fly before they see the first gate.",
  },
  {
    icon: FileText,
    color: "text-brand-secondary",
    bg: "bg-brand-secondary/10",
    glow: "#F0761D",
    title: "Export for any format",
    text: "Print-ready PDF, high-res PNG, vector SVG, or JSON. Every export carries the title, field size and scale.",
  },
];

const faq = [
  {
    q: "Is TrackDraw only for large events?",
    a: "Not at all. Whether it's a club weekend, a training day or a championship round, if you want pilots and crew on the same plan, TrackDraw fits.",
  },
  {
    q: "Can pilots review the track without editing?",
    a: "Yes. Every shared link opens in read-only mode, no account or app needed. Drop it in the group chat and every pilot has the plan on their screen.",
  },
  {
    q: "Can we make changes between heats?",
    a: "Yes. TrackDraw saves as you work. Move a gate, hit Share, copy the new link. The updated plan is in the group chat before the next round starts.",
  },
  {
    q: "What exactly gets exported?",
    a: "PDF (A4, portrait or landscape, with title and field dimensions), PNG (2× high-res, light or dark background), SVG (vector for Illustrator or Inkscape), and a JSON project file you can re-import at any time.",
  },
  {
    q: "Can I use TrackDraw on a tablet at the venue?",
    a: "Yes. The read-only view works on any device. For editing, a tablet or laptop is most comfortable since the canvas benefits from the extra screen space.",
  },
];

// ── Page ────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="border-border/40 bg-background/75 sticky top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150">
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <BrandLogo className="h-8 w-auto sm:h-9" />
          </Link>
          <div className="text-muted-foreground hidden items-center gap-7 text-sm sm:flex">
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
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
        <div className="pointer-events-none absolute -top-32 left-0 h-[600px] w-[600px] rounded-full bg-[#1E93DB] opacity-[0.06] blur-[120px]" />

        <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.45fr] lg:gap-16">
            {/* Left: text */}
            <div>
              <FadeUp>
                <div className="flex items-center gap-3">
                  <span className="border-brand-primary/25 bg-brand-primary/8 text-brand-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-xs font-medium">
                    <span className="bg-brand-primary size-1.5 animate-pulse rounded-full" />
                    Built for FPV race directors
                  </span>
                  <VersionTag className="rounded-full border-amber-500/30 bg-amber-500/10 px-3.5 py-1 font-sans text-xs font-medium text-amber-500 hover:bg-amber-500/15 hover:text-amber-400" />
                </div>
              </FadeUp>

              <FadeUp delay={0.07} className="mt-5">
                <h1 className="text-[clamp(34px,4.5vw,58px)] leading-[1.08] font-semibold tracking-[-0.04em]">
                  Race day starts
                  <br />
                  <span className="from-brand-primary bg-gradient-to-r to-sky-300 bg-clip-text text-transparent">
                    with a plan.
                  </span>
                </h1>
              </FadeUp>

              <FadeUp delay={0.13} className="mt-5">
                <p className="text-muted-foreground max-w-sm text-[15px] leading-7">
                  A browser-based track designer for FPV race directors. Draw to
                  scale, preview in 3D, share a live link. All before the gates
                  leave the van.
                </p>
              </FadeUp>

              <FadeUp
                delay={0.18}
                className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <Link
                  href="/studio"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#1E93DB] px-6 text-sm font-medium text-white shadow-lg shadow-[#1E93DB]/25 transition hover:brightness-110"
                >
                  Start designing, it&apos;s free{" "}
                  <ArrowRight className="size-3.5" />
                </Link>
                <a
                  href="#features"
                  className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground inline-flex h-10 items-center justify-center gap-2 rounded-full border px-6 text-sm transition"
                >
                  See the features
                </a>
              </FadeUp>

              <FadeUp delay={0.23}>
                <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    "5+ element types",
                    "2D and 3D preview",
                    "PDF, SVG and PNG export",
                    "Free to use and share",
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
              </FadeUp>
            </div>

            {/* Right: screenshot */}
            <FadeUp delay={0.12}>
              <SectionScreenshot
                src="/assets/screenshots/editor-overview.png"
                alt="TrackDraw 2D track editor"
              />
            </FadeUp>
          </div>
        </section>
      </div>

      <main>
        {/* ── Features grid ────────────────────────────────── */}
        <section id="features" className="border-border/40 border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
            <FadeUp className="mb-12">
              <Eyebrow>Features</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything a race director needs.
              </h2>
            </FadeUp>

            <StaggerGrid className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <StaggerItem key={f.title} className="h-full">
                  <div className="group border-border/50 bg-card/20 hover:border-border hover:bg-card/40 relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border p-6 transition-all duration-300">
                    {/* Per-card colour glow in the top-right corner */}
                    <div
                      className="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ background: f.glow }}
                    />
                    <div
                      className={`relative inline-flex size-9 items-center justify-center rounded-xl border border-white/5 ${f.bg}`}
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
                </StaggerItem>
              ))}
            </StaggerGrid>
          </div>
        </section>

        {/* ── In depth ─────────────────────────────────────── */}
        <section
          id="in-depth"
          className="border-border/40 bg-muted/[0.035] border-t"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-20">
            <FadeUp className="mb-12 sm:mb-20">
              <Eyebrow>In depth</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Two more things worth knowing.
              </h2>
            </FadeUp>

            <div className="space-y-16 sm:space-y-28">
              {/* 3D Preview */}
              <FadeUp>
                <div className="grid items-center gap-12 lg:grid-cols-2">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/20 bg-purple-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] text-purple-400 uppercase">
                      <Orbit className="size-3" /> 3D Preview
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Walk the course before you build it.
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
                  <SectionScreenshot
                    src="/assets/screenshots/editor-3d.png"
                    alt="3D view of the track"
                  />
                </div>
              </FadeUp>

              {/* Inspector & Share */}
              <FadeUp>
                <div className="grid items-center gap-12 lg:grid-cols-2">
                  <SectionScreenshot
                    src="/assets/screenshots/editor-inspector.png"
                    alt="Element inspector and share panel"
                    className="order-last lg:order-first"
                  />
                  <div className="order-first lg:order-last">
                    <div className="border-brand-secondary/20 bg-brand-secondary/8 text-brand-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase">
                      <Share2 className="size-3" /> Inspector & Share
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">
                      Tune every detail, then share.
                    </h3>
                    <p className="text-muted-foreground mt-3 text-sm leading-7">
                      Select any element to edit its properties: dimensions,
                      rotation, colour and race-line altitude, all in one panel.
                      When the track is ready, hit Share and copy the link.
                      Pilots open it on their phone without an account or app.
                    </p>
                    <ul className="mt-5 space-y-2.5">
                      {[
                        "Live property panel for every track element",
                        "Read-only share link, works on any device",
                        "PDF, PNG, SVG and JSON export",
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
                </div>
              </FadeUp>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <section id="faq" className="border-border/40 border-t">
          <div className="mx-auto w-full max-w-2xl px-6 py-14 sm:py-20">
            <FadeUp className="mb-10">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Common questions.
              </h2>
            </FadeUp>
            <div className="divide-border/50 divide-y">
              {faq.map((item, i) => (
                <details key={item.q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium">
                    {item.q}
                    <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="text-muted-foreground pb-5 text-sm leading-6">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
