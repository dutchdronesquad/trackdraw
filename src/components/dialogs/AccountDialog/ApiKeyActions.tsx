"use client";

import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function ApiKeyActions({
  loading,
  onRefresh,
}: {
  loading: boolean;
  onRefresh: () => void;
}) {
  const t = useTranslations("dialogs.account.apiKeys.active");
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link
        href="/api/docs"
        prefetch={false}
        target="_blank"
        rel="noreferrer"
        className="text-brand-primary inline-flex items-center gap-1 text-xs hover:underline"
      >
        {t("docsLink")}
        <ExternalLink className="size-3" />
      </Link>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        aria-label={t("refreshAriaLabel")}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-lg disabled:opacity-50"
      >
        <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
      </button>
    </div>
  );
}
