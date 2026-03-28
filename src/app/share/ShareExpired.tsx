import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, RefreshCcw } from "lucide-react";

function TrackDrawLogo() {
  return (
    <div className="inline-flex">
      <div className="relative h-8 w-34 dark:hidden">
        <Image
          src="/assets/brand/trackdraw-logo-color-lightbg.svg"
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </div>
      <div className="relative hidden h-8 w-34 dark:block">
        <Image
          src="/assets/brand/trackdraw-logo-color-darkbg.svg"
          alt="TrackDraw"
          fill
          priority
          unoptimized
          className="object-contain"
        />
      </div>
    </div>
  );
}

export default function ShareExpired() {
  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-brand-primary/10 absolute top-20 left-[12%] h-52 w-52 rounded-full blur-3xl" />
        <div className="bg-brand-secondary/12 absolute right-[6%] bottom-10 h-60 w-60 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16 sm:px-8">
        <div className="w-full">
          <div className="mb-10 flex items-center justify-between gap-4">
            <TrackDrawLogo />
            <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <Clock3 className="size-3.5" />
              Share View
            </div>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
                This share link has expired
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
                TrackDraw share links currently expire after 90 days unless a
                different expiry is chosen when publishing. Ask the sender to
                publish a fresh link if you still need this layout.
              </p>
            </div>

            <div className="max-w-4xl">
              <p className="text-muted-foreground/70 mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                What To Try
              </p>
              <ol className="text-muted-foreground text-sm leading-relaxed">
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    1.
                  </span>
                  <span>Ask the sender to publish the track again.</span>
                </li>
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    2.
                  </span>
                  <span>
                    Ask for a JSON export if the layout needs a longer-lived
                    handoff.
                  </span>
                </li>
              </ol>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/studio"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium transition-colors"
              >
                <ArrowRight className="size-4" />
                Open Studio
              </Link>
              <Link
                href="/"
                className="border-border/50 bg-muted/18 text-foreground hover:bg-muted/28 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-colors"
              >
                <RefreshCcw className="size-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
