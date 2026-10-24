"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Plug } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { McpConnectionGuideLink } from "./connection-guide-link";

type Connection = {
  id: string;
  clientId: string;
  name: string | null;
  createdAt: string;
};

/** Shared by account settings and the standalone OAuth recovery destination. */
export function McpConnectionsContent({
  initialConnections,
}: {
  initialConnections?: Connection[];
}) {
  const t = useTranslations("login.mcp");
  const locale = useLocale();
  const [connections, setConnections] = useState(initialConnections ?? []);
  const [loading, setLoading] = useState(initialConnections === undefined);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialConnections !== undefined) return;
    const controller = new AbortController();
    void fetch("/api/account/mcp-connections", {
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as {
          connections: Connection[];
        };
        if (!Array.isArray(payload.connections)) throw new Error();
        if (!controller.signal.aborted) setConnections(payload.connections);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initialConnections, attempt]);

  async function disconnect(id: string) {
    if (pending) return;
    setPending(id);
    setError(false);
    try {
      const response = await fetch(
        `/api/account/mcp-connections/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error();
      setConnections((items) => items.filter((item) => item.id !== id));
      setConfirming(null);
    } catch {
      setError(true);
    } finally {
      setPending(null);
    }
  }

  if (loading)
    return (
      <p
        role="status"
        className="text-muted-foreground flex items-center gap-2 py-5 text-sm"
      >
        <LoaderCircle className="size-4 animate-spin" />
        {t("loadingConnections")}
      </p>
    );
  if (loadError)
    return (
      <div className="space-y-3 py-5">
        <p role="alert" className="text-destructive text-sm">
          {t("loadConnectionsFailed")}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setLoadError(false);
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );

  return (
    <div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {t("connectionsBody")}
      </p>
      {error && !confirming && (
        <p className="text-destructive mt-5 text-sm" role="alert">
          {t("disconnectFailed")}
        </p>
      )}
      {connections.length === 0 ? (
        <section className="flex flex-col items-center px-4 py-12 text-center">
          <div className="bg-muted text-muted-foreground mb-5 flex size-12 items-center justify-center rounded-2xl">
            <Plug className="size-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-medium">
            {t("emptyConnectionsTitle")}
          </h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
            {t("emptyConnectionsBody")}
          </p>
        </section>
      ) : (
        <ul className="divide-border/60 mt-6 divide-y">
          {connections.map((connection) => {
            const name = connection.name?.trim() || connection.clientId;
            const date = new Date(connection.createdAt);
            return (
              <li
                key={connection.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <ConfirmationDialog
                  open={confirming === connection.id}
                  onOpenChange={(open) => {
                    if (!open) {
                      setConfirming(null);
                      setError(false);
                    }
                  }}
                  title={t("disconnectConfirm", { app: name })}
                  description={t("disconnectWarning")}
                  confirmLabel={
                    pending === connection.id
                      ? t("disconnecting")
                      : t("disconnect")
                  }
                  busy={pending !== null}
                  error={error ? t("disconnectFailed") : null}
                  onConfirm={() => void disconnect(connection.id)}
                />
                <div className="flex min-w-0 items-start gap-3">
                  <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Plug className="size-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">{name}</p>
                    {!Number.isNaN(date.valueOf()) && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {t("connectedOn", {
                          date: new Intl.DateTimeFormat(locale, {
                            dateStyle: "medium",
                          }).format(date),
                        })}
                      </p>
                    )}
                    <details className="text-muted-foreground mt-2 text-xs">
                      <summary className="cursor-pointer">
                        {t("connectionDetails")}
                      </summary>
                      <p className="mt-2 break-all">
                        {t("clientId", { id: connection.clientId })}
                      </p>
                    </details>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  disabled={pending !== null}
                  onClick={() => {
                    setConfirming(connection.id);
                    setError(false);
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 h-9 shrink-0 self-start rounded-lg px-3 text-xs"
                  aria-label={`${t("disconnect")} ${name}`}
                >
                  {t("disconnect")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function McpConnections({
  initialConnections,
}: {
  initialConnections: Connection[];
}) {
  const t = useTranslations("login.mcp");
  return (
    <main className="bg-background text-foreground min-h-screen px-6 py-12">
      <section className="mx-auto max-w-xl">
        <Link
          href="/studio?dialog=account&section=connected-apps"
          prefetch={false}
          className="text-muted-foreground text-sm"
        >
          {t("backToStudio")}
        </Link>
        <h1 className="mt-8 mb-4 text-3xl font-semibold">
          {t("connectionsTitle")}
        </h1>
        <div className="mb-4">
          <McpConnectionGuideLink />
        </div>
        <McpConnectionsContent initialConnections={initialConnections} />
      </section>
    </main>
  );
}
