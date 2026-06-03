"use client";

import dynamic from "next/dynamic";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import type { InspectorProps } from "@/components/inspector/Inspector";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import { cn } from "@/lib/utils";

const Inspector = dynamic<InspectorProps>(
  () => import("@/components/inspector/Inspector"),
  { ssr: false }
);

const INSPECTOR_COLLAPSED_STORAGE_KEY = "trackdraw.inspectorCollapsed";

export function DesktopInspectorPanel({
  onResumeSelectedPath,
}: {
  onResumeSelectedPath?: (shapeId: string) => void;
}) {
  const [collapsed, setCollapsed] = usePersistentBoolean(
    INSPECTOR_COLLAPSED_STORAGE_KEY
  );

  return (
    <aside
      id="desktop-inspector-panel"
      aria-label="Inspector"
      className={cn(
        "border-border/80 bg-card/95 hidden min-h-0 shrink-0 flex-col overflow-hidden border-l backdrop-blur transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-12" : "w-85"
      )}
    >
      {collapsed ? (
        <>
          <div className="border-border/60 flex h-11 shrink-0 items-center justify-center border-b px-2">
            <button
              type="button"
              aria-controls="desktop-inspector-panel"
              aria-expanded={false}
              aria-label="Expand inspector"
              title="Expand inspector"
              onClick={() => setCollapsed(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
            >
              <PanelRightOpen className="size-4" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden px-2 py-4">
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.18em] uppercase [writing-mode:vertical-rl]">
              Inspector
            </span>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Inspector
            headerAction={
              <button
                type="button"
                aria-controls="desktop-inspector-panel"
                aria-expanded
                aria-label="Collapse inspector"
                title="Collapse inspector"
                onClick={() => setCollapsed(true)}
                className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
              >
                <PanelRightClose className="size-4" />
              </button>
            }
            onResumeSelectedPath={onResumeSelectedPath}
          />
        </div>
      )}
    </aside>
  );
}
