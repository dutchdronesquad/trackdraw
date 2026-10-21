"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

export function McpConnectionGuideLink() {
  const t = useTranslations("login.mcp");
  return (
    <a
      href="https://github.com/dutchdronesquad/trackdraw/blob/main/docs/mcp.md#quick-start"
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-primary inline-flex items-center gap-1 text-xs hover:underline"
    >
      {t("setupGuide")}
      <ExternalLink className="size-3" aria-hidden="true" />
    </a>
  );
}
