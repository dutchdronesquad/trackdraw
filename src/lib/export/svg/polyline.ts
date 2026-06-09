import { DEFAULT_POLYLINE_STROKE_WIDTH } from "@/lib/track/constants";
import {
  getPolyline2DDerived,
  getRouteWarningSegmentColor,
  getPolylineRouteWarningSegmentVisuals,
  getPolylineSmoothSegmentPointsPx,
} from "@/lib/track/polyline-derived";
import type { PolylineShape } from "@/lib/types";
import { m } from "./utils";

export function polylineToSvg(
  s: PolylineShape,
  ppm: number,
  showWarningVisuals = false
): string {
  const pts = getPolyline2DDerived(s).smoothPoints;
  if (pts.length < 2) return "";
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${m(p.x, ppm)},${m(p.y, ppm)}`)
    .join(" ");
  const sw = m(s.strokeWidth ?? DEFAULT_POLYLINE_STROKE_WIDTH, ppm);
  const color = s.color ?? "#3b82f6";
  const closed = s.closed ? " Z" : "";
  const warningSegments = showWarningVisuals
    ? getPolylineRouteWarningSegmentVisuals(s)
    : [];
  const warningKindBySegment = new Map(
    warningSegments.map((segment) => [segment.segmentIndex, segment.kind])
  );
  const smoothSegmentPx = showWarningVisuals
    ? getPolylineSmoothSegmentPointsPx(s, ppm)
    : [];
  const segmentMarkup =
    showWarningVisuals && warningSegments.length
      ? smoothSegmentPx
          .map((points, segmentIndex) => {
            if (!points || points.length < 4) return "";
            const warningKind = warningKindBySegment.get(segmentIndex);
            const stroke = getRouteWarningSegmentColor(warningKind, color);
            const segmentPath = points
              .reduce<string[]>((commands, value, index) => {
                if (index % 2 === 0) {
                  commands.push(
                    `${index === 0 ? "M" : "L"}${value},${points[index + 1]}`
                  );
                }
                return commands;
              }, [])
              .join(" ");
            return `<path d="${segmentPath}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
          })
          .join("")
      : "";

  return `<g>
    <path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw * 2}" stroke-opacity="0.12" stroke-linecap="round" stroke-linejoin="round"/>
    ${
      showWarningVisuals && warningSegments.length
        ? segmentMarkup
        : `<path d="${d}${closed}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
  </g>`;
}
