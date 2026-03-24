"use client";

import { type Dispatch, type SetStateAction } from "react";
import ElevationChart from "@/components/inspector/ElevationChart";
import { shapeKindLabels } from "@/lib/editor-tools";
import type { Shape } from "@/lib/types";
import { Copy, GitMerge, Trash2 } from "lucide-react";
import { IconBtn, PanelHeader } from "@/components/inspector/shared";
import {
  InspectorFooterDesktop,
  InspectorFooterMobile,
  InspectorLead,
  InspectorScrollBody,
} from "./layout";

export interface MultiInspectorViewProps {
  selectedShapes: Shape[];
  selection: string[];
  duplicateShapes: (ids: string[]) => void;
  joinPolylines: (ids: string[]) => string | null;
  removeShapes: (ids: string[]) => void;
  setSelection: Dispatch<SetStateAction<string[]>> | ((ids: string[]) => void);
  mobileInline?: boolean;
}

export function MultiInspectorView({
  selectedShapes,
  selection,
  duplicateShapes,
  joinPolylines,
  removeShapes,
  setSelection,
  mobileInline = false,
}: MultiInspectorViewProps) {
  const kinds = selectedShapes.reduce<Record<Shape["kind"], number>>(
    (accumulator, shape) => {
      accumulator[shape.kind] = (accumulator[shape.kind] ?? 0) + 1;
      return accumulator;
    },
    {
      gate: 0,
      flag: 0,
      cone: 0,
      label: 0,
      polyline: 0,
      startfinish: 0,
      ladder: 0,
      divegate: 0,
    }
  );
  const polylineIds = selectedShapes
    .filter((shape) => shape.kind === "polyline" && !shape.closed)
    .map((shape) => shape.id);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelHeader
        title={`${selectedShapes.length} selected`}
        actions={
          <>
            {polylineIds.length >= 2 && (
              <IconBtn
                onClick={() => joinPolylines(polylineIds)}
                title="Join paths"
              >
                <GitMerge className="size-3" />
              </IconBtn>
            )}
            <IconBtn
              onClick={() => duplicateShapes(selection)}
              title="Duplicate"
            >
              <Copy className="size-3" />
            </IconBtn>
            <IconBtn
              onClick={() => {
                removeShapes(selection);
                setSelection([]);
              }}
              title="Delete"
              danger
            >
              <Trash2 className="size-3" />
            </IconBtn>
          </>
        }
      />
      <InspectorScrollBody mobileInline={mobileInline}>
        <div className="space-y-3 p-4 pb-[max(env(safe-area-inset-bottom),1rem)] lg:space-y-2 lg:p-3 lg:pb-3">
          <InspectorLead
            title={`${selectedShapes.length} items selected`}
            subtitle="Bulk actions are available here. Open a single item from the canvas when you need detailed editing."
            meta={[
              `${Object.values(kinds).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0)} kinds`,
              ...(polylineIds.length >= 2 ? ["join available"] : []),
            ]}
          />
          <div className="grid grid-cols-2 gap-2 lg:gap-1">
            {Object.entries(kinds)
              .filter(([, count]) => count > 0)
              .map(([kind, count]) => (
                <div
                  key={kind}
                  className="border-border/60 bg-muted/30 rounded-md border px-2.5 py-2"
                >
                  <p className="text-muted-foreground text-[9px] tracking-wider uppercase">
                    {shapeKindLabels[kind as Shape["kind"]]}
                  </p>
                  <p className="text-sm font-semibold">{count}×</p>
                </div>
              ))}
          </div>
          {polylineIds.length >= 2 && (
            <button
              className="border-border/60 bg-muted/35 hover:bg-muted/55 text-foreground/80 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border px-3 text-[11px] transition-colors lg:h-8"
              onClick={() => joinPolylines(polylineIds)}
            >
              <GitMerge className="size-3.5" />
              Join selected paths
            </button>
          )}
          <InspectorFooterMobile>
            <ElevationChart />
          </InspectorFooterMobile>
        </div>
      </InspectorScrollBody>
      <InspectorFooterDesktop>
        <ElevationChart className="lg:mx-0 lg:border-t-0 lg:px-3" />
      </InspectorFooterDesktop>
    </div>
  );
}
