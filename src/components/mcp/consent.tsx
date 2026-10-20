"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Box,
  ChevronDown,
  ContactRound,
  LockKeyhole,
  Network,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ConsentRequest = {
  query: string;
  clientId: string;
  clientName: string;
  callbackHost: string;
  account: string;
  offlineAccess: boolean;
  projectReadAccess?: boolean;
  projectCreateAccess?: boolean;
};

export function McpConsent({ request }: { request: ConsentRequest }) {
  const t = useTranslations("login.mcp");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function decide(accept: boolean) {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept, oauth_query: request.query }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("url" in result) ||
        typeof result.url !== "string"
      )
        throw new Error();
      window.location.assign(result.url);
    } catch {
      setPending(false);
      setError(true);
    }
  }

  return (
    <main className="bg-background text-foreground relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-brand-primary/10 absolute top-16 left-1/2 hidden h-72 w-72 -translate-x-[135%] rounded-full blur-3xl sm:block"
      />
      <div
        aria-hidden="true"
        className="bg-brand-secondary/10 absolute right-0 bottom-10 hidden h-80 w-80 translate-x-1/4 rounded-full blur-3xl sm:block"
      />
      <div className="relative mx-auto flex min-h-screen max-w-[1440px] flex-col px-6 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            prefetch={false}
            className="rounded-sm opacity-90 transition-opacity hover:opacity-100"
            aria-label={t("brand")}
          >
            <span className="relative block h-8 w-36 sm:h-9 sm:w-40">
              <Image
                src="/assets/brand/trackdraw-logo-mono-lightbg.svg"
                alt={t("brand")}
                fill
                priority
                unoptimized
                className="object-contain dark:hidden"
                draggable={false}
              />
              <Image
                src="/assets/brand/trackdraw-logo-mono-darkbg.svg"
                alt={t("brand")}
                fill
                priority
                unoptimized
                className="hidden object-contain dark:block"
                draggable={false}
              />
            </span>
          </Link>
          <Link
            href="/studio"
            prefetch={false}
            className="text-muted-foreground hover:text-foreground shrink-0 text-sm transition-colors"
          >
            {t("backToStudio")}
          </Link>
        </header>
        <div className="grid flex-1 items-center gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
          <section className="min-w-0">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="mt-4 max-w-lg text-4xl leading-[1.03] font-semibold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-sm leading-7 sm:text-base">
              {t("introduction", { app: request.clientName })}
            </p>
            <ul className="mt-12 hidden space-y-8 lg:block">
              {[
                {
                  icon: UserRound,
                  title: "contextTitle",
                  body: "contextBody",
                  color: "text-brand-primary bg-brand-primary/5",
                },
                {
                  icon: ShieldCheck,
                  title: request.projectCreateAccess
                    ? "createPermissionTitle"
                    : "readOnlyTitle",
                  body: request.projectCreateAccess
                    ? "createPermission"
                    : request.projectReadAccess
                      ? "projectPermission"
                      : "readPermission",
                  color: "text-brand-secondary bg-brand-secondary/5",
                },
                {
                  icon: LockKeyhole,
                  title: request.projectCreateAccess
                    ? "createBoundaryTitle"
                    : request.projectReadAccess
                      ? "noWriteTitle"
                      : "privateTitle",
                  body: request.projectCreateAccess
                    ? "createBoundary"
                    : request.projectReadAccess
                      ? "noWriteAccess"
                      : "noProjectAccess",
                  color: "text-muted-foreground bg-muted/50",
                },
              ].map(({ icon: Icon, title, body, color }) => (
                <li key={title} className="flex items-start gap-6">
                  <span
                    className={`flex size-16 shrink-0 items-center justify-center rounded-xl ${color}`}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium">{t(title)}</p>
                    <p className="text-muted-foreground mt-1 text-base leading-6">
                      {t(body)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section
            aria-labelledby="requesting-app"
            className="border-border/70 bg-card/92 min-w-0 rounded-3xl border p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8"
          >
            <div className="flex items-center gap-4 pb-6">
              <span className="bg-brand-primary/5 text-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl sm:size-24">
                <Box className="size-8 sm:size-10" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2
                  id="requesting-app"
                  className="text-xl font-semibold tracking-tight break-words sm:text-2xl"
                >
                  {request.clientName}
                </h2>
                <p className="text-muted-foreground mt-1 text-base leading-6">
                  {t("requestBody")}
                </p>
              </div>
            </div>
            <div className="border-border/60 flex items-center gap-4 border-y py-5">
              <span className="bg-muted/60 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full">
                <UserRound className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 text-sm sm:text-base">
                <p className="text-muted-foreground">{t("signedInAs")}</p>
                <p className="mt-0.5 font-medium break-all">
                  {request.account}
                </p>
              </div>
            </div>
            <ul className="space-y-5 py-6">
              {[
                {
                  icon: ContactRound,
                  title: "accountIdTitle",
                  body: "accountIdBody",
                },
                {
                  icon: UserRound,
                  title: "displayNameTitle",
                  body: "displayNameBody",
                },
                {
                  icon: Network,
                  title: "capabilitiesTitle",
                  body: "capabilitiesBody",
                },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="bg-brand-primary/5 text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-full sm:size-12">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 text-sm sm:text-base">
                    <p className="font-medium">{t(title)}</p>
                    <p className="text-muted-foreground mt-1 leading-5 sm:leading-6">
                      {t(body)}
                    </p>
                  </div>
                </li>
              ))}
              {request.projectReadAccess && (
                <li className="border-border/60 flex items-start gap-4 border-t pt-5">
                  <span className="bg-brand-primary/5 text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-full sm:size-12">
                    <ContactRound className="size-5" aria-hidden="true" />
                  </span>
                  <div className="text-sm sm:text-base">
                    <p className="font-medium">{t("projectPermissionTitle")}</p>
                    <p className="text-muted-foreground mt-1 leading-5 sm:leading-6">
                      {t("projectPermission")}
                    </p>
                  </div>
                </li>
              )}
              {request.projectCreateAccess && (
                <li className="border-border/60 flex items-start gap-4 border-t pt-5">
                  <span className="bg-brand-primary/5 text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-full sm:size-12">
                    <Box className="size-5" aria-hidden="true" />
                  </span>
                  <div className="text-sm sm:text-base">
                    <p className="font-medium">{t("createPermissionTitle")}</p>
                    <p className="text-muted-foreground mt-1 leading-5 sm:leading-6">
                      {t("createPermission")}
                    </p>
                    <p className="text-muted-foreground mt-1 leading-5 sm:leading-6">
                      {t("createBoundary")}
                    </p>
                  </div>
                </li>
              )}
              {request.offlineAccess && (
                <li className="border-border/60 flex items-start gap-4 border-t pt-5">
                  <span className="flex size-9 shrink-0 items-center justify-center sm:size-12">
                    <LockKeyhole className="size-5" aria-hidden="true" />
                  </span>
                  <div className="text-sm sm:text-base">
                    <p className="font-medium">{t("offlineTitle")}</p>
                    <p className="text-muted-foreground mt-1 leading-5 sm:leading-6">
                      {t("offlinePermission")}
                    </p>
                  </div>
                </li>
              )}
            </ul>
            <p className="text-muted-foreground pb-5 text-xs leading-5 lg:hidden">
              {t(
                request.projectCreateAccess
                  ? "createBoundary"
                  : request.projectReadAccess
                    ? "noWriteAccess"
                    : "noProjectAccess"
              )}
            </p>
            <details className="group border-border/60 border-t py-4 text-sm">
              <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-3 rounded-sm transition-colors">
                <ChevronDown
                  className="size-4 shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
                {t("connectionDetails")}
              </summary>
              <div className="text-muted-foreground space-y-2 pt-3 pl-7 text-xs leading-5 break-all">
                <p>{t("callback", { host: request.callbackHost })}</p>
                <p>{t("clientId", { id: request.clientId })}</p>
              </div>
            </details>
            <p className="text-muted-foreground text-xs leading-5">
              {t("trust")}
            </p>
            {error && (
              <p role="alert" className="text-destructive mt-4 text-sm">
                {t("failed")}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/mcp/connections"
                prefetch={false}
                className="text-muted-foreground hover:text-foreground order-last text-xs underline underline-offset-4 sm:order-first"
              >
                {t("manage")}
              </Link>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  className="min-h-11"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => void decide(false)}
                >
                  {t("deny")}
                </Button>
                <Button
                  className="min-h-11"
                  disabled={pending}
                  aria-busy={pending}
                  onClick={() => void decide(true)}
                >
                  {pending ? t("connecting") : t("allow")}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
