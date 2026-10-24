"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type IntegrationView = "connectedApps" | "apiKeys";

export function IntegrationNavigation({
  view,
  onViewChange,
}: {
  view: IntegrationView;
  onViewChange: (view: IntegrationView) => void;
}) {
  const t = useTranslations("dialogs.account");
  return (
    <nav
      aria-label={t("nav.integrations")}
      className="border-border/60 mb-6 flex gap-5 border-b"
    >
      {(["connectedApps", "apiKeys"] as const).map((id) => (
        <button
          key={id}
          type="button"
          aria-current={view === id ? "page" : undefined}
          onClick={() => onViewChange(id)}
          className={cn(
            "focus-visible:ring-ring -mb-px min-h-10 border-b-2 pb-3 text-sm transition-colors outline-none focus-visible:ring-2",
            view === id
              ? "border-foreground text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground border-transparent"
          )}
        >
          {t(`nav.${id}`)}
        </button>
      ))}
    </nav>
  );
}
