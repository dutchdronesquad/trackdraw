"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  deriveGroundMarkers,
  type GroundMarkerPreview,
} from "@/lib/track/ground-markers";
import type { FieldSpec, PolylineShape, Shape } from "@/lib/types";
import { useEditor } from "@/store/editor";

export function useGroundMarkerPreview(shapes: Shape[], field: FieldSpec) {
  const designId = useEditor((state) => state.track.design.id);
  const [choice, setChoice] = useState<{ designId: string; routeId: string }>();
  const routes = useMemo(
    () =>
      shapes.filter(
        (shape): shape is PolylineShape =>
          shape.kind === "polyline" && shape.points.length >= 2
      ),
    [shapes]
  );
  const route =
    choice?.designId === designId
      ? routes.find(({ id }) => id === choice.routeId)
      : undefined;
  const preview = useMemo(
    () => route && deriveGroundMarkers(route, shapes, field),
    [field, route, shapes]
  );

  return {
    routes,
    route,
    preview,
    setRouteId: (routeId: string) =>
      setChoice(routeId ? { designId, routeId } : undefined),
  };
}

export function GroundMarkerControls({
  routes,
  route,
  preview,
  setRouteId,
}: {
  routes: PolylineShape[];
  route?: PolylineShape;
  preview?: GroundMarkerPreview;
  setRouteId: (routeId: string) => void;
}) {
  const t = useTranslations("editor.preview3dOverlay.groundMarkers");
  if (!routes.length) return null;

  return (
    <div className="absolute top-12 left-3 z-20 max-w-[min(15rem,calc(100%_-_1.5rem))] rounded-lg border border-white/15 bg-slate-950/90 p-2 text-xs text-white shadow-lg">
      <label className="flex flex-wrap items-center gap-2">
        {t("label")}
        <select
          className="min-h-8 max-w-full min-w-0 rounded border border-white/30 bg-slate-900 px-2"
          value={route?.id ?? ""}
          onChange={(event) => setRouteId(event.target.value)}
        >
          <option value="">{t("off")}</option>
          {routes.map((item, index) => (
            <option key={item.id} value={item.id}>
              {item.name
                ? t("namedRoute", { number: index + 1, name: item.name })
                : t("route", { number: index + 1 })}
            </option>
          ))}
        </select>
      </label>
      {preview && (
        <div className="mt-1.5 space-y-1 text-slate-200" role="status">
          <p>
            {preview.limited
              ? t("limit")
              : preview.markers.length
                ? t("count", { count: preview.markers.length })
                : t("empty")}
          </p>
          {!preview.limited && <p>{t("projection")}</p>}
          {preview.omissions.nearPass > 0 && <p>{t("nearPass")}</p>}
          {preview.omissions.elevation > 0 && <p>{t("elevation")}</p>}
        </div>
      )}
    </div>
  );
}
