"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Connection = {
  id: string;
  clientId: string;
  name: string | null;
  createdAt: string;
};

export function McpConnections({
  initialConnections,
}: {
  initialConnections: Connection[];
}) {
  const t = useTranslations("login.mcp");
  const [connections, setConnections] = useState(initialConnections);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
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
    } catch {
      setError(true);
    } finally {
      setPending(null);
    }
  }
  return (
    <main className="bg-background text-foreground min-h-screen px-6 py-12">
      <section className="mx-auto max-w-xl">
        <Link
          href="/studio"
          prefetch={false}
          className="text-muted-foreground text-sm"
        >
          {t("backToStudio")}
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">{t("connectionsTitle")}</h1>
        <p className="text-muted-foreground mt-4 text-sm leading-6">
          {t("connectionsBody")}
        </p>
        {error && (
          <p className="text-destructive mt-5 text-sm" role="alert">
            {t("disconnectFailed")}
          </p>
        )}
        {connections.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm">{t("empty")}</p>
        ) : (
          <ul className="divide-border/60 mt-8 divide-y">
            {connections.map((connection) => (
              <li
                key={connection.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {connection.name ?? connection.clientId}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs break-all">
                    {t("clientId", { id: connection.clientId })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  disabled={pending !== null}
                  onClick={() => void disconnect(connection.id)}
                  className="shrink-0 self-start"
                >
                  {pending === connection.id
                    ? t("disconnecting")
                    : t("disconnect")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
