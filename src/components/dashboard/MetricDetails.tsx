"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

export function MetricDetails({
  children,
  summary,
}: {
  children: ReactNode;
  summary?: ReactNode;
}) {
  const t = useTranslations("dashboard.metrics");
  return (
    <details className="text-muted-foreground text-xs">
      <summary className="w-fit cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
        {summary ?? t("aboutNumbers")}
      </summary>
      <div className="mt-2 max-w-3xl space-y-2 leading-relaxed">{children}</div>
    </details>
  );
}
