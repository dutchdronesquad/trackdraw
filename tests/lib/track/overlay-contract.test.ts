import { describe, expect, it } from "vitest";
import {
  buildTrackDrawOverlayContract,
  TRACKDRAW_OVERLAY_CONTRACT_SCHEMA,
  TRACKDRAW_OVERLAY_CONTRACT_VERSION,
} from "@/lib/track/overlay-contract";
import { normalizeDesign } from "@/lib/track/design";
import type { Shape, TrackDesign } from "@/lib/types";

const inventory = {
  gate: 0,
  ladder: 0,
  divegate: 0,
  startfinish: 0,
  flag: 0,
  cone: 0,
};

function makeDesign(shapes: Shape[]): TrackDesign {
  return normalizeDesign({
    id: "overlay-contract-test",
    version: 1,
    title: "Overlay contract test",
    description: "",
    tags: [],
    authorName: "",
    inventory,
    field: { width: 60, height: 40, origin: "tl", gridStep: 1, ppm: 20 },
    mapReference: {
      type: "map",
      provider: "esri-world-imagery",
      mapStyle: "satellite",
      centerLat: 52.1,
      centerLng: 5.2,
      zoom: 18,
      rotationDeg: 0,
      opacity: 0.35,
      visible: true,
      locked: true,
    },
    shapes,
    createdAt: "2026-04-28T10:00:00.000Z",
    updatedAt: "2026-04-28T10:00:00.000Z",
  });
}

const raceLine: Shape = {
  id: "line-1",
  kind: "polyline",
  x: 0,
  y: 0,
  rotation: 0,
  points: [
    { x: 0, y: 5, z: 1 },
    { x: 30, y: 5, z: 1 },
  ],
};

const startGate: Shape = {
  id: "start-1",
  kind: "gate",
  x: 5,
  y: 5,
  rotation: 0,
  width: 2,
  height: 2,
  meta: { timing: { role: "start_finish" } },
};

describe("TrackDraw overlay contract", () => {
  it("builds a versioned contract with serialized design and prep data", () => {
    const contract = buildTrackDrawOverlayContract(
      makeDesign([raceLine, startGate]),
      { generatedAt: "2026-04-28T12:00:00.000Z" }
    );

    expect(contract.schema).toBe(TRACKDRAW_OVERLAY_CONTRACT_SCHEMA);
    expect(contract.contractVersion).toBe(TRACKDRAW_OVERLAY_CONTRACT_VERSION);
    expect(contract.generatedAt).toBe("2026-04-28T12:00:00.000Z");
    expect(contract.coordinateSystem).toEqual({
      fieldOrigin: "tl",
      fieldUnits: "meters",
      routeDistanceUnits: "meters",
      routeProgressRange: "0..1",
    });
    expect(contract.design.shapes.map((shape) => shape.id)).toEqual([
      "line-1",
      "start-1",
    ]);
    expect(contract.design.mapReference).toBeNull();
    expect(contract.overlayPrep.status).toBe("ready");
    expect(contract.overlayPrep.raceRouteId).toBe("line-1");
  });

  it("can include map reference only when explicitly requested", () => {
    const contract = buildTrackDrawOverlayContract(
      makeDesign([raceLine, startGate]),
      {
        generatedAt: "2026-04-28T12:00:00.000Z",
        includeMapReference: true,
      }
    );

    expect(contract.design.mapReference?.type).toBe("map");
  });
});
