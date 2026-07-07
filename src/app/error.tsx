"use client";

import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.runtimeError");

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <div className="border-destructive/20 bg-destructive/8 mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
          <AlertTriangle className="size-3.5" />
          {t("badge")}
        </div>

        <div className="space-y-4">
          <h1 className="max-w-2xl text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-7 sm:text-base">
            {t("description")}
          </p>
        </div>

        <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium transition-colors"
          >
            <RotateCcw className="size-4" />
            {t("tryAgain")}
          </button>
          <Link
            href="/studio"
            className="border-border/50 bg-muted/18 text-foreground hover:bg-muted/28 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-colors"
          >
            <Home className="size-4" />
            {t("openStudio")}
          </Link>
        </div>

        <p className="text-muted-foreground/70 mt-6 max-w-xl text-xs leading-relaxed">
          {t("nextStep")}
        </p>
      </div>
    </main>
  );
}
