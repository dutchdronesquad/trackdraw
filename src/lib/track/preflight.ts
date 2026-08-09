import {
  getRequiredInventoryCounts,
  inventoryKinds,
  normalizeInventoryProfile,
} from "@/lib/planning/inventory";
import { getDesignShapes } from "@/lib/track/design";
import { getObstacleNumberingReport } from "@/lib/track/obstacleNumbering";
import { isNumberedTrackObstacle } from "@/lib/track/items/registry";
import {
  getOverlayPrepReport,
  type OverlayPrepIssueType,
} from "@/lib/track/overlay-prep";
import {
  getPolylineRouteWarnings,
  type RouteWarningKind,
} from "@/lib/track/polyline-derived";
import { getDesignTimingMarkers } from "@/lib/track/timing";
import type {
  InventoryShapeKind,
  PolylineShape,
  TrackDesign,
} from "@/lib/types";

export type TrackPreflightCategory = "route" | "timing" | "inventory";
export type TrackPreflightStatus = "incomplete" | "review" | "ready";

export type TrackPreflightIssue =
  | {
      category: "route";
      id: string;
      routeId?: string;
      shapeIds?: string[];
      type: "missing-route" | "no-route-matches" | "off-route";
    }
  | {
      category: "route";
      id: string;
      routeId: string;
      shapeIds?: string[];
      type: "route-warning";
      warningKind: Exclude<RouteWarningKind, "flat">;
      waypointIndex?: number;
    }
  | {
      category: "timing";
      id: string;
      routeId?: string;
      shapeIds?: string[];
      timingIssueType: OverlayPrepIssueType;
      type: "timing";
    }
  | {
      category: "inventory";
      id: string;
      inventoryKind: InventoryShapeKind;
      missing: number;
      routeId?: string;
      shapeIds: string[];
      type: "inventory-shortage";
    };

export interface TrackPreflightCheck {
  active: boolean;
  category: TrackPreflightCategory;
  issueCount: number;
}

export interface TrackPreflightReport {
  checks: TrackPreflightCheck[];
  issues: TrackPreflightIssue[];
  status: TrackPreflightStatus;
}

function getRouteIssues(design: TrackDesign): TrackPreflightIssue[] {
  const shapes = getDesignShapes(design);
  const routes = shapes.filter(
    (shape): shape is PolylineShape => shape.kind === "polyline"
  );
  const numbering = getObstacleNumberingReport(design);
  const issues: TrackPreflightIssue[] = [];

  if (
    numbering.status === "missing-route" &&
    numbering.totalNumberedObstacleCount > 0 &&
    routes.length === 0
  ) {
    issues.push({
      category: "route",
      id: "route:missing",
      shapeIds: shapes.filter(isNumberedTrackObstacle).map((shape) => shape.id),
      type: "missing-route",
    });
  } else if (numbering.status === "no-route-matches") {
    issues.push({
      category: "route",
      id: "route:no-matches",
      routeId: numbering.primaryPolylineId ?? undefined,
      shapeIds: numbering.issues.map((issue) => issue.shapeId),
      type: "no-route-matches",
    });
  } else if (numbering.status === "partial") {
    for (const issue of numbering.issues) {
      issues.push({
        category: "route",
        id: `route:off-route:${issue.shapeId}`,
        routeId: numbering.primaryPolylineId ?? undefined,
        shapeIds: [issue.shapeId],
        type: "off-route",
      });
    }
  }

  for (const route of routes) {
    for (const [index, warning] of getPolylineRouteWarnings(route).entries()) {
      if (warning.kind === "flat") continue;
      issues.push({
        category: "route",
        id: `route:warning:${route.id}:${warning.kind}:${warning.waypointIndex ?? index}`,
        routeId: route.id,
        type: "route-warning",
        warningKind: warning.kind,
        waypointIndex: warning.waypointIndex,
      });
    }
  }

  return issues;
}

function getTimingIssues(design: TrackDesign): TrackPreflightIssue[] {
  if (getDesignTimingMarkers(design).length === 0) return [];

  return getOverlayPrepReport(design).issues.map((issue, index) => ({
    category: "timing" as const,
    id: `timing:${issue.type}:${issue.shapeId ?? issue.timingId ?? index}`,
    routeId: issue.routeId,
    shapeIds: issue.shapeIds ?? (issue.shapeId ? [issue.shapeId] : undefined),
    timingIssueType: issue.type,
    type: "timing" as const,
  }));
}

function getInventoryIssues(design: TrackDesign): TrackPreflightIssue[] {
  const available = normalizeInventoryProfile(design.inventory);
  const inventoryActive = inventoryKinds.some((kind) => available[kind] > 0);
  if (!inventoryActive) return [];

  const shapes = getDesignShapes(design);
  const required = getRequiredInventoryCounts(shapes);

  return inventoryKinds.flatMap((kind) => {
    const missing = Math.max(0, required[kind] - available[kind]);
    if (missing === 0) return [];

    return [
      {
        category: "inventory" as const,
        id: `inventory:${kind}`,
        inventoryKind: kind,
        missing,
        shapeIds: shapes
          .filter((shape) => shape.kind === kind)
          .map((shape) => shape.id),
        type: "inventory-shortage" as const,
      },
    ];
  });
}

export function getTrackPreflightReport(
  design: TrackDesign
): TrackPreflightReport {
  const shapes = getDesignShapes(design);
  if (shapes.length === 0) {
    return {
      checks: [
        { active: false, category: "route", issueCount: 0 },
        { active: false, category: "timing", issueCount: 0 },
        { active: false, category: "inventory", issueCount: 0 },
      ],
      issues: [],
      status: "incomplete",
    };
  }

  const routeIssues = getRouteIssues(design);
  const timingActive = getDesignTimingMarkers(design).length > 0;
  const timingIssues = getTimingIssues(design);
  const inventory = normalizeInventoryProfile(design.inventory);
  const inventoryActive = inventoryKinds.some((kind) => inventory[kind] > 0);
  const inventoryIssues = getInventoryIssues(design);
  const issues = [...routeIssues, ...timingIssues, ...inventoryIssues];

  return {
    checks: [
      {
        active: true,
        category: "route",
        issueCount: routeIssues.length,
      },
      {
        active: timingActive,
        category: "timing",
        issueCount: timingIssues.length,
      },
      {
        active: inventoryActive,
        category: "inventory",
        issueCount: inventoryIssues.length,
      },
    ],
    issues,
    status: issues.length > 0 ? "review" : "ready",
  };
}
