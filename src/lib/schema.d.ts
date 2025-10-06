import { z } from "zod";

export const vec3 = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number().optional(),
});

const baseShape = z.object({
  id: z.string(),
  kind: z.enum(["gate", "flag", "cone", "label", "polyline"]),
  name: z.string().optional(),
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  locked: z.boolean().optional(),
  color: z.string().optional(),
  meta: z.record(z.any()).optional(),
});

export const gateShape = baseShape.extend({
  kind: z.literal("gate"),
  width: z.number().positive(),
  height: z.number().positive(),
  thick: z.number().positive().optional(),
});

export const flagShape = baseShape.extend({
  kind: z.literal("flag"),
  radius: z.number().positive(),
  poleHeight: z.number().positive().optional(),
});

export const coneShape = baseShape.extend({
  kind: z.literal("cone"),
  radius: z.number().positive(),
});

export const labelShape = baseShape.extend({
  kind: z.literal("label"),
  text: z.string(),
  fontSize: z.number().optional(),
});

export const polylineShape = baseShape.extend({
  kind: z.literal("polyline"),
  points: z.array(vec3).min(2),
  closed: z.boolean().optional(),
  strokeWidth: z.number().positive().optional(),
  showArrows: z.boolean().optional(),
});

export const shape = z.discriminatedUnion("kind", [
  gateShape,
  flagShape,
  coneShape,
  labelShape,
  polylineShape,
]);

export const fieldSpec = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  origin: z.enum(["tl", "bl"]).default("tl"),
  gridStep: z.number().positive().default(1),
  ppm: z.number().positive().default(50),
});

export const trackDesign = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  field: fieldSpec,
  shapes: z.array(shape),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.literal(1),
});

export type TrackDesign = z.infer<typeof trackDesign>;
export type Shape = z.infer<typeof shape>;
export type PolylineShape = z.infer<typeof polylineShape>;
