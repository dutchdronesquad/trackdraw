"use client";

import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/spinner";
import { TrackDrawLogo } from "./SharePageStatus";

export default function ShareViewerLoading() {
  const t = useTranslations("share.viewer");

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background flex h-dvh flex-col items-center justify-center gap-4"
    >
      <TrackDrawLogo />
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner aria-hidden="true" role="presentation" />
        <span>{t("loading")}</span>
      </div>
    </div>
  );
}
