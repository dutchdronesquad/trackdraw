"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  discoverAppearances,
  loadAppearance,
  appearanceKey,
  getAppearanceTemplate,
  type AppearanceChoice,
} from "@trackdraw/schema/appearance/registry";
import { useShapeAppearance } from "@/hooks/useShapeAppearance";
import { Section, Row } from "@/components/inspector/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Shape } from "@/lib/types";

export function AppearanceSection({
  shape,
  updateShape,
}: {
  shape: Shape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}) {
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
  const selected = shape.appearance
    ? appearanceKey(shape.appearance)
    : "default";
  const available = choices.filter(
    (choice) => choice.reference.templateId === template
  );
  if (!template && !shape.appearance) return null;
  return (
    <Section title={t("title")} defaultOpen>
      <Row label={t("label")}>
        <Select
          value={selected}
          disabled={shape.locked}
          onValueChange={(value) => {
            const choice = available.find(
              (entry) => appearanceKey(entry.reference) === value
            );
            updateShape(shape.id, { appearance: choice?.reference });
            if (choice) {
              setStatus("loading");
              void loadAppearance(choice.reference)
                .then(() => setStatus("ready"))
                .catch(() => setStatus("failed"));
            }
          }}
        >
          <SelectTrigger
            aria-label={t("label")}
            className="border-border/40 bg-muted/40 h-9 w-full text-xs shadow-none lg:h-7 lg:text-[11px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">{t("default")}</SelectItem>
            {shape.appearance &&
            !available.some(
              (entry) => appearanceKey(entry.reference) === selected
            ) ? (
              <SelectItem value={selected}>
                {resolved?.collectionName ??
                  shape.appearance.collectionId ??
                  t("saved")}
              </SelectItem>
            ) : null}
            {available.map((choice) => (
              <SelectItem
                key={appearanceKey(choice.reference)}
                value={appearanceKey(choice.reference)}
              >
                {choice.collectionName} · {choice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      <p className="text-muted-foreground text-[11px]" role="status">
        {!template || (shape.appearance && !resolved && status === "ready")
          ? t("unavailable")
          : status === "loading"
            ? t("loading")
            : status === "failed"
              ? t("unavailable")
              : resolved
                ? resolved.attribution
                : available.length
                  ? t("hint")
                  : t("empty")}
      </p>
      {status === "failed" ||
      (shape.appearance && !resolved && status === "ready") ? (
        <button
          type="button"
          className="text-foreground min-h-9 text-xs underline"
          onClick={() => {
            setStatus("loading");
            setAttempt(attempt + 1);
            if (shape.appearance)
              void loadAppearance(shape.appearance)
                .then(() => setStatus("ready"))
                .catch(() => setStatus("failed"));
          }}
        >
          {t("retry")}
        </button>
      ) : null}
    </Section>
  );
}
