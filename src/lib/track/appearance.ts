import {
  getAppearanceTemplate,
  type AppearanceReference,
} from "@trackdraw/schema/appearance/registry";
import type { Shape } from "@/lib/types";
import { getShapeTimingMarker } from "@/lib/track/timing";

const multigpStandard: AppearanceReference = {
  source: "registry",
  collectionId: "multigp",
  textureId: "standard-gate",
  templateId: "gate-standard-v1",
};
const multigpChampionship: AppearanceReference = {
  source: "registry",
  collectionId: "multigp",
  textureId: "championship-gate",
  templateId: "gate-championship-v1",
};

const multigpStandardRed: AppearanceReference = {
  ...multigpStandard,
  textureId: "standard-gate-red",
};
const multigpChampionshipRed: AppearanceReference = {
  ...multigpChampionship,
  textureId: "championship-gate-red",
};

/** Catalog artwork uses the same registry pipeline as a selected club artwork. */
export function getShapeArtworkReference(
  shape: Shape
): AppearanceReference | undefined {
  const template = getAppearanceTemplate(shape);
  if (!template) return undefined;
  if (shape.appearance?.templateId === template) return shape.appearance;
  const original =
    template === "gate-championship-v1" ? multigpChampionship : multigpStandard;
  return getShapeTimingMarker(shape)?.role === "start_finish"
    ? template === "gate-championship-v1"
      ? multigpChampionshipRed
      : multigpStandardRed
    : original;
}
