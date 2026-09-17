import type { Metadata } from "next";
import { ViewerSpikeClient } from "./ViewerSpikeClient";

export const metadata: Metadata = {
  title: "Viewer extraction spike",
  robots: { index: false, follow: false },
};

export default function ViewerSpikePage() {
  return <ViewerSpikeClient />;
}
