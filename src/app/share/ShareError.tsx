import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileJson, Unlink } from "lucide-react";
import { getTranslations } from "next-intl/server";

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

export default async function ShareError() {
  const t = await getTranslations("share");

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
              <Unlink className="size-3.5" />
              {t("badge")}
            </div>
          </div>

          <div className="space-y-8">
            <div className="max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
                {t("error.heading")}
              </h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
                {t("error.description")}
              </p>
            </div>

            <div className="max-w-4xl">
              <p className="text-muted-foreground/70 mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                {t("error.whatToDo")}
              </p>
              <ol className="text-muted-foreground text-sm leading-relaxed">
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    1.
                  </span>
                  <span>
                    {t.rich("error.step1", {
                      strong: (chunks) => (
                        <strong className="text-foreground/80 font-semibold">
                          {chunks}
                        </strong>
                      ),
                    })}
                  </span>
                </li>
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    2.
                  </span>
                  <span>
                    {t.rich("error.step2", {
                      strong: (chunks) => (
                        <strong className="text-foreground/80 font-semibold">
                          {chunks}
                        </strong>
                      ),
                    })}
                  </span>
                </li>
                <li className="flex gap-3 py-2">
                  <span className="text-foreground/70 min-w-4 font-semibold tabular-nums">
                    3.
                  </span>
                  <span>{t("error.step3")}</span>
                </li>
              </ol>
            </div>

            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/studio"
                className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors"
              >
                <FileJson className="size-4" />
                {t("error.openStudioToImport")}
              </Link>
              <Link
                href="/"
                className="border-border/50 bg-muted/18 text-foreground hover:bg-muted/28 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-5 text-sm font-medium transition-colors"
              >
                <ArrowRight className="size-4" />
                {t("backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
