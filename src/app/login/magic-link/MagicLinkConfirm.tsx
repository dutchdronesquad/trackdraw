"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  authClient,
  canAutoVerifyMagicLink,
  clearMagicLinkRequestMarker,
  type MagicLinkVerifyOptions,
} from "@/lib/auth-client";

function getVerifyOptions(
  searchParams: URLSearchParams
): MagicLinkVerifyOptions | null {
  const token = searchParams.get("token")?.trim();
  if (!token) return null;

  return {
    token,
    callbackURL: searchParams.get("callbackURL") ?? undefined,
    newUserCallbackURL: searchParams.get("newUserCallbackURL") ?? undefined,
    errorCallbackURL: searchParams.get("errorCallbackURL") ?? undefined,
  };
}

function getSafeRedirectPath(value: string | undefined) {
  if (typeof window === "undefined" || !value) {
    return "/studio";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) {
      return "/studio";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/studio";
  }
}

export function MagicLinkConfirm() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoVerifyAttempted = useRef(false);
  const verifyOptions = useMemo(
    () => getVerifyOptions(searchParams),
    [searchParams]
  );
  const canAutoVerify = useMemo(
    () => canAutoVerifyMagicLink(verifyOptions?.callbackURL ?? null),
    [verifyOptions?.callbackURL]
  );

  const handleContinue = useCallback(async () => {
    if (!verifyOptions || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await authClient.magicLink.verify(verifyOptions);
      if (response?.error) {
        throw new Error(
          response.error.message || response.error.code || "INVALID_TOKEN"
        );
      }

      clearMagicLinkRequestMarker();
      window.location.href = getSafeRedirectPath(verifyOptions.callbackURL);
    } catch (verifyError) {
      void verifyError;
      setError(t("magicLinkVerify.failed"));
      setPending(false);
    }
  }, [pending, t, verifyOptions]);

  useEffect(() => {
    if (!verifyOptions || !canAutoVerify || autoVerifyAttempted.current) {
      return;
    }

    autoVerifyAttempted.current = true;
    const timeout = window.setTimeout(() => {
      void handleContinue();
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [canAutoVerify, handleContinue, verifyOptions]);

  const readyToVerify = Boolean(verifyOptions);
  const isVerifying = pending || canAutoVerify;
  const showContinueButton = readyToVerify && !canAutoVerify;
  const title = !readyToVerify
    ? t("magicLinkVerify.invalidTitle")
    : isVerifying
      ? t("magicLinkVerify.autoTitle")
      : t("magicLinkVerify.title");
  const description = !readyToVerify
    ? t("magicLinkVerify.invalidDescription")
    : isVerifying
      ? t("magicLinkVerify.autoDescription")
      : t("magicLinkVerify.description");
  const statusItems = [
    {
      label: t("magicLinkVerify.statusEmail"),
      state: "done",
    },
    {
      label: t("magicLinkVerify.statusVerify"),
      state: isVerifying ? "active" : "idle",
    },
    {
      label: t("magicLinkVerify.statusStudio"),
      state: "idle",
    },
  ] as const;

  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div className="bg-brand-primary/10 absolute top-16 left-1/2 hidden h-72 w-72 -translate-x-[135%] rounded-full blur-3xl sm:block" />
      <div className="bg-brand-secondary/10 absolute right-0 bottom-10 hidden h-80 w-80 translate-x-1/4 rounded-full blur-3xl sm:block" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center rounded-sm opacity-90 transition-opacity hover:opacity-100"
            aria-label={t("goHome")}
          >
            <span className="relative block h-8 w-36 sm:h-9 sm:w-40">
              <Image
                src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="object-contain dark:hidden"
                draggable={false}
              />
              <Image
                src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                alt="TrackDraw"
                fill
                priority
                unoptimized
                className="hidden object-contain dark:block"
                draggable={false}
              />
            </span>
          </Link>

          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("magicLinkVerify.backToLogin")}
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <section className="border-border/70 bg-card/94 w-full max-w-lg overflow-hidden rounded-3xl border shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:rounded-[1.75rem]">
            <div className="border-border/55 bg-muted/18 border-b px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="bg-background text-foreground border-border/60 flex size-10 items-center justify-center rounded-2xl border">
                  {isVerifying ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : readyToVerify ? (
                    <MailCheck className="size-4" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                    {t("magicLinkVerify.eyebrow")}
                  </p>
                  <p className="text-sm font-medium">
                    {readyToVerify
                      ? t("magicLinkVerify.secureSession")
                      : t("magicLinkVerify.needsNewLink")}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">
                  {title}
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="border-border/60 bg-background/55 mt-6 rounded-2xl border px-4 py-4">
                <div className="space-y-3">
                  {statusItems.map((item, index) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span
                        className={
                          item.state === "done"
                            ? "bg-brand-primary flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                            : item.state === "active"
                              ? "border-brand-primary/45 text-brand-primary bg-brand-primary/8 flex size-7 shrink-0 items-center justify-center rounded-full border"
                              : "border-border bg-muted/40 text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full border"
                        }
                      >
                        {item.state === "done" ? (
                          <Check className="size-3.5" />
                        ) : item.state === "active" ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span className="text-[11px] font-semibold">
                            {index + 1}
                          </span>
                        )}
                      </span>
                      <span
                        className={
                          item.state === "idle"
                            ? "text-muted-foreground text-sm"
                            : "text-foreground text-sm font-medium"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {error ? (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300"
                >
                  {error}
                </div>
              ) : null}

              <div className="mt-7 space-y-3">
                {showContinueButton ? (
                  <Button
                    type="button"
                    className="h-11 w-full"
                    disabled={pending}
                    aria-busy={pending}
                    onClick={handleContinue}
                  >
                    <ArrowRight className="size-4" />
                    {pending
                      ? t("magicLinkVerify.continuing")
                      : t("magicLinkVerify.continue")}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  variant={readyToVerify ? "ghost" : "outline"}
                  className="h-11 w-full"
                  asChild
                >
                  <Link href="/login">
                    <MailCheck className="size-4" />
                    {t("magicLinkVerify.requestNewLink")}
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
