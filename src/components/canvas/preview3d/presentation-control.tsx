"use client";

import { useTranslations } from "next-intl";
import { usePresentationStore } from "@/store/presentation";

export function PresentationControl() {
  const t = useTranslations("editor.preview3dOverlay");
  const mode = usePresentationStore((state) => state.mode);
  const setMode = usePresentationStore((state) => state.setMode);
  return (
    <select
      aria-label={t("presentation")}
      value={mode}
      onChange={(event) => {
        const selection = event.currentTarget.value;
        if (
          selection === "design" ||
          selection === "outdoor" ||
          selection === "outdoor-low"
        ) {
          setMode(selection);
        }
      }}
      className="absolute top-3 left-3 z-20 min-h-9 max-w-[60%] rounded-md border border-white/20 bg-slate-950/80 px-2 text-xs text-white shadow-sm focus-visible:outline-2 focus-visible:outline-sky-300"
    >
      <option value="design">{t("designScene")}</option>
      <option value="outdoor">{t("outdoorScene")}</option>
      <option value="outdoor-low">{t("outdoorSceneLow")}</option>
    </select>
  );
}
