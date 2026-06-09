"use client";

import dynamic from "next/dynamic";
import { Box, Route, X } from "lucide-react";
import { MobileDrawer } from "@/components/MobileDrawer";
import { ContextOverlayCard } from "./ContextOverlayCard";
import { Button } from "@/components/ui/button";
import type { EditorTool } from "@/lib/editor/tool-registry";
import type { EditorView } from "@/lib/editor/view";

const StarterSteps = dynamic(
  () =>
    import("@/components/editor/StarterFlow").then((mod) => ({
      default: mod.StarterSteps,
    })),
  { ssr: false }
);

const StarterActions = dynamic(
  () =>
    import("@/components/editor/StarterFlow").then((mod) => ({
      default: mod.StarterActions,
    })),
  { ssr: false }
);

interface EditorStarterOverlayProps {
  readOnly: boolean;
  isMobile: boolean;
  shouldShowStarter: boolean;
  onDismissStarter: () => void;
  starterMode: "guided" | "blank" | null;
  tab: EditorView;
  designShapeCount: number;
  activeTool: EditorTool;
  hasPath: boolean;
  gateHintDismissed: boolean;
  onDismissGateHint: () => void;
  desktopPathHintDismissed: boolean;
  onDismissDesktopPathHint: () => void;
  desktopPreviewHintDismissed: boolean;
  onDismissDesktopPreviewHint: () => void;
  review3DHintDismissed: boolean;
  onDismissReview3DHint: () => void;
  showPostPathNudge: boolean;
  postPathNudgeDismissed: boolean;
  onDismissPostPathNudge: () => void;
  onApplyStarterDesign: (type: "gate" | "blank") => void;
  onApplyStarterLayout: (layoutId: string) => void;
  onStartPathTool: () => void;
  onGoTo2DAndStartPath: () => void;
  onShareAndDismissReview: () => void;
  onGoTo3DAndDismissNudge: () => void;
}

export function EditorStarterOverlay({
  readOnly,
  isMobile,
  shouldShowStarter,
  onDismissStarter,
  starterMode,
  tab,
  designShapeCount,
  activeTool,
  hasPath,
  gateHintDismissed,
  onDismissGateHint,
  desktopPathHintDismissed,
  onDismissDesktopPathHint,
  desktopPreviewHintDismissed,
  onDismissDesktopPreviewHint,
  review3DHintDismissed,
  onDismissReview3DHint,
  showPostPathNudge,
  postPathNudgeDismissed,
  onDismissPostPathNudge,
  onApplyStarterDesign,
  onApplyStarterLayout,
  onStartPathTool,
  onGoTo2DAndStartPath,
  onShareAndDismissReview,
  onGoTo3DAndDismissNudge,
}: EditorStarterOverlayProps) {
  return (
    <>
      {shouldShowStarter && isMobile ? (
        <MobileDrawer
          open={shouldShowStarter}
          onOpenChange={(open) => {
            if (!open) onDismissStarter();
          }}
          title="Welcome to TrackDraw"
          subtitle="Place a few gates, draw the route, check 3D, then share when the track is ready."
          contentClassName="max-h-[96dvh]"
          bodyClassName="space-y-5 pt-3 pb-4"
        >
          <StarterSteps mobile />
          <StarterActions
            mobile
            onPath={() => onApplyStarterDesign("gate")}
            onBlank={() => onApplyStarterDesign("blank")}
            onStarterLayout={onApplyStarterLayout}
          />
        </MobileDrawer>
      ) : null}

      {shouldShowStarter && !isMobile ? (
        <div className="absolute inset-0 z-20 hidden items-center justify-center bg-slate-950/10 px-5 backdrop-blur-sm lg:flex">
          <div className="border-border/50 bg-card/97 pointer-events-auto w-full max-w-xl rounded-4xl border px-8 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="relative">
              <div className="pr-10">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
                  Studio
                </p>
                <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
                  Welcome to TrackDraw
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  Design the layout in 2D, review elevation in 3D, and share a
                  read-only link when the track is ready.
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissStarter}
                className="text-muted-foreground/75 hover:text-foreground hover:bg-muted absolute top-0 right-0 cursor-pointer rounded-full p-1.5 transition-colors"
                aria-label="Dismiss starter dialog"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-6">
              <StarterSteps />
              <StarterActions
                onPath={() => onApplyStarterDesign("gate")}
                onBlank={() => onApplyStarterDesign("blank")}
                onStarterLayout={onApplyStarterLayout}
              />
            </div>
          </div>
        </div>
      ) : null}

      {!readOnly &&
      starterMode === "guided" &&
      tab === "2d" &&
      designShapeCount === 0 &&
      activeTool === "gate" &&
      !gateHintDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
          <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
            <ContextOverlayCard
              icon={<Box className="size-4" />}
              title="Place your first gate"
              badge="Guided"
              description="Tap or click on the canvas to drop the first gate. Add a few gates before switching to Path."
              action={
                <Button size="sm" onClick={onDismissGateHint}>
                  Got it
                </Button>
              }
              dismissLabel="Dismiss gate placement hint"
              onDismiss={onDismissGateHint}
            />
          </div>
        </div>
      ) : null}

      {!readOnly &&
      starterMode === "guided" &&
      tab === "2d" &&
      !shouldShowStarter &&
      designShapeCount > 0 &&
      !hasPath &&
      !desktopPathHintDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
          <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
            <ContextOverlayCard
              icon={<Route className="size-4" />}
              title="Next, draw the route"
              badge="Guided"
              description="Place a few gates first, then switch to Path and trace the lap through them. Finish the route before checking 3D."
              action={
                <Button size="sm" onClick={onStartPathTool}>
                  Start path
                </Button>
              }
              dismissLabel="Dismiss path onboarding hint"
              onDismiss={onDismissDesktopPathHint}
            />
          </div>
        </div>
      ) : null}

      {!readOnly &&
      starterMode === "guided" &&
      tab === "3d" &&
      !hasPath &&
      !desktopPreviewHintDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
          <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
            <ContextOverlayCard
              icon={<Box className="size-4" />}
              title="3D works best after the route"
              badge="Preview"
              description="Obstacle placement already previews here, but the route is what makes elevation and fly-through review useful."
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGoTo2DAndStartPath}
                >
                  Draw path in 2D
                </Button>
              }
              dismissLabel="Dismiss 3D preview onboarding hint"
              onDismiss={onDismissDesktopPreviewHint}
            />
          </div>
        </div>
      ) : null}

      {!readOnly &&
      starterMode === "guided" &&
      tab === "3d" &&
      hasPath &&
      !review3DHintDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
          <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
            <ContextOverlayCard
              icon={<Box className="size-4" />}
              title="Now review it in 3D"
              badge="Guided"
              description="Orbit around the route, check elevation and spacing, then share or export once the layout feels right."
              action={
                <Button size="sm" onClick={onShareAndDismissReview}>
                  Share or export next
                </Button>
              }
              dismissLabel="Dismiss 3D review hint"
              onDismiss={onDismissReview3DHint}
            />
          </div>
        </div>
      ) : null}

      {!readOnly &&
      starterMode === "guided" &&
      tab === "2d" &&
      showPostPathNudge &&
      !postPathNudgeDismissed ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 lg:justify-start lg:px-0">
          <div className="max-w-sm lg:absolute lg:top-0 lg:left-4">
            <ContextOverlayCard
              icon={<Box className="size-4" />}
              title="Route ready — check it in 3D"
              badge="Next step"
              description="Switch to the 3D tab now to review the route before refining more obstacle placement."
              action={
                <Button size="sm" onClick={onGoTo3DAndDismissNudge}>
                  Switch to 3D
                </Button>
              }
              dismissLabel="Dismiss post-path 3D nudge"
              onDismiss={onDismissPostPathNudge}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
