"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Check, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  getProductAnalyticsDisabled,
  getProductEventSessionId,
  setProductAnalyticsDisabled,
} from "@/lib/product-events";

export function ProductAnalyticsControl({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const t = useTranslations("common");
  const [enabled, setEnabled] = useState(() => !getProductAnalyticsDisabled());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/product-events/preference")
      .then(
        async (response) =>
          (await response.json()) as {
            enabled?: boolean;
            authenticated?: boolean;
          }
      )
      .then((payload) => {
        if (cancelled || !payload.authenticated) return;
        if (getProductAnalyticsDisabled()) {
          setEnabled(false);
          return;
        }
        const nextEnabled = payload.enabled !== false;
        setEnabled(nextEnabled);
        setProductAnalyticsDisabled(!nextEnabled);
      })
      .catch(() => {
        // The local preference remains authoritative for anonymous use.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePreference = async () => {
    const nextEnabled = !enabled;
    const sessionId = getProductEventSessionId();
    setSaving(true);
    setError(null);
    setEnabled(nextEnabled);
    setProductAnalyticsDisabled(!nextEnabled);

    try {
      const response = await fetch("/api/product-events/preference", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, sessionId }),
      });
      if (!response.ok) throw new Error("preference update failed");
    } catch {
      if (nextEnabled) {
        setEnabled(false);
        setProductAnalyticsDisabled(true);
      }
      setError(t("productAnalytics.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={cn(
        !embedded &&
          "border-border/50 bg-muted/18 rounded-2xl border p-5 sm:p-6"
      )}
    >
      {!embedded ? (
        <div className="flex items-start gap-3">
          <span className="bg-brand-primary/10 text-brand-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
            <BarChart3 className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-normal">
              {t("productAnalytics.title")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
              {t("productAnalytics.description")}
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center justify-between gap-5",
          !embedded && "border-border/50 mt-5 border-t pt-5"
        )}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {t("productAnalytics.preferenceTitle")}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                enabled
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              )}
              role="status"
            >
              {saving ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : enabled ? (
                <Check className="size-3" aria-hidden="true" />
              ) : null}
              {saving
                ? t("productAnalytics.saving")
                : enabled
                  ? t("status.on")
                  : t("status.off")}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 max-w-xl text-xs leading-5">
            {t("productAnalytics.preferenceDescription")}
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={() => void updatePreference()}
          disabled={saving}
          aria-label={t("productAnalytics.toggleLabel")}
          className="shrink-0"
        />
      </div>

      {error ? (
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive mt-4 rounded-lg border px-3 py-2 text-sm leading-5"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
