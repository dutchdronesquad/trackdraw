"use client";

import Link from "next/link";
import { ArrowRight, Scan, Share2 } from "lucide-react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { ViewControls } from "@/components/editor/mobile/ViewControls";

export interface MobilePanelsProps {
  hasPath: boolean;
  mobileFlyModeActive: boolean;
  mobileGizmoEnabled: boolean;
  mobileObstacleNumbersEnabled: boolean;
  mobileRulersEnabled: boolean;
  onFitView: () => void;
  onSetMobileGizmoEnabled: (enabled: boolean) => void;
  onSetMobileObstacleNumbersEnabled: (enabled: boolean) => void;
  onSetMobileRulersEnabled: (enabled: boolean) => void;
  onShare: () => void;
  onStartFlyThrough: () => void;
  onTabChange: (tab: "2d" | "3d") => void;
  onSetReadOnlyMenuOpen: (open: boolean) => void;
  readOnlyMenuOpen: boolean;
  saveStatusLabel: string;
  studioHref?: string;
  tab: "2d" | "3d";
}

export default function MobilePanels({
  hasPath,
  mobileFlyModeActive,
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
  onSetReadOnlyMenuOpen,
  readOnlyMenuOpen,
  saveStatusLabel,
  studioHref = "/studio",
  tab,
}: MobilePanelsProps) {
  if (mobileFlyModeActive) {
    return null;
  }

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-3 lg:hidden"
        style={{ bottom: "calc(0.55rem + env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto flex w-full max-w-sm items-center gap-1 rounded-[1.35rem] border border-white/10 bg-slate-950/86 p-1.5 text-white shadow-[0_18px_36px_rgba(15,23,42,0.32)] backdrop-blur">
          <button
            onClick={() => onSetReadOnlyMenuOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Scan className="size-3.5" />
            <span>Review</span>
          </button>
          <button
            onClick={onShare}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Share2 className="size-3.5" />
            <span>Share</span>
          </button>
          <Link
            href={studioHref}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowRight className="size-3.5" />
            <span>Edit copy</span>
          </Link>
        </div>
      </div>

      <MobileDrawer
        open={readOnlyMenuOpen}
        onOpenChange={onSetReadOnlyMenuOpen}
        title="View"
        subtitle="Canvas mode, guides and viewport controls"
        bodyClassName="space-y-5 pt-3 pb-4"
      >
        <ViewControls
          hasPath={hasPath}
          inspectorHint=""
          mobileGizmoEnabled={mobileGizmoEnabled}
          mobileObstacleNumbersEnabled={mobileObstacleNumbersEnabled}
          mobileRulersEnabled={mobileRulersEnabled}
          onFitView={onFitView}
          onSetMobileGizmoEnabled={onSetMobileGizmoEnabled}
          onSetMobileObstacleNumbersEnabled={onSetMobileObstacleNumbersEnabled}
          onSetMobileRulersEnabled={onSetMobileRulersEnabled}
          onShare={onShare}
          onStartFlyThrough={onStartFlyThrough}
          onTabChange={onTabChange}
          saveStatusLabel={saveStatusLabel}
          studioHref={studioHref}
          closePanel={() => onSetReadOnlyMenuOpen(false)}
          readOnly
          tab={tab}
        />
      </MobileDrawer>
    </>
  );
}
