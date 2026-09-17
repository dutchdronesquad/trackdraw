import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ViewerSpikeClient } from "./ViewerSpikeClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("devTools.viewerSpike");

  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export default function ViewerSpikePage() {
  return <ViewerSpikeClient />;
}
