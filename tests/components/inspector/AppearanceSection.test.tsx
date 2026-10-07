// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppearanceSection } from "@/components/inspector/sections/AppearanceSection";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { getShapeArtworkReference } from "@/lib/track/appearance";
import type { GateShape } from "@/lib/types";
import { loadAppearance } from "@trackdraw/schema/appearance/registry";

vi.mock("@trackdraw/schema/appearance/registry", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@trackdraw/schema/appearance/registry")
  >()),
  loadAppearance: vi.fn(async () => undefined),
  discoverAppearances: vi.fn(async () => [
    {
      reference: {
        source: "registry",
        collectionId: "multigp",
        textureId: "standard-gate",
        templateId: "gate-standard-v1",
      },
      collectionName: "MultiGP",
      name: "Standard gate",
    },
    {
      reference: {
        source: "registry",
        collectionId: "dds",
        textureId: "standard-gate",
        templateId: "gate-standard-v1",
      },
      collectionName: "DDS",
      name: "Standard gate",
    },
  ]),
}));
function gate(): GateShape {
  return {
    ...createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }),
    id: "gate",
  } as GateShape;
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("loads MultiGP by default and offers only concrete artwork choices", async () => {
  const user = userEvent.setup();
  const updateShape = vi.fn();
  render(<AppearanceSection shape={gate()} updateShape={updateShape} />);
  expect(await screen.findByText("MultiGP · Standard gate")).toBeTruthy();
  expect(loadAppearance).toHaveBeenCalledWith(getShapeArtworkReference(gate()));
  await user.click(screen.getByRole("combobox"));
  expect(screen.getAllByRole("option")).toHaveLength(2);
  expect(screen.queryByText(/original artwork|default artwork/i)).toBeNull();
  await user.click(screen.getByRole("option", { name: "DDS · Standard gate" }));
  expect(updateShape).toHaveBeenCalledWith("gate", {
    appearance: {
      source: "registry",
      collectionId: "dds",
      textureId: "standard-gate",
      templateId: "gate-standard-v1",
    },
  });
});
it("uses the red MultiGP asset for start/finish and respects explicit artwork", () => {
  const shape = gate();
  shape.meta = { ...shape.meta, timing: { role: "start_finish" } };
  expect(getShapeArtworkReference(shape)?.textureId).toBe("standard-gate-red");
  shape.appearance = {
    source: "registry",
    collectionId: "dds",
    textureId: "standard-gate",
    templateId: "gate-standard-v1",
  };
  expect(getShapeArtworkReference(shape)).toEqual(shape.appearance);
});
