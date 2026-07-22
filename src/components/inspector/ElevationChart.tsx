"use client";

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/store/editor";
import {
  getPolylineManeuverDetections,
  getPolylineElevationSamples,
  getRouteWarningSegmentColor,
  getPolylineRouteWarningSegmentVisuals,
  getPolylineTotalLength2D,
  getPolylineRouteWarnings,
  type RouteManeuverDetection,
  type RouteWarning,
  type RouteWarningKind,
} from "@/lib/track/polyline-derived";
import {
  getObstacleNumberMap,
  isNumberedObstacle,
} from "@/lib/track/obstacleNumbering";
import {
  getShapeTimingMarker,
  getTimingMarkerColor,
  getTimingMarkerTitle,
  type ShapeTimingMarker,
} from "@/lib/track/timing";
import { selectDesignShapes, selectPrimaryPolyline } from "@/store/selectors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMeasurementUnitSystem } from "@/hooks/useMeasurementUnitSystem";
import { formatMeasurement } from "@/lib/track/units";
import type { PolylineShape, Shape } from "@/lib/types";

type SegmentWarningKind = Exclude<RouteWarningKind, "flat" | "stub">;
type Translate = (key: string, values?: Record<string, unknown>) => string;

type ChartRouteMarker = {
  ariaLabel: string;
  color: string;
  d: number;
  id: string;
  shapeId: string;
  type: "obstacle" | "timing";
};

type ChartTimingRouteMarkerCandidate = Omit<
  ChartRouteMarker,
  "ariaLabel" | "type"
> & {
  marker: ShapeTimingMarker;
  type: "timing";
};

type ChartObstacleRouteMarkerCandidate = Omit<
  ChartRouteMarker,
  "ariaLabel" | "type"
> & {
  obstacleNumber?: number;
  type: "obstacle";
};

type ChartRouteMarkerCandidate =
  ChartObstacleRouteMarkerCandidate | ChartTimingRouteMarkerCandidate;

type ChartWarningMarker = {
  d: number;
  kind: SegmentWarningKind;
  label: string;
  segmentIndex: number;
};

type RouteProjection = {
  d: number;
  pathDistance: number;
  projectedPoint: { x: number; y: number };
  segmentIndex: number;
};

function getPolylinePointAtDistance(
  samples: Array<{ d: number; z: number }>,
  distance: number
) {
  if (samples.length === 0) return { d: 0, z: 0 };
  if (distance <= samples[0].d) return samples[0];

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (distance <= current.d) {
      const span = Math.max(current.d - previous.d, 1e-6);
      const progress = (distance - previous.d) / span;
      return {
        d: distance,
        z: previous.z + (current.z - previous.z) * progress,
      };
    }
  }

  return samples[samples.length - 1];
}

function getSegmentMidpoint(path: PolylineShape, segmentIndex: number) {
  const start = path.points[segmentIndex];
  const end = path.points[segmentIndex + 1];
  if (!start || !end) return null;
  return {
    x: +(start.x + (end.x - start.x) / 2).toFixed(2),
    y: +(start.y + (end.y - start.y) / 2).toFixed(2),
  };
}

function projectPointOntoRoute(
  path: PolylineShape,
  point: { x: number; y: number }
): RouteProjection | null {
  let runningDistance = 0;
  let best: RouteProjection | null = null;

  for (
    let segmentIndex = 1;
    segmentIndex < path.points.length;
    segmentIndex += 1
  ) {
    const start = path.points[segmentIndex - 1];
    const end = path.points[segmentIndex];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const segmentLength = Math.sqrt(lengthSquared);
    const progress =
      lengthSquared <= 1e-9
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * dx + (point.y - start.y) * dy) /
                lengthSquared
            )
          );
    const projectedPoint = {
      x: start.x + dx * progress,
      y: start.y + dy * progress,
    };
    const pathDistance = Math.hypot(
      point.x - projectedPoint.x,
      point.y - projectedPoint.y
    );
    const d = runningDistance + segmentLength * progress;

    if (!best || pathDistance < best.pathDistance) {
      best = {
        d,
        pathDistance,
        projectedPoint,
        segmentIndex: segmentIndex - 1,
      };
    }

    runningDistance += segmentLength;
  }

  return best;
}

function getRouteMarkerTolerance(shape: Shape) {
  const width =
    "width" in shape && typeof shape.width === "number" ? shape.width : 0;
  return Math.max(width * 0.75, 1.4);
}

function isEnterOrSpace(event: KeyboardEvent<SVGGElement>) {
  return event.key === "Enter" || event.key === " ";
}

function getWarningSummary(
  kind: RouteWarningKind,
  count: number,
  first: number | undefined,
  t: Translate
) {
  return t(`warnings.${kind}.summary`, { count, first });
}

function getWarningDetails(kind: RouteWarningKind, t: Translate) {
  return {
    title: t(`warnings.${kind}.title`),
    problem: t(`warnings.${kind}.problem`),
    fix: t(`warnings.${kind}.fix`),
  };
}

function getWarningShortLabel(kind: RouteWarningKind, t: Translate) {
  return t(`warnings.${kind}.shortLabel`);
}

function getManeuverLabel(kind: RouteManeuverDetection["kind"], t: Translate) {
  return t(`maneuvers.${kind}`);
}

function formatManeuverRange(maneuver: RouteManeuverDetection, t: Translate) {
  return maneuver.startWaypointIndex === maneuver.endWaypointIndex
    ? t("waypointSingle", { index: maneuver.startWaypointIndex })
    : t("waypointRange", {
        start: maneuver.startWaypointIndex,
        end: maneuver.endWaypointIndex,
      });
}

function isWarningKind(kind: RouteWarningKind) {
  return (
    kind === "hairpin" ||
    kind === "steep" ||
    kind === "close-points" ||
    kind === "spacing-shift" ||
    kind === "rhythm-break"
  );
}

const WARNING_SUMMARY_PRIORITY: Partial<Record<RouteWarningKind, number>> = {
  "close-points": 1,
  steep: 2,
  hairpin: 3,
  "spacing-shift": 4,
  "rhythm-break": 5,
};

function getSummaryPriority(kind: RouteWarningKind) {
  return WARNING_SUMMARY_PRIORITY[kind] ?? Number.POSITIVE_INFINITY;
}

function useGroupedWarnings(warnings: RouteWarning[]) {
  return useMemo(() => {
    const map = new Map<RouteWarningKind, { count: number; first?: number }>();
    for (const warning of warnings) {
      const existing = map.get(warning.kind);
      if (!existing) {
        map.set(warning.kind, { count: 1, first: warning.waypointIndex });
      } else {
        existing.count += 1;
      }
    }
    return Array.from(map.entries());
  }, [warnings]);
}

function RouteManeuverSummary({
  maneuvers,
}: {
  maneuvers: RouteManeuverDetection[];
}) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  if (maneuvers.length === 0) return null;

  const first = maneuvers[0];
  const extraCount = maneuvers.length - 1;

  return (
    <div className="mb-2 flex items-center gap-1.5 rounded bg-sky-500/8 px-2 py-1 text-[11px] leading-snug text-sky-700 dark:text-sky-300">
      <span className="shrink-0">↳</span>
      <span className="min-w-0 truncate">
        {t("maneuverDetected", {
          maneuver: getManeuverLabel(first.kind, t),
          range: formatManeuverRange(first, t),
        })}
      </span>
      {extraCount > 0 && (
        <span className="text-muted-foreground shrink-0">
          {t("moreCount", { count: extraCount })}
        </span>
      )}
    </div>
  );
}

function RouteManeuverDetails({
  maneuvers,
}: {
  maneuvers: RouteManeuverDetection[];
}) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  if (maneuvers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
        {t("maneuversHeading")}
      </div>
      <div className="space-y-1.5">
        {maneuvers.map((maneuver) => (
          <div
            key={`${maneuver.kind}-${maneuver.startWaypointIndex}-${maneuver.endWaypointIndex}`}
            className="flex items-start gap-2 rounded bg-sky-500/8 px-2.5 py-2 text-xs leading-snug text-sky-800 dark:text-sky-300"
          >
            <span className="mt-px shrink-0">↳</span>
            <span className="min-w-0">
              <span className="block font-medium">
                {getManeuverLabel(maneuver.kind, t)}
              </span>
              <span className="text-muted-foreground block">
                {formatManeuverRange(maneuver, t)}
                {typeof maneuver.apexWaypointIndex === "number"
                  ? t("apexSuffix", { index: maneuver.apexWaypointIndex })
                  : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteWarningSummary({ warnings }: { warnings: RouteWarning[] }) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const grouped = useGroupedWarnings(warnings);
  if (grouped.length === 0) return null;

  const [kind, summary] =
    grouped
      .filter(([warningKind]) => isWarningKind(warningKind))
      .sort(([a], [b]) => getSummaryPriority(a) - getSummaryPriority(b))[0] ??
    grouped[0];
  const extraCount = grouped.length - 1;
  const warn = isWarningKind(kind);

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-1.5 rounded px-2 py-1 text-[11px] leading-snug",
        warn
          ? "bg-amber-500/8 text-amber-600 dark:text-amber-400"
          : "bg-muted/40 text-muted-foreground"
      )}
    >
      <span className="shrink-0">{warn ? "⚠" : "↳"}</span>
      <span className="min-w-0 truncate">
        {getWarningSummary(kind, summary.count, summary.first, t)}
      </span>
      {extraCount > 0 && (
        <span className="text-muted-foreground shrink-0">
          {t("moreCount", { count: extraCount })}
        </span>
      )}
    </div>
  );
}

function RouteWarningDetails({
  activeSegmentIndex,
  onJumpToSegment,
  warningSegments,
  warnings,
}: {
  activeSegmentIndex: number | null;
  onJumpToSegment: (segmentIndex: number) => void;
  warningSegments: ChartWarningMarker[];
  warnings: RouteWarning[];
}) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const grouped = useGroupedWarnings(warnings);

  if (grouped.length === 0) {
    return (
      <div className="text-muted-foreground rounded border border-dashed px-3 py-2 text-sm">
        {t("noWarnings")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {t("routeReviewHeading")}
        </div>
        <div className="space-y-1.5">
          {grouped.map(([kind, { count, first }]) => {
            const warn = isWarningKind(kind);
            const details = getWarningDetails(kind, t);
            return (
              <div
                key={kind}
                className={cn(
                  "flex items-start gap-2 rounded px-2.5 py-2 text-xs leading-snug",
                  warn
                    ? "bg-amber-500/8 text-amber-700 dark:text-amber-300"
                    : "bg-muted/40 text-muted-foreground"
                )}
              >
                <span className="mt-px shrink-0">{warn ? "⚠" : "↳"}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{details.title}</span>
                  <span className="text-muted-foreground block">
                    {getWarningSummary(kind, count, first, t)}
                  </span>
                  <span className="text-muted-foreground mt-1 block">
                    {details.problem}
                  </span>
                  <span className="text-muted-foreground mt-1 block">
                    {details.fix}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {warningSegments.length > 0 && (
        <div className="space-y-2">
          <div className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
            {t("warningSegmentsHeading")}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {warningSegments.map((segment) => (
              <button
                key={`${segment.kind}-${segment.segmentIndex}`}
                type="button"
                aria-label={t("jumpToSegment", {
                  segment: segment.segmentIndex + 1,
                })}
                onClick={() => onJumpToSegment(segment.segmentIndex)}
                className={cn(
                  "border-border/60 hover:bg-muted/60 focus-visible:ring-ring/40 flex min-h-10 cursor-pointer items-center gap-2 rounded border px-2.5 py-2 text-left text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  activeSegmentIndex === segment.segmentIndex &&
                    "border-primary/60 bg-primary/8"
                )}
              >
                <span
                  className="h-2 w-5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getRouteWarningSegmentColor(
                      segment.kind,
                      "var(--color-primary)"
                    ),
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {t("jumpToSegment", {
                      segment: segment.segmentIndex + 1,
                    })}
                  </span>
                  <span className="text-muted-foreground block truncate">
                    {segment.label}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RouteColorKey({ kinds }: { kinds: RouteWarningKind[] }) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const warningKinds = kinds.filter(
    (kind): kind is SegmentWarningKind => kind !== "flat" && kind !== "stub"
  );
  if (warningKinds.length === 0) return null;

  const uniqueKinds = Array.from(new Set(warningKinds));
  const items = [
    { color: "var(--color-primary)", label: t("normal") },
    ...uniqueKinds.map((kind) => ({
      color: getRouteWarningSegmentColor(kind, "var(--color-primary)"),
      label: getWarningShortLabel(kind, t),
    })),
  ];

  return (
    <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-tight">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="h-1.5 w-4 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function RouteMarkerKey({
  routeMarkers,
  warningMarkers,
}: {
  routeMarkers: ChartRouteMarker[];
  warningMarkers: ChartWarningMarker[];
}) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const timingColors = Array.from(
    new Set(
      routeMarkers
        .filter((marker) => marker.type === "timing")
        .map((marker) => marker.color)
    )
  );
  const hasTiming = timingColors.length > 0;
  const hasObstacles = routeMarkers.some(
    (marker) => marker.type === "obstacle"
  );
  const hasWarnings = warningMarkers.length > 0;
  if (!hasTiming && !hasObstacles && !hasWarnings) return null;

  const items = [
    ...(hasTiming
      ? [
          {
            background:
              timingColors.length === 1
                ? timingColors[0]
                : `linear-gradient(90deg, ${timingColors.join(", ")})`,
            label: t("timingMarkersLegend"),
          },
        ]
      : []),
    ...(hasObstacles
      ? [{ background: "#64748b", label: t("obstacleMarkersLegend") }]
      : []),
    ...(hasWarnings
      ? [{ background: "#f59e0b", label: t("warningMarkersLegend") }]
      : []),
  ];

  return (
    <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] leading-tight">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="size-2 rounded-full"
            style={{ background: item.background }}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </span>
      ))}
    </div>
  );
}

const VIEW_W = 400;
const VIEW_H = 120;
const PAD_LEFT = 36;
const PAD_RIGHT = 10;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = VIEW_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = VIEW_H - PAD_TOP - PAD_BOTTOM;

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((candidate) => candidate * mag);
  return candidates.find((candidate) => candidate >= raw) ?? candidates.at(-1)!;
}

function ElevationSvg({
  activeSegmentIndex,
  activeWaypointIndex,
  fillPath,
  height,
  interactive,
  minSample,
  maxSample,
  onClearHoveredRouteMarker,
  onClearHoveredWaypoint,
  onRouteMarkerHover,
  onRouteMarkerSelect,
  onWarningSegmentSelect,
  onWaypointHover,
  onWaypointSelect,
  routeMarkers,
  samples,
  toX,
  toY,
  warningMarkers,
  warningKindBySegment,
  xTicks,
  yTicks,
}: {
  activeSegmentIndex: number | null;
  activeWaypointIndex: number | null;
  fillPath: string;
  height: number;
  interactive: boolean;
  minSample: { d: number; z: number };
  maxSample: { d: number; z: number };
  onClearHoveredRouteMarker: () => void;
  onClearHoveredWaypoint: () => void;
  onRouteMarkerHover: (shapeId: string) => void;
  onRouteMarkerSelect: (shapeId: string) => void;
  onWarningSegmentSelect: (segmentIndex: number) => void;
  onWaypointHover: (idx: number) => void;
  onWaypointSelect: (idx: number) => void;
  samples: Array<{ d: number; z: number }>;
  toX: (d: number) => number;
  toY: (z: number) => number;
  routeMarkers: ChartRouteMarker[];
  warningMarkers: ChartWarningMarker[];
  warningKindBySegment: Map<number, SegmentWarningKind>;
  xTicks: Array<{ d: number; label: string }>;
  yTicks: Array<{ z: number; label: string }>;
}) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const id = useId().replaceAll(":", "");
  const fillId = `elev-fill-${id}`;
  const clipId = `elev-clip-${id}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={height}
      className="overflow-visible"
      aria-label={t("chartAriaLabel")}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-primary)"
            stopOpacity="0.35"
          />
          <stop
            offset="100%"
            stopColor="var(--color-primary)"
            stopOpacity="0.03"
          />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={PAD_LEFT} y={PAD_TOP} width={PLOT_W} height={PLOT_H} />
        </clipPath>
      </defs>

      {yTicks.map(({ z }) => (
        <line
          key={z}
          x1={PAD_LEFT}
          y1={toY(z).toFixed(2)}
          x2={PAD_LEFT + PLOT_W}
          y2={toY(z).toFixed(2)}
          stroke="currentColor"
          strokeOpacity={0.2}
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      ))}

      <path
        d={fillPath}
        fill={`url(#${fillId})`}
        clipPath={`url(#${clipId})`}
      />
      {samples.slice(1).map((sample, index) => {
        const previous = samples[index];
        if (!previous) return null;
        const warningKind = warningKindBySegment.get(index);
        const stroke = getRouteWarningSegmentColor(
          warningKind,
          "var(--color-primary)"
        );

        return (
          <path
            key={`segment-${index}`}
            d={`M${toX(previous.d).toFixed(2)},${toY(previous.z).toFixed(2)} L${toX(sample.d).toFixed(2)},${toY(sample.z).toFixed(2)}`}
            fill="none"
            stroke={stroke}
            strokeWidth={activeSegmentIndex === index ? "3.4" : "1.9"}
            strokeLinejoin="round"
            strokeLinecap="round"
            clipPath={`url(#${clipId})`}
          />
        );
      })}

      {interactive &&
        routeMarkers.map((marker) => {
          const markerSample = getPolylinePointAtDistance(samples, marker.d);
          const x = toX(marker.d);
          const y = toY(markerSample.z);

          return (
            <g
              key={marker.id}
              role="button"
              tabIndex={0}
              aria-label={marker.ariaLabel}
              onClick={() => onRouteMarkerSelect(marker.shapeId)}
              onFocus={() => onRouteMarkerHover(marker.shapeId)}
              onBlur={onClearHoveredRouteMarker}
              onMouseEnter={() => onRouteMarkerHover(marker.shapeId)}
              onMouseLeave={onClearHoveredRouteMarker}
              onKeyDown={(event) => {
                if (!isEnterOrSpace(event)) return;
                event.preventDefault();
                onRouteMarkerSelect(marker.shapeId);
              }}
              className="cursor-pointer outline-none"
            >
              <title>{marker.ariaLabel}</title>
              <path
                d={`M${x.toFixed(2)},${(y - 6).toFixed(2)} L${(x + 5).toFixed(2)},${y.toFixed(2)} L${x.toFixed(2)},${(y + 6).toFixed(2)} L${(x - 5).toFixed(2)},${y.toFixed(2)} Z`}
                fill={marker.color}
                stroke="var(--color-background)"
                strokeWidth="1.4"
                clipPath={`url(#${clipId})`}
              />
            </g>
          );
        })}

      {interactive &&
        warningMarkers.map((marker) => {
          const markerSample = getPolylinePointAtDistance(samples, marker.d);
          const x = toX(marker.d);
          const y = toY(markerSample.z);
          const color = getRouteWarningSegmentColor(
            marker.kind,
            "var(--color-primary)"
          );

          return (
            <g
              key={`${marker.kind}-${marker.segmentIndex}`}
              role="button"
              tabIndex={0}
              aria-label={marker.label}
              onClick={() => onWarningSegmentSelect(marker.segmentIndex)}
              onKeyDown={(event) => {
                if (!isEnterOrSpace(event)) return;
                event.preventDefault();
                onWarningSegmentSelect(marker.segmentIndex);
              }}
              className="cursor-pointer outline-none"
            >
              <title>{marker.label}</title>
              <path
                d={`M${x.toFixed(2)},${(y - 8).toFixed(2)} L${(x + 6).toFixed(2)},${(y + 4).toFixed(2)} L${(x - 6).toFixed(2)},${(y + 4).toFixed(2)} Z`}
                fill={color}
                stroke="var(--color-background)"
                strokeWidth="1.2"
                clipPath={`url(#${clipId})`}
              />
            </g>
          );
        })}

      {interactive &&
        samples.map((sample, index) => (
          <g
            key={`waypoint-${index}`}
            role="button"
            tabIndex={0}
            aria-label={t("waypointMarkerAria", { index })}
            onClick={() => onWaypointSelect(index)}
            onFocus={() => onWaypointHover(index)}
            onBlur={onClearHoveredWaypoint}
            onMouseEnter={() => onWaypointHover(index)}
            onMouseLeave={onClearHoveredWaypoint}
            onKeyDown={(event) => {
              if (!isEnterOrSpace(event)) return;
              event.preventDefault();
              onWaypointSelect(index);
            }}
            className="cursor-pointer outline-none"
          >
            <title>{t("waypointMarkerAria", { index })}</title>
            <circle
              cx={toX(sample.d)}
              cy={toY(sample.z)}
              r={activeWaypointIndex === index ? "4.6" : "3"}
              fill={
                activeWaypointIndex === index
                  ? "var(--color-primary)"
                  : "var(--color-background)"
              }
              stroke="var(--color-primary)"
              strokeWidth={activeWaypointIndex === index ? "2" : "1.3"}
            />
          </g>
        ))}

      {minSample.d !== maxSample.d && (
        <>
          <circle
            cx={toX(minSample.d)}
            cy={toY(minSample.z)}
            r="3"
            fill="var(--color-background)"
            stroke="var(--color-primary)"
            strokeWidth="1.5"
          />
          <text
            x={toX(minSample.d)}
            y={toY(minSample.z) + 10}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fillOpacity={0.7}
          >
            {minSample.z.toFixed(1)}m
          </text>
        </>
      )}

      <circle
        cx={toX(maxSample.d)}
        cy={toY(maxSample.z)}
        r="3"
        fill="var(--color-primary)"
        stroke="var(--color-background)"
        strokeWidth="1.5"
      />
      <text
        x={toX(maxSample.d)}
        y={toY(maxSample.z) - 5}
        textAnchor="middle"
        fontSize="10"
        fill="var(--color-primary)"
        fontWeight="600"
      >
        {maxSample.z.toFixed(1)}m
      </text>

      <line
        x1={PAD_LEFT}
        y1={PAD_TOP + PLOT_H}
        x2={PAD_LEFT + PLOT_W}
        y2={PAD_TOP + PLOT_H}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={1}
      />
      <line
        x1={PAD_LEFT}
        y1={PAD_TOP}
        x2={PAD_LEFT}
        y2={PAD_TOP + PLOT_H}
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={1}
      />

      {xTicks.map(({ d, label }) => (
        <g key={d}>
          <line
            x1={toX(d)}
            y1={PAD_TOP + PLOT_H}
            x2={toX(d)}
            y2={PAD_TOP + PLOT_H + 3}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <text
            x={toX(d)}
            y={VIEW_H - 4}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            fillOpacity={0.7}
          >
            {label}
          </text>
        </g>
      ))}

      {yTicks.map(({ z, label }) => (
        <g key={z}>
          <line
            x1={PAD_LEFT - 3}
            y1={toY(z)}
            x2={PAD_LEFT}
            y2={toY(z)}
            stroke="currentColor"
            strokeOpacity={0.3}
            strokeWidth={1}
          />
          <text
            x={PAD_LEFT - 5}
            y={toY(z) + 3}
            textAnchor="end"
            fontSize="10"
            fill="currentColor"
            fillOpacity={0.7}
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ElevationChart({ className }: { className?: string }) {
  const t = useTranslations("inspector.elevationChart") as unknown as Translate;
  const { unitSystem } = useMeasurementUnitSystem();
  const path = useEditor(selectPrimaryPolyline);
  const design = useEditor((state) => state.track.design);
  const designShapes = useEditor(selectDesignShapes);
  const activeSegmentSelection = useEditor(
    (state) => state.ui.segmentSelection
  );
  const activeVertexSelection = useEditor((state) => state.ui.vertexSelection);
  const setHoveredShapeId = useEditor((state) => state.setHoveredShapeId);
  const setHoveredWaypoint = useEditor((state) => state.setHoveredWaypoint);
  const setSegmentSelection = useEditor((state) => state.setSegmentSelection);
  const setSelection = useEditor((state) => state.setSelection);
  const setVertexSelection = useEditor((state) => state.setVertexSelection);
  const isMobile = useIsMobile();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  const warnings = useMemo(
    () => (path ? getPolylineRouteWarnings(path) : []),
    [path]
  );
  const warningKinds = useMemo(
    () => warnings.map((warning) => warning.kind),
    [warnings]
  );
  const warningSegments = useMemo(
    () => (path ? getPolylineRouteWarningSegmentVisuals(path) : []),
    [path]
  );
  const maneuvers = useMemo(
    () => (path ? getPolylineManeuverDetections(path) : []),
    [path]
  );
  const warningKindBySegment = useMemo(
    () =>
      new Map(
        warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
      ),
    [warningSegments]
  );
  const activeSegmentIndex =
    path && activeSegmentSelection?.shapeId === path.id
      ? activeSegmentSelection.segmentIndex
      : null;
  const activeWaypointIndex =
    path && activeVertexSelection?.shapeId === path.id
      ? activeVertexSelection.idx
      : null;

  const chartData = useMemo(() => {
    if (!path) return null;
    const samples = getPolylineElevationSamples(path);
    if (samples.length < 2) return null;

    const totalDist = getPolylineTotalLength2D(path);
    const rawMinZ = samples.reduce(
      (a, sample) => Math.min(a, sample.z),
      Infinity
    );
    const rawMaxZ = samples.reduce(
      (a, sample) => Math.max(a, sample.z),
      -Infinity
    );
    const zRange = rawMaxZ - rawMinZ;
    const zPad = zRange < 0.5 ? 0.5 : zRange * 0.12;
    const minZ = rawMinZ - zPad;
    const maxZ = rawMaxZ + zPad;
    const zSpan = maxZ - minZ || 1;

    const toX = (d: number) => PAD_LEFT + (d / (totalDist || 1)) * PLOT_W;
    const toY = (z: number) => PAD_TOP + PLOT_H - ((z - minZ) / zSpan) * PLOT_H;

    const linePath = samples
      .map(
        ({ d, z }, index) =>
          `${index === 0 ? "M" : "L"}${toX(d).toFixed(2)},${toY(z).toFixed(2)}`
      )
      .join(" ");

    const firstX = toX(samples[0].d);
    const lastX = toX(samples[samples.length - 1].d);
    const baselineY = (PAD_TOP + PLOT_H).toFixed(2);
    const fillPath =
      linePath +
      ` L${lastX.toFixed(2)},${baselineY} L${firstX.toFixed(2)},${baselineY} Z`;

    const xStep = niceStep(totalDist, 5);
    const xTicks: Array<{ d: number; label: string }> = [];
    for (let d = 0; d <= totalDist + xStep * 0.01; d += xStep) {
      const clampedDistance = Math.min(d, totalDist);
      xTicks.push({ d: clampedDistance, label: clampedDistance.toFixed(0) });
      if (clampedDistance >= totalDist) break;
    }

    const yStep = niceStep(zSpan, 4);
    const yTickStart = Math.ceil(minZ / yStep) * yStep;
    const yTicks: Array<{ z: number; label: string }> = [];
    for (let z = yTickStart; z <= maxZ + yStep * 0.01; z += yStep) {
      if (z >= minZ - 0.001 && z <= maxZ + 0.001) {
        yTicks.push({ z, label: z.toFixed(1) });
      }
    }

    const minSample = samples.reduce(
      (a, sample) => (sample.z < a.z ? sample : a),
      samples[0]
    );
    const maxSample = samples.reduce(
      (a, sample) => (sample.z > a.z ? sample : a),
      samples[0]
    );

    return {
      fillPath,
      samples,
      totalDist,
      rawMinZ,
      rawMaxZ,
      toX,
      toY,
      xTicks,
      yTicks,
      minSample,
      maxSample,
    };
  }, [path]);

  const routeMarkers = useMemo<ChartRouteMarker[]>(() => {
    if (!path) return [];

    const primaryPolylineId = designShapes.find(
      (shape): shape is PolylineShape => shape.kind === "polyline"
    )?.id;
    const obstacleNumberMap =
      path.id === primaryPolylineId ? getObstacleNumberMap(design) : null;
    const markerCandidates = designShapes
      .filter((shape) => shape.id !== path.id)
      .flatMap((shape): ChartRouteMarkerCandidate[] => {
        const marker = getShapeTimingMarker(shape);
        const projection = projectPointOntoRoute(path, shape);
        if (!projection) return [];
        if (projection.pathDistance > getRouteMarkerTolerance(shape)) return [];

        if (marker) {
          return [
            {
              color: getTimingMarkerColor(marker),
              d: projection.d,
              id: `timing-${shape.id}`,
              marker,
              shapeId: shape.id,
              type: "timing",
            },
          ];
        }

        if (!isNumberedObstacle(shape)) return [];

        return [
          {
            color: "#64748b",
            d: projection.d,
            id: `obstacle-${shape.id}`,
            obstacleNumber: obstacleNumberMap?.get(shape.id),
            shapeId: shape.id,
            type: "obstacle",
          },
        ];
      });

    let splitIndex = 0;
    let fallbackObstacleIndex = 0;
    return markerCandidates
      .sort(
        (left, right) => left.d - right.d || left.id.localeCompare(right.id)
      )
      .map((marker) => {
        if (marker.type === "timing") {
          if (marker.marker.role === "split") splitIndex += 1;
          const title = getTimingMarkerTitle(marker.marker, splitIndex);
          const { marker: _marker, ...routeMarker } = marker;
          return {
            ...routeMarker,
            ariaLabel: t("timingMarkerAria", { label: title }),
          };
        }

        fallbackObstacleIndex += 1;
        const { obstacleNumber, ...routeMarker } = marker;
        return {
          ...routeMarker,
          ariaLabel: t("obstacleMarkerAria", {
            index: obstacleNumber ?? fallbackObstacleIndex,
          }),
        };
      });
  }, [design, designShapes, path, t]);

  const warningMarkers = useMemo<ChartWarningMarker[]>(() => {
    if (!path) return [];
    const samples = getPolylineElevationSamples(path);

    return warningSegments.flatMap((segment): ChartWarningMarker[] => {
      const start = samples[segment.segmentIndex];
      const end = samples[segment.segmentIndex + 1];
      if (!start || !end) return [];
      return [
        {
          d: start.d + (end.d - start.d) / 2,
          kind: segment.kind,
          label: t("warningMarkerAria", {
            segment: segment.segmentIndex + 1,
            warning: getWarningShortLabel(segment.kind, t),
          }),
          segmentIndex: segment.segmentIndex,
        },
      ];
    });
  }, [path, t, warningSegments]);

  const selectWaypoint = useCallback(
    (idx: number) => {
      if (!path) return;
      setSelection([path.id]);
      setVertexSelection({ shapeId: path.id, idx });
    },
    [path, setSelection, setVertexSelection]
  );

  const selectWarningSegment = useCallback(
    (segmentIndex: number) => {
      if (!path) return;
      const point = getSegmentMidpoint(path, segmentIndex);
      if (!point) return;
      setSelection([path.id]);
      setSegmentSelection({ shapeId: path.id, segmentIndex, point });
      setDetailsOpen(false);
    },
    [path, setSegmentSelection, setSelection]
  );

  const selectRouteMarker = useCallback(
    (shapeId: string) => {
      setSelection([shapeId]);
    },
    [setSelection]
  );

  if (!path || !chartData) {
    return (
      <div
        className={cn(
          "border-border/40 bg-card text-muted-foreground -mx-4 flex shrink-0 items-center justify-center border-t px-4 py-4 text-xs lg:-mx-3 lg:px-3",
          className
        )}
      >
        {t("noRouteSelected")}
      </div>
    );
  }

  const {
    fillPath,
    samples,
    totalDist,
    rawMinZ,
    rawMaxZ,
    toX,
    toY,
    xTicks,
    yTicks,
    minSample,
    maxSample,
  } = chartData;

  const chartProps = {
    activeSegmentIndex,
    activeWaypointIndex,
    fillPath,
    interactive: true,
    minSample,
    maxSample,
    onClearHoveredRouteMarker: () => setHoveredShapeId(null),
    onClearHoveredWaypoint: () => setHoveredWaypoint(null),
    onRouteMarkerHover: setHoveredShapeId,
    onRouteMarkerSelect: selectRouteMarker,
    onWarningSegmentSelect: selectWarningSegment,
    onWaypointHover: (idx: number) =>
      setHoveredWaypoint({ shapeId: path.id, idx }),
    onWaypointSelect: selectWaypoint,
    routeMarkers,
    samples,
    toX,
    toY,
    warningMarkers,
    warningKindBySegment,
    xTicks,
    yTicks,
  };
  const detailsContent = (
    <div className="space-y-4">
      <section>
        <div className="text-muted-foreground mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            {t("routeDistance", {
              distance: formatMeasurement(totalDist, unitSystem, {
                precision: 1,
              }),
            })}
          </span>
          <span>
            {t("elevationRange", {
              min: formatMeasurement(rawMinZ, unitSystem, { precision: 1 }),
              max: formatMeasurement(rawMaxZ, unitSystem, { precision: 1 }),
            })}
          </span>
        </div>
        <ElevationSvg {...chartProps} height={isMobile ? 180 : 220} />
      </section>
      <RouteColorKey kinds={warningKinds} />
      <RouteMarkerKey
        routeMarkers={routeMarkers}
        warningMarkers={warningMarkers}
      />
      <RouteManeuverDetails maneuvers={maneuvers} />
      <RouteWarningDetails
        activeSegmentIndex={activeSegmentIndex}
        onJumpToSegment={selectWarningSegment}
        warningSegments={warningMarkers}
        warnings={warnings}
      />
    </div>
  );
  const detailsOverlay = isMobile ? (
    <MobileDrawer
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      title={t("title")}
      subtitle={t("subtitle")}
    >
      {detailsContent}
    </MobileDrawer>
  ) : (
    <DesktopModal
      open={detailsOpen}
      onOpenChange={setDetailsOpen}
      title={t("title")}
      subtitle={t("subtitle")}
      maxWidth="max-w-2xl"
      panelClassName="px-7 py-7"
    >
      {detailsContent}
    </DesktopModal>
  );

  return (
    <div
      className={cn(
        "border-border/40 bg-card -mx-4 shrink-0 border-t px-4 py-3 lg:-mx-3 lg:px-3",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {t("title")}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-muted-foreground truncate text-[11px]">
            {formatMeasurement(totalDist, unitSystem, { precision: 1 })} ·{" "}
            {formatMeasurement(rawMinZ, unitSystem, { precision: 1 })}–
            {formatMeasurement(rawMaxZ, unitSystem, { precision: 1 })}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-muted/70 hover:text-foreground focus-visible:bg-muted/70 h-6 w-6 shrink-0"
                aria-label={t("openDetailsAria")}
                onClick={() => setDetailsOpen(true)}
              >
                <Info className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {t("detailsTooltip")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <RouteManeuverSummary maneuvers={maneuvers} />
      <RouteWarningSummary warnings={warnings} />
      <RouteColorKey kinds={warningKinds} />
      <ElevationSvg {...chartProps} height={VIEW_H} interactive={false} />
      {portalRoot && detailsOpen
        ? createPortal(detailsOverlay, portalRoot)
        : null}
    </div>
  );
}
