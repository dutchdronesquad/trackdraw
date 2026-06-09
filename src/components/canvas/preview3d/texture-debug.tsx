"use client";

import { useSyncExternalStore } from "react";
import type { TexturePanelEdge } from "@/lib/track/elements/catalog";

// ─── Override store ────────────────────────────────────────────────────────────

export const EDGES: TexturePanelEdge[] = ["top", "right", "bottom", "left"];

export const EDGE_ROTATIONS: Record<TexturePanelEdge, number> = {
  top: 0,
  right: Math.PI / 2,
  bottom: Math.PI,
  left: -Math.PI / 2,
};

export interface StoredPanel {
  catalogId: string;
  panelName: string;
  source: string;
  baseFlipX: boolean;
  baseFlipY: boolean;
  edgeIndex: number;
  flipXOverride?: boolean;
  flipYOverride?: boolean;
}

const overrideStore = new Map<string, StoredPanel>();
let overrideVersion = 0;
const overrideListeners = new Set<() => void>();

function storeKey(catalogId: string, panelName: string) {
  return `${catalogId}:${panelName}`;
}

function emitOverrideChange() {
  overrideVersion++;
  overrideListeners.forEach((fn) => fn());
}

export function registerPanel(
  catalogId: string,
  panelName: string,
  source: string,
  baseFlipX: boolean,
  baseFlipY: boolean,
  baseRotation: number
) {
  const key = storeKey(catalogId, panelName);
  if (overrideStore.has(key)) return;
  overrideStore.set(key, {
    catalogId,
    panelName,
    source,
    baseFlipX,
    baseFlipY,
    edgeIndex: snapToEdgeIndex(baseRotation),
  });
  emitOverrideChange();
}

export function setEdge(
  catalogId: string,
  panelName: string,
  edge: TexturePanelEdge
) {
  const key = storeKey(catalogId, panelName);
  const entry = overrideStore.get(key);
  if (!entry) return;
  overrideStore.set(key, { ...entry, edgeIndex: EDGES.indexOf(edge) });
  emitOverrideChange();
}

export function getEffectiveRotation(
  catalogId: string | undefined,
  panelName: string,
  baseRotation: number
): number {
  if (!catalogId) return baseRotation;
  const entry = overrideStore.get(storeKey(catalogId, panelName));
  if (!entry) return baseRotation;
  return EDGE_ROTATIONS[EDGES[entry.edgeIndex]];
}

export function getEffectiveFlips(
  catalogId: string | undefined,
  panelName: string,
  baseFlipX: boolean,
  baseFlipY: boolean
): { flipX: boolean; flipY: boolean } {
  if (!catalogId) return { flipX: baseFlipX, flipY: baseFlipY };
  const entry = overrideStore.get(storeKey(catalogId, panelName));
  if (!entry) return { flipX: baseFlipX, flipY: baseFlipY };
  return {
    flipX: entry.flipXOverride ?? entry.baseFlipX,
    flipY: entry.flipYOverride ?? entry.baseFlipY,
  };
}

export function toggleFlip(
  catalogId: string,
  panelName: string,
  axis: "x" | "y"
) {
  const key = storeKey(catalogId, panelName);
  const entry = overrideStore.get(key);
  if (!entry) return;
  if (axis === "x") {
    const current = entry.flipXOverride ?? entry.baseFlipX;
    overrideStore.set(key, { ...entry, flipXOverride: !current });
  } else {
    const current = entry.flipYOverride ?? entry.baseFlipY;
    overrideStore.set(key, { ...entry, flipYOverride: !current });
  }
  emitOverrideChange();
}

export function getPanelsForCatalog(catalogId: string): StoredPanel[] {
  const result: StoredPanel[] = [];
  for (const entry of overrideStore.values()) {
    if (entry.catalogId === catalogId) result.push(entry);
  }
  return result;
}

export function getCurrentEdgeForPanel(
  catalogId: string,
  panelName: string
): TexturePanelEdge {
  const entry = overrideStore.get(storeKey(catalogId, panelName));
  return entry ? EDGES[entry.edgeIndex] : "top";
}

export function generateExportConfig(): string {
  if (overrideStore.size === 0)
    return "(no panels registered — open dev mode while a track with textured elements is visible)";

  const byCatalog = new Map<string, StoredPanel[]>();
  for (const entry of overrideStore.values()) {
    if (!byCatalog.has(entry.catalogId)) byCatalog.set(entry.catalogId, []);
    byCatalog.get(entry.catalogId)!.push(entry);
  }

  const lines: string[] = [];
  for (const [catalogId, panels] of byCatalog) {
    lines.push(`// ${catalogId}`);
    lines.push("placement: {");
    for (const p of panels) {
      lines.push(`  ${p.panelName}: { ${formatPanelConfig(p)} },`);
    }
    lines.push("},");
    lines.push("");
  }

  return lines.join("\n");
}

export function generateExportConfigForCatalog(catalogId: string): string {
  const panels = getPanelsForCatalog(catalogId);
  if (panels.length === 0) return `// ${catalogId} — no panels registered`;

  const lines: string[] = [`// ${catalogId}`, "placement: {"];
  for (const p of panels) {
    lines.push(`  ${p.panelName}: { ${formatPanelConfig(p)} },`);
  }
  lines.push("},");
  return lines.join("\n");
}

function formatPanelConfig(p: StoredPanel): string {
  const edge = EDGES[p.edgeIndex];
  const flipX = p.flipXOverride ?? p.baseFlipX;
  const flipY = p.flipYOverride ?? p.baseFlipY;
  const orientParts: string[] = [`textureTopEdgeFaces: "${edge}"`];
  if (flipX) orientParts.push("flipX: true");
  if (flipY) orientParts.push("flipY: true");
  return `source: "${p.source}", orientation: { ${orientParts.join(", ")} }`;
}

export function useOverrideVersion() {
  return useSyncExternalStore(
    (listener) => {
      overrideListeners.add(listener);
      return () => overrideListeners.delete(listener);
    },
    () => overrideVersion,
    () => 0
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function snapToEdgeIndex(rotation: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < EDGES.length; i++) {
    const r = EDGE_ROTATIONS[EDGES[i]];
    const diff = ((rotation - r + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    if (Math.abs(diff) < bestDist) {
      bestDist = Math.abs(diff);
      best = i;
    }
  }
  return best;
}
