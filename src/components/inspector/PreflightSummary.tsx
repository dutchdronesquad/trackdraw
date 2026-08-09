"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import type {
  TrackPreflightIssue,
  TrackPreflightReport,
} from "@/lib/track/preflight";
import type { Shape } from "@/lib/types";
import { cn } from "@/lib/utils";

function getRouteWarningLabel(
  issue: Extract<TrackPreflightIssue, { type: "route-warning" }>,
  t: ReturnType<typeof useTranslations<"inspector">>
) {
  switch (issue.warningKind) {
    case "stub":
      return t("elevationChart.warnings.stub.shortLabel");
    case "steep":
      return t("elevationChart.warnings.steep.shortLabel");
    case "hairpin":
      return t("elevationChart.warnings.hairpin.shortLabel");
    case "close-points":
      return t("elevationChart.warnings.close-points.shortLabel");
    case "spacing-shift":
      return t("elevationChart.warnings.spacing-shift.shortLabel");
    case "rhythm-break":
      return t("elevationChart.warnings.rhythm-break.shortLabel");
  }
}

function getTimingIssueLabel(
  issue: Extract<TrackPreflightIssue, { type: "timing" }>,
  t: ReturnType<typeof useTranslations<"inspector">>
) {
  switch (issue.timingIssueType) {
    case "duplicate-start-finish":
      return t("preflight.issues.duplicateStartFinish");
    case "duplicate-timing-id":
      return t("preflight.issues.duplicateTimingId");
    case "missing-route":
      return t("preflight.issues.timingMissingRoute");
    case "missing-split-id":
      return t("preflight.issues.missingSplitId");
    case "missing-start-finish":
      return t("preflight.issues.missingStartFinish");
    case "multiple-routes":
      return t("preflight.issues.multipleRoutes");
    case "timing-point-off-route":
      return t("preflight.issues.timingPointOffRoute");
  }
}

function getIssueLabel(
  issue: TrackPreflightIssue,
  shapesById: Map<string, Shape>,
  t: ReturnType<typeof useTranslations<"inspector">>,
  tShapes: Translate
) {
  if (issue.type === "route-warning") {
    return getRouteWarningLabel(issue, t);
  }
  if (issue.type === "timing") {
    return getTimingIssueLabel(issue, t);
  }
  if (issue.type === "inventory-shortage") {
    return t("preflight.issues.inventoryShortage", {
      count: issue.missing,
      kind: getShapeKindLabel(issue.inventoryKind, tShapes),
    });
  }
  if (issue.type === "missing-route") {
    return t("preflight.issues.missingRoute");
  }
  if (issue.type === "no-route-matches") {
    return t("preflight.issues.noRouteMatches");
  }

  const shape = issue.shapeIds?.[0] ? shapesById.get(issue.shapeIds[0]) : null;
  return t("preflight.issues.offRoute", {
    name:
      shape?.name?.trim() ||
      (shape ? getShapeKindLabel(shape.kind, tShapes) : t("tabs.selection")),
  });
}

export function PreflightSummary({
  report,
  shapes,
  setSelection,
}: {
  report: TrackPreflightReport;
  shapes: Shape[];
  setSelection: (ids: string[]) => void;
}) {
  const t = useTranslations("inspector");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const [open, setOpen] = useState(false);
  const shapesById = useMemo(
    () => new Map(shapes.map((shape) => [shape.id, shape])),
    [shapes]
  );
  const issueCount = report.issues.length;
  const title = t(`preflight.status.${report.status}.title`);
  const description =
    report.status === "review"
      ? t("preflight.status.review.description", { count: issueCount })
      : t(`preflight.status.${report.status}.description`);
  const statusClasses =
    report.status === "review"
      ? "border-amber-500/25 bg-amber-500/8"
      : report.status === "ready"
        ? "border-emerald-500/20 bg-emerald-500/8"
        : "border-border/45 bg-muted/25";

  const handleIssueClick = (issue: TrackPreflightIssue) => {
    const ids = issue.shapeIds?.length
      ? issue.shapeIds
      : issue.routeId
        ? [issue.routeId]
        : [];
    if (ids.length > 0) setSelection(ids);
  };

  return (
    <section aria-labelledby="track-preflight-title" className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="track-preflight-details"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "focus-visible:ring-ring/40 flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden",
          statusClasses
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md",
            report.status === "review"
              ? "bg-amber-500/12 text-amber-600"
              : report.status === "ready"
                ? "bg-emerald-500/12 text-emerald-600"
                : "bg-muted text-muted-foreground"
          )}
        >
          {report.status === "review" ? (
            <AlertTriangle className="size-3.5" />
          ) : report.status === "ready" ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <CircleDashed className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              id="track-preflight-title"
              className="text-foreground text-xs font-semibold"
            >
              {title}
            </span>
            <span className="text-muted-foreground/65 text-[10px] font-medium tracking-[0.08em] uppercase">
              {t("preflight.title")}
            </span>
          </span>
          <span className="text-muted-foreground/78 mt-0.5 block text-[11px] leading-snug">
            {description}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      <div
        id="track-preflight-details"
        hidden={!open}
        className="border-border/35 overflow-hidden rounded-lg border"
      >
        <div className="border-border/30 bg-muted/20 flex flex-wrap gap-x-3 gap-y-1 border-b px-3 py-2">
          {report.checks.map((check) => (
            <span
              key={check.category}
              className="text-muted-foreground text-[10px] font-medium"
            >
              {t(`preflight.categories.${check.category}`)} ·{" "}
              {check.active ? check.issueCount : t("preflight.checkInactive")}
            </span>
          ))}
        </div>
        {report.issues.length > 0 ? (
          <div className="divide-border/25 divide-y">
            {report.issues.map((issue) => {
              const actionable = Boolean(
                issue.shapeIds?.length || issue.routeId
              );
              return (
                <button
                  key={issue.id}
                  type="button"
                  disabled={!actionable}
                  onClick={() => handleIssueClick(issue)}
                  className="hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-ring/40 flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-amber-600"
                  />
                  <span className="min-w-0 flex-1">
                    {getIssueLabel(issue, shapesById, t, tShapes)}
                  </span>
                  {actionable ? (
                    <span className="text-muted-foreground/60 text-[10px]">
                      {t("preflight.openIssue")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground px-3 py-3 text-[11px]">
            {report.status === "incomplete"
              ? t("preflight.emptyDetails")
              : t("preflight.noIssues")}
          </p>
        )}
      </div>
    </section>
  );
}
