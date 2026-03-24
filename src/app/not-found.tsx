import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Compass, Home } from "lucide-react";

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

export default function NotFound() {
  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-brand-primary/12 absolute top-24 left-1/2 h-56 w-56 -translate-x-[140%] rounded-full blur-3xl" />
        <div className="bg-brand-secondary/12 absolute right-0 bottom-16 h-64 w-64 translate-x-1/4 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16 sm:px-8">
        <div className="w-full">
          <div className="mb-10 flex items-center justify-between gap-4">
            <TrackDrawLogo />
            <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase">
              <Compass className="size-3.5" />
              Error 404
            </div>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
                This page drifted off the course
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
                The page you requested does not exist, may have moved, or may
                have taken a wrong turn at the gate. The latest track or route
                should be close by.
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
                  <span>
                    Jump back to the studio and open the latest track.
                  </span>
                </li>
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    2.
                  </span>
                  <span>
                    Return home if you came here from an old bookmark.
                  </span>
                </li>
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    3.
                  </span>
                  <span>
                    Try the latest route again if the page moved recently.
                  </span>
                </li>
              </ol>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium transition-colors"
              >
                <Home className="size-4" />
                Go Home
              </Link>
              <Link
                href="/studio"
                className="border-border/50 bg-muted/18 text-foreground hover:bg-muted/28 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-colors"
              >
                <ArrowRight className="size-4" />
                Open Studio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
