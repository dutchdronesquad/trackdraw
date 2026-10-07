// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { AppearanceSection } from "@/components/inspector/sections/AppearanceSection";
import {
  createCatalogShapeDraft,
  MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID,
  MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID,
} from "@/lib/track/elements/catalog";
import { getShapeArtworkReference } from "@/lib/track/appearance";
import type { GateShape } from "@/lib/types";

const { dds, load } = vi.hoisted(() => ({
  dds: {
    source: "registry",
    collectionId: "dds",
    textureId: "standard-gate",
    templateId: "gate-standard-v1",
  },
  load: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@trackdraw/schema/appearance/registry", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@trackdraw/schema/appearance/registry")
  >()),
  discoverAppearances: vi.fn().mockResolvedValue([
    {
      reference: dds,
      collectionName: "Dutch Drone Squad",
      name: "Standard Gate",
    },
    {
      reference: { ...dds, collectionId: "multigp" },
      collectionName: "MultiGP",
      name: "Standard Gate",
    },
    {
      reference: {
        ...dds,
        collectionId: "multigp",
        textureId: "standard-gate-red",
      },
      collectionName: "MultiGP",
      name: "Standard Gate Red",
    },
    {
      reference: {
        ...dds,
        textureId: "championship-gate",
        templateId: "gate-championship-v1",
      },
      collectionName: "DDS Championship",
      name: "Championship",
    },
    {
      reference: {
        ...dds,
        collectionId: "multigp",
        textureId: "championship-gate",
        templateId: "gate-championship-v1",
      },
      collectionName: "MultiGP",
      name: "Championship",
    },
    {
      reference: {
        ...dds,
        collectionId: "multigp",
        textureId: "championship-gate-red",
        templateId: "gate-championship-v1",
      },
      collectionName: "MultiGP",
      name: "Championship red",
    },
  ]),
  loadAppearance: load,
}));
vi.mock("@/hooks/useShapeAppearance", () => ({
  useShapeAppearance: () => ({
    collectionName: "Dutch Drone Squad",
    panels: { top: "/assets/registry/dds/standard-gate.webp" },
    attribution: "Artwork by DDS (https://example.com/artwork).",
  }),
}));
function gate(id: string, extra: Partial<GateShape> = {}): GateShape {
  return {
    ...createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }),
    id,
    ...extra,
  } as GateShape;
}
afterEach(cleanup);

it("applies artwork only to compatible unlocked items and shows concise choices", async () => {
  const user = userEvent.setup();
  const updateShapes = vi.fn();
  render(
    <AppearanceSection
      shapes={[
        gate("one"),
        gate("two"),
        gate("locked", { locked: true }),
        { ...gate("custom"), meta: undefined },
      ]}
      updateShapes={updateShapes}
    />
  );
  await waitFor(() =>
    expect(screen.getByRole("link", { name: "Dutch Drone Squad" })).toBeTruthy()
  );
  await user.click(screen.getByRole("button", { name: "Artwork credits" }));
  expect(screen.getByText("Artwork by DDS")).toBeTruthy();
  await user.keyboard("{Escape}");
  expect(
    screen.getByRole("link", { name: "Dutch Drone Squad" }).getAttribute("href")
  ).toBe("https://example.com/artwork");
  await user.click(screen.getByRole("combobox"));
  expect(screen.queryByRole("option", { name: /Standard Gate/ })).toBeNull();
  await user.click(screen.getByRole("option", { name: "Dutch Drone Squad" }));
  expect(updateShapes).toHaveBeenCalledWith(["one", "two"], {
    appearance: dds,
  });
});

it("shows mixed artwork and resets all compatible selections to Race Timing artwork", async () => {
  const user = userEvent.setup();
  const updateShapes = vi.fn();
  render(
    <AppearanceSection
      shapes={[gate("one", { appearance: dds }), gate("two")]}
      updateShapes={updateShapes}
    />
  );
  expect(screen.getByRole("combobox").textContent).toContain("Mixed artwork");
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name: "MultiGP" }));
  expect(updateShapes).toHaveBeenCalledWith(["one", "two"], {
    appearance: undefined,
  });
});

it("disables artwork changes when all compatible items are locked", () => {
  render(
    <AppearanceSection
      shapes={[gate("one", { locked: true }), gate("two", { locked: true })]}
      updateShapes={vi.fn()}
    />
  );
  expect(screen.getByRole("combobox").hasAttribute("disabled")).toBe(true);
});

it("supports single-item artwork changes", async () => {
  const user = userEvent.setup();
  const updateShape = vi.fn();
  render(<AppearanceSection shape={gate("one")} updateShape={updateShape} />);
  await user.click(screen.getByRole("combobox"));
  await user.click(
    await screen.findByRole("option", { name: "Dutch Drone Squad" })
  );
  expect(updateShape).toHaveBeenCalledWith("one", { appearance: dds });
});

it("uses red MultiGP artwork for start/finish and respects club artwork", () => {
  const shape = gate("one");
  shape.meta = { ...shape.meta, timing: { role: "start_finish" } };
  expect(getShapeArtworkReference(shape)?.textureId).toBe("standard-gate-red");
  shape.appearance = dds;
  expect(getShapeArtworkReference(shape)).toEqual(dds);
});

it("does not offer incompatible artwork for a 7x6 gate, including older saved selections", async () => {
  const shape = {
    ...createCatalogShapeDraft(MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }),
    id: "championship",
    appearance: dds,
  } as GateShape;
  render(<AppearanceSection shape={shape} updateShape={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole("combobox"));
  expect(
    screen.queryByRole("option", { name: "Dutch Drone Squad" })
  ).toBeNull();
});

it("offers Championship artwork and keeps mixed gate sizes compatible", async () => {
  const championship = {
    ...createCatalogShapeDraft(MULTIGP_CHAMPIONSHIP_GATE_7X6_ELEMENT_ID, {
      x: 0,
      y: 0,
      includeCatalogMetadata: true,
    }),
    id: "championship",
  } as GateShape;
  const updateShapes = vi.fn();
  render(
    <AppearanceSection
      shapes={[championship, gate("standard")]}
      updateShapes={updateShapes}
    />
  );
  await userEvent.setup().click(screen.getByRole("combobox"));
  expect(
    screen.queryByRole("option", { name: "Dutch Drone Squad" })
  ).toBeNull();
  expect(screen.getAllByRole("option", { name: "MultiGP" })).toHaveLength(1);
  await userEvent
    .setup()
    .click(await screen.findByRole("option", { name: "DDS Championship" }));
  expect(updateShapes).toHaveBeenCalledWith(["championship"], {
    appearance: {
      ...dds,
      textureId: "championship-gate",
      templateId: "gate-championship-v1",
    },
  });
});
