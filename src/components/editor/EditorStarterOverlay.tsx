"use client";

import dynamic from "next/dynamic";
import { Box, Route, X } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("editor.starterOverlay");
  return (
    <>
      {shouldShowStarter && isMobile ? (
        <MobileDrawer
          open={shouldShowStarter}
          onOpenChange={(open) => {
            if (!open) onDismissStarter();
          }}
          title={t("dialog.title")}
          subtitle={t("dialog.mobileSubtitle")}
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
                  {t("dialog.studioEyebrow")}
                </p>
                <p className="text-foreground mt-2 text-[1.25rem] font-semibold tracking-[-0.02em]">
                  {t("dialog.title")}
                </p>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {t("dialog.desktopDescription")}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissStarter}
                className="text-muted-foreground/75 hover:text-foreground hover:bg-muted absolute top-0 right-0 cursor-pointer rounded-full p-1.5 transition-colors"
                aria-label={t("dialog.dismissAria")}
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
              title={t("hints.gate.title")}
              badge={t("hints.gate.badge")}
              description={t("hints.gate.description")}
              action={
                <Button size="sm" onClick={onDismissGateHint}>
                  {t("hints.gate.action")}
                </Button>
              }
              dismissLabel={t("hints.gate.dismiss")}
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
              title={t("hints.path.title")}
              badge={t("hints.path.badge")}
              description={t("hints.path.description")}
              action={
                <Button size="sm" onClick={onStartPathTool}>
                  {t("hints.path.action")}
                </Button>
              }
              dismissLabel={t("hints.path.dismiss")}
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
              title={t("hints.preview3d.title")}
              badge={t("hints.preview3d.badge")}
              description={t("hints.preview3d.description")}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGoTo2DAndStartPath}
                >
                  {t("hints.preview3d.action")}
                </Button>
              }
              dismissLabel={t("hints.preview3d.dismiss")}
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
              title={t("hints.review3d.title")}
              badge={t("hints.review3d.badge")}
              description={t("hints.review3d.description")}
              action={
                <Button size="sm" onClick={onShareAndDismissReview}>
                  {t("hints.review3d.action")}
                </Button>
              }
              dismissLabel={t("hints.review3d.dismiss")}
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
              title={t("hints.postPath.title")}
              badge={t("hints.postPath.badge")}
              description={t("hints.postPath.description")}
              action={
                <Button size="sm" onClick={onGoTo3DAndDismissNudge}>
                  {t("hints.postPath.action")}
                </Button>
              }
              dismissLabel={t("hints.postPath.dismiss")}
              onDismiss={onDismissPostPathNudge}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
