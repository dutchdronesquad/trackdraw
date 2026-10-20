import { z } from "zod";
import { createDefaultDesign, normalizeDesign } from "./design";
import {
  createCatalogShapeDraft,
  getTrackElementCatalogEntry,
} from "./elements/catalog";
import { getShapeLocalBounds } from "@/components/canvas/renderers/shape-bounds";
import type { Shape } from "@/lib/types";

const id = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const length = z.number().positive().max(1000);
const coordinate = z.number().min(-1000).max(1000);
const position = {
  id,
  x: coordinate,
  y: coordinate,
  rotation: z.number().min(-360).max(360).default(0),
  name: z.string().trim().max(100).optional(),
};
const elevated = { elevation: z.number().min(0).max(100).optional() };
const dimensions = { width: length, height: length };
export const draftShapeSchema = z.union([
  z.strictObject({ ...position, catalog_id: z.string().min(1).max(100) }),
  z.strictObject({
    ...position,
    kind: z.literal("gate"),
    ...dimensions,
    thick: length.optional(),
  }),
  z.strictObject({
    ...position,
    kind: z.literal("tower"),
    ...dimensions,
    ...elevated,
    levels: z.number().int().min(1).max(4).default(1),
    thick: length.optional(),
  }),
  z.strictObject({
    ...position,
    kind: z.literal("ladder"),
    ...dimensions,
    ...elevated,
    rungs: z.number().int().min(1).max(20),
  }),
  z.strictObject({
    ...position,
    kind: z.literal("divegate"),
    width: length,
    height: length.optional(),
    ...elevated,
    tilt: z.number().min(0).max(90).optional(),
    thick: length.optional(),
  }),
  z.strictObject({
    ...position,
    kind: z.literal("flag"),
    radius: length,
    poleHeight: length.optional(),
  }),
  z.strictObject({ ...position, kind: z.literal("cone"), radius: length }),
  z.strictObject({
    ...position,
    kind: z.literal("startfinish"),
    width: length,
  }),
  z.strictObject({
    ...position,
    kind: z.literal("barrier"),
    variant: z.enum(["hurdle", "banner", "fence", "net"]),
    ...dimensions,
  }),
  z.strictObject({
    ...position,
    kind: z.literal("label"),
    text: z.string().max(100),
    fontSize: z.number().min(8).max(100).optional(),
  }),
  z.strictObject({
    ...position,
    kind: z.literal("polyline"),
    rotation: z.literal(0).default(0),
    points: z
      .array(
        z.strictObject({
          x: coordinate,
          y: coordinate,
          z: z.number().min(0).max(100).optional(),
        })
      )
      .min(2)
      .max(200),
    closed: z.boolean().optional(),
  }),
]);
const quantity = z.number().int().min(0).max(200);
export const draftInventorySchema = z.strictObject({
  gate: quantity,
  tower: quantity,
  ladder: quantity,
  divegate: quantity,
  startfinish: quantity,
  flag: quantity,
  cone: quantity,
  barrier: quantity,
});
export const draftProposalSchema = z.strictObject({
  version: z.literal(2),
  title: z.string().trim().min(1).max(100),
  constraints: z.strictObject({
    field: z.strictObject({ width: length, height: length }),
    inventory: draftInventorySchema,
  }),
  shapes: z.array(draftShapeSchema).max(200),
});
export type DraftProposal = z.infer<typeof draftProposalSchema>;
export const DRAFT_UNVALIDATED_CONSTRAINTS = [
  "flight_safety",
  "obstacle_clearance_and_collisions",
  "terrain_and_real_world_measurements",
  "anchors_and_component_stock",
  "catalog_variant_stock",
  "label_text_extents",
  "3d_clearance",
];
export type DraftIssue = { path: string; code: string; message: string };
export function validateTrackDraft(input: unknown) {
  const parsed = draftProposalSchema.safeParse(input);
  if (!parsed.success) {
    const actionable = (issues: readonly z.core.$ZodIssue[]): DraftIssue[] =>
      issues.flatMap((issue) => {
        if (issue.code === "invalid_union") {
          const closest = issue.errors.reduce((best, candidate) =>
            candidate.length < best.length ? candidate : best
          );
          return actionable(closest);
        }
        return [
          {
            path: issue.path.join("."),
            code: issue.code,
            message: issue.message,
          },
        ];
      });
    return {
      ok: false as const,
      issues: actionable(parsed.error.issues).slice(0, 20),
    };
  }
  const proposal = parsed.data;
  const issues: DraftIssue[] = [];
  const seen = new Set<string>();
  const shapes: Shape[] = [];
  for (const [index, candidate] of proposal.shapes.entries()) {
    const path = `shapes.${index}`;
    if (seen.has(candidate.id))
      issues.push({
        path: path + ".id",
        code: "duplicate_id",
        message: "Each shape must have a unique ID.",
      });
    seen.add(candidate.id);
    if ("catalog_id" in candidate) {
      const entry = getTrackElementCatalogEntry(candidate.catalog_id);
      if (!entry || entry.kind === "label") {
        issues.push({
          path: path + ".catalog_id",
          code: "unknown_catalog_item",
          message:
            "Use a physical catalog ID from get_track_catalog; use kind: label for text.",
        });
        continue;
      }
      shapes.push({
        ...createCatalogShapeDraft(entry.id, {
          x: candidate.x,
          y: candidate.y,
          rotation: candidate.rotation,
          includeCatalogMetadata: true,
        }),
        id: candidate.id,
        ...(candidate.name ? { name: candidate.name } : {}),
      });
    } else shapes.push(candidate);
  }
  const design = createDefaultDesign();
  design.title = proposal.title;
  design.field = {
    ...design.field,
    ...proposal.constraints.field,
    origin: "tl",
  };
  design.inventory = { ...proposal.constraints.inventory };
  design.shapeOrder = shapes.map((shape) => shape.id);
  design.shapeById = Object.fromEntries(
    shapes.map((shape) => [shape.id, shape])
  );
  const normalized = normalizeDesign(design);
  const required = { ...proposal.constraints.inventory };
  for (const kind of Object.keys(required) as (keyof typeof required)[])
    required[kind] = 0;
  for (const [index, shape] of shapes.entries()) {
    const path = `shapes.${index}`;
    if (shape.kind !== "label" && shape.kind !== "polyline")
      required[shape.kind]++;
    const within = (x: number, y: number) =>
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      x >= -1e-8 &&
      y >= -1e-8 &&
      x <= design.field.width + 1e-8 &&
      y <= design.field.height + 1e-8;
    let fits = true;
    if (shape.kind === "polyline") {
      const route = normalized.shapeById[shape.id];
      const bounds = route && getShapeLocalBounds(route, 1);
      fits = Boolean(
        bounds &&
        within(bounds.x, bounds.y) &&
        within(bounds.x + bounds.width, bounds.y + bounds.height)
      );
    } else if (shape.kind === "label") fits = within(shape.x, shape.y);
    else {
      const bounds = getShapeLocalBounds(normalized.shapeById[shape.id], 1);
      const angle = (shape.rotation * Math.PI) / 180;
      fits = Boolean(
        bounds &&
        [bounds.x, bounds.x + bounds.width].every((x) =>
          [bounds.y, bounds.y + bounds.height].every((y) =>
            within(
              shape.x + x * Math.cos(angle) - y * Math.sin(angle),
              shape.y + x * Math.sin(angle) + y * Math.cos(angle)
            )
          )
        )
      );
    }
    if (!fits)
      issues.push({
        path,
        code: "outside_field",
        message:
          "The rotated shared 2D footprint or smoothed route must fit entirely within the field. Move or resize this item.",
      });
  }
  for (const kind of Object.keys(required) as (keyof typeof required)[])
    if (required[kind] > proposal.constraints.inventory[kind])
      issues.push({
        path: `constraints.inventory.${kind}`,
        code: "inventory_exceeded",
        message: `Track requires ${required[kind]} ${kind} assemblies; inventory allows ${proposal.constraints.inventory[kind]}.`,
      });
  if (issues.length) return { ok: false as const, issues: issues.slice(0, 20) };
  return {
    ok: true as const,
    design: normalized,
    proposal,
    required,
    unvalidated: DRAFT_UNVALIDATED_CONSTRAINTS,
  };
}
