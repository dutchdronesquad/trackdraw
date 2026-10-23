"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type {
  TrackDrawViewerHandle,
  TrackDrawViewerOptions,
  ViewerView,
} from "@trackdraw/viewer";
import { bioTrack } from "@/lib/bio-track";
import { cn } from "@/lib/utils";

export default function BioTrackViewer() {
  const t = useTranslations("landing.bio.track");
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<TrackDrawViewerHandle | null>(null);
  const [view, setView] = useState<ViewerView>("2d");
  const [available3D, setAvailable3D] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  const options = useMemo<TrackDrawViewerOptions>(
    () => ({
      design: bioTrack,
      view,
      theme,
      showViewControls: false,
      show3DAxes: false,
      camera3D: { position: [-7, 42, 58], target: [28, 1.5, 18] },
      showObstacleNumbers: true,
      onViewStateChange: (state) => {
        setAvailable3D(state.available3D);
        setView(state.view);
      },
      labels: {
        grid: (grid) => t("grid", { grid }),
        viewerPanZoom: t("panZoom"),
        fitToWindow: t("fit"),
        loading3D: t("loading3D"),
        unavailable3D: t("unavailable3D"),
      },
    }),
    [view, theme, t]
  );
  const latestOptions = useRef(options);

  useEffect(() => {
    latestOptions.current = options;
    viewer.current?.update(options);
  }, [options]);

  useEffect(() => {
    const updateTheme = () =>
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let started = false;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        const { createTrackDrawViewer } = await import("@trackdraw/viewer");
        if (cancelled) return;
        viewer.current = createTrackDrawViewer(element, latestOptions.current);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                void start();
              }
            },
            { rootMargin: "150px" }
          );
    if (observer) observer.observe(element);
    else void start();
    return () => {
      cancelled = true;
      observer?.disconnect();
      const previous = viewer.current;
      viewer.current = null;
      // The package owns a separate React root; release it after this cleanup.
      queueMicrotask(() => previous?.destroy());
    };
  }, [attempt]);

  return (
    <section aria-labelledby="bio-track-heading" className="mt-8">
      <h2
        id="bio-track-heading"
        className="mb-4 text-lg font-semibold tracking-tight"
      >
        {t("heading")}
      </h2>
      <div className="border-border overflow-hidden rounded-lg border">
        <div
          role="group"
          aria-label={t("viewLabel")}
          className="bg-card flex gap-1 p-2"
        >
          {(["2d", "3d"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              disabled={status !== "ready" || (mode === "3d" && !available3D)}
              onClick={() => setView(mode)}
              className={cn(
                "focus-visible:outline-ring min-h-11 min-w-14 rounded-md px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                view === mode
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {t(mode)}
            </button>
          ))}
        </div>
        <div className="relative">
          <div
            ref={container}
            role="region"
            aria-label={t("title")}
            aria-busy={status === "loading"}
            className="h-[260px] w-full sm:h-[300px]"
          />
          {status !== "ready" && (
            <div
              role="status"
              className="bg-muted text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm"
            >
              <p>{t(status === "error" ? "error" : "loading")}</p>
              {status === "error" && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus("loading");
                    setAttempt((value) => value + 1);
                  }}
                  className="text-foreground focus-visible:outline-ring min-h-11 px-4 underline underline-offset-4 focus-visible:outline-2"
                >
                  {t("retry")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p
        className="text-muted-foreground mt-3 text-xs leading-5"
        aria-live="polite"
      >
        {t(
          !available3D ? "unavailable3D" : view === "2d" ? "hint2D" : "hint3D"
        )}
      </p>
    </section>
  );
}
