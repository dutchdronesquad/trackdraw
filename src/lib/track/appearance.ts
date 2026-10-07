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
const multigpStartFinish: AppearanceReference = {
  ...multigpStandard,
  textureId: "standard-gate-red",
};

/** Catalog artwork uses the same registry pipeline as a selected club artwork. */
export function getShapeArtworkReference(
  shape: Shape
): AppearanceReference | undefined {
  if (shape.appearance) return shape.appearance;
  if (!getAppearanceTemplate(shape)) return undefined;
  return getShapeTimingMarker(shape)?.role === "start_finish"
    ? multigpStartFinish
    : multigpStandard;
}
