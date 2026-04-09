"use client";

import Link from "next/link";
import { Play, Scan, Share2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EditorViewportTab } from "@/components/editor/mobile/Panels";

interface EditorMobileViewControlsProps {
  hasPath: boolean;
  inspectorHint: string;
  mobileGizmoEnabled: boolean;
  mobileObstacleNumbersEnabled: boolean;
  mobileRulersEnabled: boolean;
  onFitView: () => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSetMobileObstacleNumbersEnabled: (enabled: boolean) => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onShare?: () => void;
  onStartFlyThrough: () => void;
  onTabChange: (tab: EditorViewportTab) => void;
  saveStatusLabel: string;
  studioHref?: string;
  tab: EditorViewportTab;
  closePanel?: () => void;
  readOnly?: boolean;
}

function ToggleRow({
  description,
  enabled,
  onClick,
  title,
}: {
  description: string;
  enabled: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
        enabled
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div>
        <p className="text-[11px] font-medium">{title}</p>
        <p className="text-muted-foreground/75 pt-0.5 text-[11px]">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "flex h-6 w-10 items-center rounded-full p-0.5 transition-colors",
          enabled
            ? "bg-foreground/90 justify-end"
            : "bg-border/80 justify-start"
        )}
      >
        <span className="bg-background block size-5 rounded-full shadow-xs" />
      </div>
    </button>
  );
}

export function ViewControls({
  closePanel,
  hasPath,
  inspectorHint,
  mobileGizmoEnabled,
  mobileObstacleNumbersEnabled,
  mobileRulersEnabled,
  onFitView,
  onSetMobileGizmoEnabled,
  onSetMobileObstacleNumbersEnabled,
  onSetMobileRulersEnabled,
  onShare,
  onStartFlyThrough,
  onTabChange,
  readOnly = false,
  saveStatusLabel,
  studioHref = "/studio",
  tab,
}: EditorMobileViewControlsProps) {
  return (
    <>
      {!readOnly ? (
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Current mode
          </p>
          <div className="border-border/50 bg-muted/18 rounded-2xl border px-3 py-3">
            <p className="text-foreground text-sm font-medium">
              {tab === "2d" ? "2D canvas" : "3D preview"}
            </p>
            <p className="text-muted-foreground pt-1 text-[11px] leading-relaxed">
              {inspectorHint}. {saveStatusLabel}.
            </p>
          </div>
        </div>
      ) : null}
      <div>
        <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
          View mode
        </p>
        <div className="border-border/50 bg-muted/28 flex items-center gap-1.5 rounded-2xl border p-1">
          {(["2d", "3d"] as const).map((nextTab) => (
            <button
              key={nextTab}
              onClick={() => {
                onTabChange(nextTab);
                closePanel?.();
              }}
              className={cn(
                "flex-1 rounded-[0.8rem] border py-2.5 text-[11px] font-medium tracking-wide uppercase transition-colors",
                tab === nextTab
                  ? "border-primary/30 bg-primary/12 text-primary shadow-xs"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground border-transparent"
              )}
            >
              {nextTab === "2d" ? "Canvas" : "3D Preview"}
            </button>
          ))}
        </div>
        <button
          onClick={onFitView}
          className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors"
        >
          <div>
            <p className="text-[11px] font-medium">Fit to field</p>
            <p className="text-muted-foreground/75 pt-0.5 text-[11px]">
              Center the current design in view
            </p>
          </div>
          <Scan className="size-4" />
        </button>
        {tab === "2d" ? (
          <>
            <ToggleRow
              title="Rulers"
              description="Show top and left guides on mobile"
              enabled={mobileRulersEnabled}
              onClick={() => onSetMobileRulersEnabled(!mobileRulersEnabled)}
            />
            <ToggleRow
              title="Obstacle numbers"
              description="Show path numbers on route obstacles"
              enabled={mobileObstacleNumbersEnabled}
              onClick={() =>
                onSetMobileObstacleNumbersEnabled(!mobileObstacleNumbersEnabled)
              }
            />
          </>
        ) : (
          <>
            <button
              onClick={onStartFlyThrough}
              disabled={!hasPath}
              className={cn(
                "border-border/50 bg-muted/18 mt-2.5 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-colors",
                hasPath
                  ? "text-muted-foreground hover:bg-muted/28 hover:text-foreground"
                  : "text-muted-foreground/45 cursor-not-allowed"
              )}
            >
              <div>
                <p className="text-[11px] font-medium">Fly-through</p>
                <p className="text-muted-foreground/75 pt-0.5 text-[11px]">
                  {hasPath
                    ? "Start the race-line preview camera"
                    : readOnly
                      ? "No route in this shared track"
                      : "Draw a path in 2D first to enable this"}
                </p>
              </div>
              <Play className="size-4" />
            </button>
            <ToggleRow
              title="Gizmo"
              description="Show the axis helper in 3D preview"
              enabled={mobileGizmoEnabled}
              onClick={() => onSetMobileGizmoEnabled(!mobileGizmoEnabled)}
            />
          </>
        )}
      </div>
      {readOnly ? (
        <div>
          <p className="text-muted-foreground/60 mb-2.5 text-[11px] font-semibold tracking-widest uppercase">
            Share
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={studioHref}
              className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
            >
              <ArrowRight className="size-4" />
              <span className="text-[11px] leading-none font-medium">
                Open Studio
              </span>
            </Link>
            <button
              onClick={onShare}
              className="border-border/50 bg-muted/18 text-muted-foreground hover:bg-muted/28 hover:text-foreground flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-all"
            >
              <Share2 className="size-4" />
              <span className="text-[11px] leading-none font-medium">
                Share
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
