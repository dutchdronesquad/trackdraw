"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import type {
  TrackCanvasHandle,
  TrackCanvasProps,
} from "@/components/canvas/editor/TrackCanvas";
import type {
  TrackPreview3DHandle,
  TrackPreview3DProps,
} from "@/components/canvas/editor/TrackPreview3D";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePerfMetric } from "@/hooks/usePerfMetric";
import type { EditorView } from "@/lib/view";
import { useEditor } from "@/store/editor";
import { selectHasPath } from "@/store/selectors";

const TrackPreview3D = dynamic<TrackPreview3DProps>(
  () => import("@/components/canvas/share/TrackPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground/40 flex h-full items-center justify-center text-xs">
        Loading 3D…
      </div>
    ),
  }
) as ForwardRefExoticComponent<
  TrackPreview3DProps & RefAttributes<TrackPreview3DHandle>
>;

const TrackCanvas = dynamic<TrackCanvasProps>(
  () => import("@/components/canvas/share/TrackCanvas"),
  { ssr: false }
) as ForwardRefExoticComponent<
  TrackCanvasProps & RefAttributes<TrackCanvasHandle>
>;

const ShareDialog = dynamic(() => import("@/components/dialogs/ShareDialog"), {
  ssr: false,
});

const Header = dynamic(() => import("./Header"), {
  ssr: false,
});

const MobilePanels = dynamic(() => import("./MobilePanels"), { ssr: false });

export default function EditorShell({
  initialTab = "2d",
  studioHref,
  existingShareMode = false,
}: {
  initialTab?: EditorView;
  studioHref?: string;
  existingShareMode?: boolean;
}) {
  usePerfMetric("render:share/EditorShell");

  const hasPath = useEditor(selectHasPath);
  const isMobile = useIsMobile();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canvasRef = useRef<TrackCanvasHandle>(null);
  const preview3DRef = useRef<TrackPreview3DHandle>(null);
  const [tab, setTab] = useState<"2d" | "3d">(initialTab);
  const [hasVisited3D, setHasVisited3D] = useState(initialTab === "3d");
  const [readOnlyMenuOpen, setReadOnlyMenuOpen] = useState(false);
  const [mobileRulersEnabled, setMobileRulersEnabled] = useState(false);
  const [mobileGizmoEnabled, setMobileGizmoEnabled] = useState(false);
  const [showObstacleNumbers, setShowObstacleNumbers] = useState(true);
  const [pendingFlyThroughStart, setPendingFlyThroughStart] = useState(false);
  const [mobileFlyModeActive, setMobileFlyModeActive] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!pendingFlyThroughStart || tab !== "3d") return;

    let frameId = 0;

    const tryStart = () => {
      if (preview3DRef.current) {
        preview3DRef.current.startFlyThrough();
        setPendingFlyThroughStart(false);
        return;
      }
      frameId = window.requestAnimationFrame(tryStart);
    };

    frameId = window.requestAnimationFrame(tryStart);
    return () => window.cancelAnimationFrame(frameId);
  }, [pendingFlyThroughStart, tab]);

  useEffect(() => {
    if (tab === "3d") {
      setHasVisited3D(true);
    }
  }, [tab]);

  const handleTabChange = useCallback(
    (nextTab: EditorView) => {
      setTab(nextTab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", nextTab);
      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <>
      <div className="bg-background text-foreground relative flex h-dvh overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            tab={tab}
            onTabChange={handleTabChange}
            studioHref={studioHref}
            showObstacleNumbers={showObstacleNumbers}
            onToggleObstacleNumbers={() =>
              setShowObstacleNumbers((current) => !current)
            }
          />

          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="bg-canvas relative min-h-0 flex-1 overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    visibility: tab === "2d" ? "visible" : "hidden",
                    pointerEvents: tab === "2d" ? "auto" : "none",
                  }}
                >
                  <TrackCanvas
                    ref={canvasRef}
                    mobileRulersEnabled={mobileRulersEnabled}
                    showObstacleNumbers={showObstacleNumbers}
                  />
                </div>
                {hasVisited3D ? (
                  <div
                    className="absolute inset-0"
                    style={{ display: tab === "3d" ? "block" : "none" }}
                  >
                    <TrackPreview3D
                      ref={preview3DRef}
                      showGizmo={mobileGizmoEnabled}
                      onFlyModeChange={setMobileFlyModeActive}
                      readOnly
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isMobile ? (
          <MobilePanels
            hasPath={hasPath}
            mobileFlyModeActive={mobileFlyModeActive}
            mobileGizmoEnabled={mobileGizmoEnabled}
            mobileObstacleNumbersEnabled={showObstacleNumbers}
            mobileRulersEnabled={mobileRulersEnabled}
            onFitView={() => canvasRef.current?.fitToWindow()}
            onSetMobileGizmoEnabled={setMobileGizmoEnabled}
            onSetMobileObstacleNumbersEnabled={setShowObstacleNumbers}
            onSetMobileRulersEnabled={setMobileRulersEnabled}
            onShare={() => {
              setShareOpen(true);
              setReadOnlyMenuOpen(false);
            }}
            onStartFlyThrough={() => {
              handleTabChange("3d");
              setPendingFlyThroughStart(true);
            }}
            onTabChange={handleTabChange}
            onSetReadOnlyMenuOpen={setReadOnlyMenuOpen}
            readOnlyMenuOpen={readOnlyMenuOpen}
            saveStatusLabel="Shared review"
            studioHref={studioHref}
            tab={tab}
          />
        ) : null}
      </div>

      {shareOpen ? (
        <ShareDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          hasPath={hasPath}
          existingShareMode={existingShareMode}
        />
      ) : null}
    </>
  );
}
