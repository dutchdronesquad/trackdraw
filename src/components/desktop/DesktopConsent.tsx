"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function DesktopConsent({
  request,
}: {
  request: { account: string; query: string };
}) {
  const t = useTranslations("login.desktopConsent");
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
    <main className="bg-background text-foreground grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { account: request.account })}
        </p>
        {failed && <p role="alert">{t("failed")}</p>}
        <div className="flex flex-wrap gap-3">
          <Button disabled={pending} onClick={() => void decide(true)}>
            {t("allow")}
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => void decide(false)}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    </main>
  );
}
