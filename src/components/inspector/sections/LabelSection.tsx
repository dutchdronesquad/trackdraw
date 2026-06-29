"use client";

import { Num, Row, Section } from "@/components/inspector/shared";
import type { LabelShape, Shape } from "@/lib/types";
import { useTranslations } from "next-intl";

export function LabelTransformField({
  shape,
  updateShape,
}: {
  shape: LabelShape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
}) {
  const t = useTranslations("inspector");
  return (
    <Row label={t("label.fontSizeLabel")}>
      <Num
        value={shape.fontSize ?? 18}
        onChange={(value) => updateShape(shape.id, { fontSize: value })}
        step={1}
        min={8}
      />
    </Row>
  );
}

export function LabelSection({
  shape,
  updateShape,
  startBatch,
  finishBatch,
  defaultOpen,
}: {
  shape: LabelShape;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  startBatch: () => void;
  finishBatch: () => void;
  defaultOpen: boolean;
}) {
  const t = useTranslations("inspector");
  return (
    <Section title={t("label.sectionTitle")} defaultOpen={defaultOpen}>
      <Row label={t("label.textLabel")}>
        <textarea
          rows={2}
          className="border-border/40 bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-ring/30 w-full resize-none rounded-md border px-3 py-2 text-xs focus-visible:ring-1 focus-visible:outline-hidden lg:rounded lg:px-2 lg:py-1 lg:text-[11px]"
          value={shape.text}
          onFocus={startBatch}
          onBlur={finishBatch}
          onChange={(event) =>
            updateShape(shape.id, { text: event.target.value })
          }
        />
      </Row>
      <Row label={t("label.threeDModeLabel")}>
        <select
          className="border-border/40 bg-muted/40 text-foreground h-9 w-full rounded-md border px-3 py-1 text-xs focus-visible:outline-hidden lg:h-7 lg:rounded lg:px-2 lg:text-[11px]"
          value={shape.project ? "ground" : "float"}
          onFocus={startBatch}
          onBlur={finishBatch}
          onChange={(event) =>
            updateShape(shape.id, {
              project: event.target.value === "ground",
            })
          }
        >
          <option value="float">{t("label.floatOption")}</option>
          <option value="ground">{t("label.groundOption")}</option>
        </select>
      </Row>
    </Section>
  );
}
