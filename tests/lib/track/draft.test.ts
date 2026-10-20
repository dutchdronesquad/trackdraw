import { describe, expect, it } from "vitest";
import { validateTrackDraft } from "@/lib/track/draft";
import { parseDesign, serializeDesign } from "@/lib/track/design";
import { designToSvg } from "@/lib/export/exportSvg";
const inventory = {
  gate: 2,
  tower: 1,
  ladder: 1,
  divegate: 1,
  startfinish: 1,
  flag: 1,
  cone: 1,
  barrier: 1,
};
export const proposal = {
  version: 2,
  title: "30 × 20 track draft",
  constraints: { field: { width: 30, height: 20 }, inventory },
  shapes: [
    {
      id: "gate",
      kind: "gate",
      x: 10,
      y: 10,
      rotation: 0,
      width: 3,
      height: 2,
    },
  ],
};
describe("bounded track draft validation", () => {
  it("normalizes a separate v2 design and survives serialization and normal export", () => {
    const value = validateTrackDraft(proposal);
    expect(value.ok).toBe(true);
    if (!value.ok) throw Error();
    expect(value.design.version).toBe(2);
    expect(value.design.field.width).toBe(30);
    const restored = parseDesign(serializeDesign(value.design))!;
    expect(restored.shapeById.gate).toMatchObject({
      rotation: 0,
      width: 3,
      height: 2,
    });
    expect(designToSvg(restored)).toContain("<svg");
    expect(value.unvalidated).toContain("flight_safety");
  });
  it("uses canonical catalog dimensions and metadata instead of arbitrary client metadata", () => {
    const value = validateTrackDraft({
      ...proposal,
      shapes: [
        {
          id: "catalog",
          catalog_id: "multigp-standard-gate-5x5",
          x: 10,
          y: 10,
          rotation: 0,
        },
      ],
    });
    expect(value.ok).toBe(true);
    if (value.ok)
      expect(value.design.shapeById.catalog).toMatchObject({
        kind: "gate",
        width: expect.closeTo(1.524),
        meta: { catalog: { elementId: "multigp-standard-gate-5x5" } },
      });
    expect(
      validateTrackDraft({
        ...proposal,
        shapes: [{ ...proposal.shapes[0], meta: { secret: 1 } }],
      }).ok
    ).toBe(false);
  });
  it.each([
    { version: 1 },
    { shapes: [{ ...proposal.shapes[0], width: NaN }] },
    { shapes: [{ ...proposal.shapes[0], x: Infinity }] },
    { shapes: [{ ...proposal.shapes[0], kind: "unsupported" }] },
    { shapes: [proposal.shapes[0], proposal.shapes[0]] },
    { shapes: [{ ...proposal.shapes[0], x: 0.1 }] },
    { shapes: [{ ...proposal.shapes[0], rotation: 90, y: 0.1 }] },
    {
      constraints: {
        ...proposal.constraints,
        inventory: { ...inventory, gate: 0 },
      },
    },
    {
      shapes: Array.from({ length: 201 }, (_, i) => ({
        ...proposal.shapes[0],
        id: String(i),
      })),
    },
    { shapes: [{ id: "bad", catalog_id: "unknown", x: 10, y: 10 }] },
  ])(
    "rejects invalid or over-budget proposals without normalization hiding errors",
    (changes) => {
      const value = validateTrackDraft({ ...proposal, ...changes });
      expect(value.ok).toBe(false);
      if (!value.ok) expect(value.issues.length).toBeGreaterThan(0);
    }
  );
  it("counts tower and ladder assemblies, checks rotated footprints and offset smoothed routes", () => {
    const shapes = [
      {
        id: "tower",
        kind: "tower",
        x: 10,
        y: 10,
        rotation: 45,
        width: 2,
        height: 2,
        levels: 3,
      },
      {
        id: "ladder",
        kind: "ladder",
        x: 15,
        y: 10,
        width: 2,
        height: 2,
        rungs: 4,
      },
      {
        id: "dive",
        kind: "divegate",
        x: 20,
        y: 10,
        width: 2,
        elevation: 3,
        tilt: 90,
      },
      {
        id: "route",
        kind: "polyline",
        x: 1,
        y: 1,
        points: [
          { x: 3, y: 3 },
          { x: 10, y: 10 },
        ],
      },
    ];
    const value = validateTrackDraft({ ...proposal, shapes });
    expect(value.ok).toBe(true);
    if (value.ok)
      expect(value.required).toMatchObject({
        tower: 1,
        ladder: 1,
        divegate: 1,
        gate: 0,
      });
    const outside = validateTrackDraft({
      ...proposal,
      shapes: [{ ...shapes[3], x: 30 }],
    });
    expect(outside.ok).toBe(false);
    const over = validateTrackDraft({
      ...proposal,
      shapes,
      constraints: {
        ...proposal.constraints,
        inventory: { ...inventory, tower: 0 },
      },
    });
    expect(over.ok).toBe(false);
  });
  it("identifies invalid shape dimensions with an actionable field path", () => {
    const value = validateTrackDraft({
      ...proposal,
      shapes: [{ ...proposal.shapes[0], width: -1 }],
    });
    expect(value).toMatchObject({
      ok: false,
      issues: [{ path: "shapes.0.width", code: "too_small" }],
    });
  });
  it("accepts an empty track explicitly, rejects extraneous project IDs and non-positive fields", () => {
    expect(validateTrackDraft({ ...proposal, shapes: [] }).ok).toBe(true);
    expect(validateTrackDraft({ ...proposal, project_id: "existing" }).ok).toBe(
      false
    );
    expect(
      validateTrackDraft({
        ...proposal,
        constraints: {
          ...proposal.constraints,
          field: { width: 0, height: 20 },
        },
      }).ok
    ).toBe(false);
  });
});
