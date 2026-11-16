import { createBeachflag } from "@/lib/track/beachflag";
import { getFlagVisualSpec } from "@/lib/track/elements/visual";
import type { FlagShape } from "@/lib/types";
import { loadTexture } from "./shared";

export function addFlagSceneShapes(shape: FlagShape) {
  const visual = getFlagVisualSpec(shape);
  const model = createBeachflag({
    id: shape.id,
    height: shape.poleHeight ?? 3.5,
    color: shape.color ?? "#a855f7",
    poleColor: visual?.poleColor,
  });
  model.group.position.set(shape.x, 0, shape.y);
  model.group.rotation.y = (-shape.rotation * Math.PI) / 180;
  return {
    ...model,
    async loadArtwork() {
      if (!visual) return;
      const textures = await Promise.all([
        loadTexture(visual.textures.front),
        loadTexture(visual.textures.back),
      ]).then(
        ([front, back]) => ({ front, back }),
        () => null
      );
      model.setTextures(textures);
    },
  };
}
