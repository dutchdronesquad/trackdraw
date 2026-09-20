"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { buildMultiOrgDesign, buildSecondDesign } from "./fixtures";

const TrackViewer = dynamic(
  () =>
    import("@trackdraw/viewer").then((mod) => ({ default: mod.TrackViewer })),
  { ssr: false }
);

const ASSET_PREFIX_BASE = "/dev/viewer-spike/assets-prefix-demo";

export function ViewerSpikeClient() {
  const t = useTranslations("devTools.viewerSpike");
  const [simulateNoWebgl, setSimulateNoWebgl] = useState(false);
  const designA = useMemo(() => buildMultiOrgDesign(), []);
  const designB = useMemo(() => buildSecondDesign(), []);

  return (
    <div className="bg-background text-foreground min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">{t("heading")}</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">
            {t("intro")}
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simulateNoWebgl}
              onChange={(event) => setSimulateNoWebgl(event.target.checked)}
            />
            {t("simulateNoWebgl")}
          </label>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-medium">{t("instanceAHeading")}</h2>
            <div className="border-border h-[420px] overflow-hidden rounded-md border">
              <TrackViewer
                design={designA}
                theme="light"
                unitSystem="imperial"
                showObstacleNumbers
                forceWebglUnsupported={simulateNoWebgl}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">{t("instanceBHeading")}</h2>
            <div className="border-border h-[420px] overflow-hidden rounded-md border">
              <TrackViewer design={designB} theme="dark" unitSystem="metric" />
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium">
            {t("instanceCHeading", { prefix: ASSET_PREFIX_BASE })}
          </h2>
          <p className="text-muted-foreground max-w-3xl text-xs">
            {t("instanceCDescription", { prefix: ASSET_PREFIX_BASE })}
          </p>
          <div className="border-border h-[420px] overflow-hidden rounded-md border">
            <TrackViewer
              design={designA}
              theme="light"
              assetsBaseUrl={ASSET_PREFIX_BASE}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
