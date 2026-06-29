import {
  createCatalogShapeDraft,
  getTrackElementCatalogIdentity,
  getTrackElementCatalogEntry,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import {
  getShapeKindLabel,
  getToolLabel as getTrackItemToolLabel,
  getToolMobileLabel as getTrackItemToolMobileLabel,
  getTrackItemToolConfigs,
  type Translate,
  type TrackItemToolId,
} from "@/lib/track/items/registry";
import type { Shape, ShapeDraft } from "@/lib/types";

export type { Translate };
export type EditorTool = "select" | "grab" | "preset" | TrackItemToolId;

const NON_TRACK_ITEM_TOOLS = new Set<EditorTool>(["select", "grab", "preset"]);

function isTrackItemTool(tool: EditorTool): tool is TrackItemToolId {
  return !NON_TRACK_ITEM_TOOLS.has(tool);
}

export function getShapeDisplayLabel(shape: Shape, t: Translate): string {
  const catalogIdentity = getTrackElementCatalogIdentity(shape.meta);
  if (catalogIdentity?.assignedKind === shape.kind) {
    return catalogIdentity.snapshot.name;
  }

  return getShapeKindLabel(shape.kind, t);
}

export function getToolLabel(tool: EditorTool, t: Translate): string {
  if (isTrackItemTool(tool)) {
    return getTrackItemToolLabel(tool, t);
  }
  return t(`toolLabels.${tool}`);
}

export function getToolMobileLabel(tool: EditorTool, t: Translate): string {
  if (isTrackItemTool(tool)) {
    return getTrackItemToolMobileLabel(tool, t);
  }
  return t(`toolLabels.${tool}`);
}

export const toolShortcuts = {
  select: "V",
  grab: "H",
  ...Object.fromEntries(
    getTrackItemToolConfigs()
      .filter((tool) => Boolean(tool.shortcut))
      .map((tool) => [tool.id, tool.shortcut])
  ),
} as Partial<Record<EditorTool, string>>;

export const toolCatalogEntryIds = Object.fromEntries(
  getTrackItemToolConfigs()
    .filter((tool) => Boolean(tool.defaultCatalogEntryId))
    .map((tool) => [tool.id, tool.defaultCatalogEntryId])
) as Partial<Record<EditorTool, TrackElementCatalogId>>;

export function createShapeForTool(
  tool: EditorTool,
  point: { x: number; y: number },
  options: {
    activePlacementElementId?: Partial<
      Record<EditorTool, TrackElementCatalogId>
    >;
  } = {}
): ShapeDraft | null {
  const entryId =
    options.activePlacementElementId?.[tool] ?? toolCatalogEntryIds[tool];
  if (!entryId) return null;

  const entry = getTrackElementCatalogEntry(entryId);
  const defaultForTool = toolCatalogEntryIds[tool];
  const defaultEntry = defaultForTool
    ? getTrackElementCatalogEntry(defaultForTool)
    : null;
  // Safety: if the entry's kind doesn't match the tool's expected kind, fall back
  const resolvedEntryId =
    defaultEntry && entry?.kind !== defaultEntry.kind
      ? (defaultForTool ?? entryId)
      : entryId;
  const resolvedEntry = getTrackElementCatalogEntry(resolvedEntryId);
  return createCatalogShapeDraft(resolvedEntryId, {
    x: point.x,
    y: point.y,
    includeCatalogMetadata:
      resolvedEntry?.official === true || resolvedEntry?.kind === "barrier",
  });
}
