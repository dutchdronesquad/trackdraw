"use client";

import { CircleUserRound } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { Button } from "@/components/ui/button";

export function DesktopConsent({
  request,
}: {
  request: { account: string; query: string };
}) {
  const t = useTranslations("login.desktopConsent");
  const login = useTranslations("login");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function decide(accept: boolean) {
    setPending(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept, oauth_query: request.query }),
      });
      const result: { url?: string } = await response.json();
      if (!response.ok || !result.url) throw new Error();
      window.location.assign(result.url);
    } catch {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <AuthPageFrame homeLabel={login("goHome")}>
      <div className="max-w-xl lg:self-start lg:pt-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-4 text-sm leading-7 sm:text-base">
          {t("intro")}
        </p>
      </div>

      <section className="border-border/70 bg-card/92 min-w-0 rounded-3xl border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("accountTitle")}
        </h2>
        <div className="border-border/60 bg-background/55 mt-6 flex items-center gap-3 rounded-xl border px-3.5 py-3">
          <CircleUserRound
            aria-hidden="true"
            className="text-muted-foreground size-8 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm">{t("signedInAs")}</p>
            <p className="font-medium wrap-anywhere">{request.account}</p>
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          {t("permission")}
        </p>
        {failed && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {t("failed")}
          </p>
        )}
        <div className="mt-6 grid gap-3" aria-busy={pending}>
          <Button
            className="h-11 rounded-xl"
            disabled={pending}
            onClick={() => void decide(true)}
          >
            {t("allow")}
          </Button>
          <Button
            className="h-11 rounded-xl"
            variant="outline"
            disabled={pending}
            onClick={() => void decide(false)}
          >
            {t("cancel")}
          </Button>
        </div>
        <p
          role="status"
          className="text-muted-foreground mt-4 text-center text-sm"
        >
          {pending ? t("pending") : t("returnToDesktop")}
        </p>
      </section>
    </AuthPageFrame>
  );
}
