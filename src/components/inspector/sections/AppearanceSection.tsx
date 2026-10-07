"use client";
import { ExternalLink, Info, RotateCw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  discoverAppearances,
  loadAppearance,
  appearanceKey,
  getAppearanceTemplate,
  type AppearanceChoice,
} from "@trackdraw/schema/appearance/registry";
import {
  inspectorSelectTriggerClass,
  inspectorSelectItemClass,
} from "@/components/inspector/shared";
import { getShapeArtworkReference } from "@/lib/track/appearance";
import { useShapeAppearance } from "@/hooks/useShapeAppearance";
import { Section } from "@/components/inspector/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OBSTACLE_ASSETS_URL } from "@trackdraw/schema/assets/asset-url";
import type { Shape } from "@/lib/types";

type AppearanceSectionProps =
  | { shape: Shape; updateShape: (id: string, patch: Partial<Shape>) => void }
  | {
      shapes: Shape[];
      updateShapes: (ids: string[], patch: Partial<Shape>) => void;
    };

export function AppearanceSection(props: AppearanceSectionProps) {
  const shapes = "shape" in props ? [props.shape] : props.shapes;
  const compatible = shapes.filter((shape) => getAppearanceTemplate(shape));
  const editable = compatible.filter((shape) => !shape.locked);
  const shape = editable[0] ?? compatible[0] ?? shapes[0];
  const t = useTranslations("inspector.appearance");
  const [choices, setChoices] = useState<AppearanceChoice[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const resolved = useShapeAppearance(shape);
  const template = getAppearanceTemplate(shape);
  useEffect(() => {
    if (!template) return;
    let active = true;
    discoverAppearances()
      .then((items) => {
        if (active) {
          setChoices(items);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("failed");
      });
    return () => {
      active = false;
    };
  }, [template, attempt]);
  const reference = getShapeArtworkReference(shape);
  const keys = editable.map((item) =>
    item.appearance?.templateId === getAppearanceTemplate(item)
      ? appearanceKey(item.appearance)
      : "automatic"
  );
  const mixed = keys.some((key) => key !== keys[0]);
  const selected = mixed
    ? ""
    : (keys[0] ??
      (shape.appearance ? appearanceKey(shape.appearance) : "automatic"));
  const available = choices.filter(
    (choice) =>
      choice.reference.templateId === template &&
      !(
        choice.reference.collectionId === "multigp" &&
        [
          "standard-gate",
          "standard-gate-red",
          "championship-gate",
          "championship-gate-red",
        ].includes(choice.reference.textureId ?? "")
      )
  );
  const unavailable =
    !template ||
    status === "failed" ||
    (reference && !resolved && status === "ready");
  const canRetry =
    status === "failed" || (reference && !resolved && status === "ready");
  const retry = () => {
    setStatus("loading");
    setAttempt((value) => value + 1);
    if (reference)
      void loadAppearance(reference)
        .then(() => setStatus("ready"))
        .catch(() => setStatus("failed"));
  };
  if (!template) return null;
  return (
    <Section title={t("title")} defaultOpen>
      <div className="space-y-2">
        {!mixed && resolved?.panels.top ? (
          <Image
            key={resolved.panels.top}
            src={`${OBSTACLE_ASSETS_URL}${resolved.panels.top.slice("/assets/registry".length)}`}
            alt=""
            width={480}
            height={96}
            unoptimized
            className="h-14 w-full rounded-md object-contain lg:h-12"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        ) : null}
        <Select
          value={selected}
          disabled={editable.length === 0}
          onValueChange={(value) => {
            if (value === "automatic") {
              if ("updateShape" in props)
                props.updateShape(shape.id, { appearance: undefined });
              else
                props.updateShapes(
                  editable.map((item) => item.id),
                  { appearance: undefined }
                );
              return;
            }
            const choice = available.find(
              (entry) => appearanceKey(entry.reference) === value
            );
            if (!choice) return;
            if ("updateShape" in props)
              props.updateShape(shape.id, { appearance: choice.reference });
            else
              props.updateShapes(
                editable
                  .filter(
                    (item) =>
                      getAppearanceTemplate(item) ===
                      choice.reference.templateId
                  )
                  .map((item) => item.id),
                { appearance: choice.reference }
              );
            setStatus("loading");
            void loadAppearance(choice.reference)
              .then(() => setStatus("ready"))
              .catch(() => setStatus("failed"));
          }}
        >
          <SelectTrigger
            aria-label={t("label")}
            className={inspectorSelectTriggerClass}
          >
            <SelectValue placeholder={t("mixed")} />
          </SelectTrigger>
          <SelectContent>
            {template ? (
              <SelectItem
                value="automatic"
                className={inspectorSelectItemClass}
              >
                {t("automatic")}
              </SelectItem>
            ) : null}
            {shape.appearance?.templateId === template &&
            !mixed &&
            !available.some(
              (entry) => appearanceKey(entry.reference) === selected
            ) ? (
              <SelectItem value={selected} className={inspectorSelectItemClass}>
                {resolved?.collectionName ??
                  reference?.collectionId ??
                  t("saved")}
              </SelectItem>
            ) : null}
            {available.map((choice) => (
              <SelectItem
                key={appearanceKey(choice.reference)}
                value={appearanceKey(choice.reference)}
                className={inspectorSelectItemClass}
              >
                {available.filter(
                  (item) =>
                    item.reference.collectionId ===
                    choice.reference.collectionId
                ).length === 1
                  ? choice.collectionName
                  : `${choice.collectionName} · ${choice.name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected === "automatic" && template ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-sm text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {t("automaticTiming")}
                <Info
                  aria-hidden="true"
                  className="size-3.5 shrink-0 opacity-60"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="text-muted-foreground w-64 p-3 text-[13px] leading-relaxed"
            >
              {t("automaticHint")}
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
      {editable.length < shapes.length && shapes.length > 1 ? (
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          {t("skipped")}
        </p>
      ) : null}
      <div
        className="text-muted-foreground text-[13px] leading-relaxed"
        role="status"
      >
        {unavailable ? (
          <div className="border-border/60 bg-muted/25 flex gap-2.5 rounded-r-md border-l-2 px-3 py-2.5">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="text-foreground/85 font-medium">
                {t("unavailableTitle")}
              </p>
              <p>{t("unavailable")}</p>
              {canRetry ? (
                <button
                  type="button"
                  onClick={retry}
                  className="text-foreground/80 hover:text-foreground focus-visible:ring-ring -ml-1 inline-flex min-h-8 items-center gap-1.5 rounded-md px-1 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <RotateCw aria-hidden="true" className="size-3" />
                  {t("retry")}
                </button>
              ) : null}
            </div>
          </div>
        ) : status === "loading" ? (
          t("loading")
        ) : mixed ? (
          t("hint")
        ) : resolved ? (
          <ArtworkAttribution
            text={resolved.attribution}
            collectionName={resolved.collectionName}
          />
        ) : available.length ? (
          t("hint")
        ) : (
          t("empty")
        )}
      </div>
    </Section>
  );
}

function ArtworkAttribution({
  text,
  collectionName,
}: {
  text: string;
  collectionName: string;
}) {
  const t = useTranslations("inspector.appearance");
  const match = text.match(/https?:\/\/[^\s)]+/);
  const description = match
    ? text
        .replace(match[0], "")
        .replace(/\(\s*\)/g, "")
        .replace(/[:\s.]+$/, "")
    : text;
  return (
    <div className="text-muted-foreground flex min-h-8 items-center justify-between gap-3 text-[12px]">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={description}
            className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {t("credits")}
            <Info aria-hidden="true" className="size-3 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-64 space-y-2 p-3 text-[13px] leading-relaxed"
        >
          <p className="text-foreground font-medium">{t("credits")}</p>
          <p className="text-muted-foreground">{description}</p>
        </PopoverContent>
      </Popover>
      {match ? (
        <a
          href={match[0]}
          title={description}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 min-w-0 items-center gap-1 rounded-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="truncate">{collectionName}</span>
          <ExternalLink
            aria-hidden="true"
            className="size-2.5 shrink-0 opacity-60"
          />
        </a>
      ) : (
        <span className="truncate font-medium">{collectionName}</span>
      )}
    </div>
  );
}
