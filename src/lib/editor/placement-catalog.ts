import {
  getCatalogEntriesByKind,
  type TrackElementCatalogEntry,
  type TrackElementCatalogId,
} from "@/lib/track/elements/catalog";
import {
  getCatalogPlacementToolConfigs,
  type CatalogPlacementToolId,
} from "@/lib/track/items/registry";
import type { EditorTool } from "@/lib/editor/tool-registry";

export interface CatalogPlacementViewModel {
  defaultEntryId: TrackElementCatalogId;
  entries: TrackElementCatalogEntry[];
  label: string;
  toolId: CatalogPlacementToolId;
}

export const catalogPlacementViewModels: CatalogPlacementViewModel[] =
  getCatalogPlacementToolConfigs().map((tool) => ({
    defaultEntryId: tool.defaultCatalogEntryId,
    entries: getCatalogEntriesByKind(tool.id),
    label: tool.label,
    toolId: tool.id,
  }));

export const catalogPlacementByTool = Object.fromEntries(
  catalogPlacementViewModels.map((viewModel) => [viewModel.toolId, viewModel])
) as Partial<Record<EditorTool, CatalogPlacementViewModel>>;

export const catalogPlacementToolIds: EditorTool[] =
  catalogPlacementViewModels.map((viewModel) => viewModel.toolId);
