"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TrackElementCatalogEntry,
  type TrackElementCatalogId,
  type TrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";
import { Row, Section } from "@/components/inspector/shared";
import { useTranslations } from "next-intl";

interface CatalogTypeSectionProps {
  activeEntryId: TrackElementCatalogId;
  catalogEntry: TrackElementCatalogEntry | null;
  catalogIdentity: TrackElementCatalogIdentity | null;
  disabled?: boolean;
  entries: TrackElementCatalogEntry[];
  onChange: (entryId: TrackElementCatalogId) => void;
}

export function CatalogTypeSection({
  activeEntryId,
  catalogEntry,
  catalogIdentity,
  disabled = false,
  entries,
  onChange,
}: CatalogTypeSectionProps) {
  const t = useTranslations("inspector");
  return (
    <Section title={t("catalog.sectionTitle")} defaultOpen>
      <Row label={t("catalog.typeLabel")}>
        <Select
          value={activeEntryId}
          disabled={disabled}
          onValueChange={(value) => onChange(value as TrackElementCatalogId)}
        >
          <SelectTrigger className="border-border/40 bg-muted/40 h-9 w-full text-xs shadow-none lg:h-7 lg:text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entries.map((entry) => (
              <SelectItem
                key={entry.id}
                value={entry.id}
                className="text-xs lg:text-[11px]"
              >
                {entry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>
      {catalogIdentity?.snapshot.organization ? (
        <Row label={t("catalog.sourceLabel")}>
          {catalogEntry?.sources?.[0]?.url ? (
            <a
              href={catalogEntry.sources[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-foreground/70 text-[12px] underline underline-offset-2 transition-colors"
            >
              {catalogIdentity.snapshot.organization}
            </a>
          ) : (
            <span className="text-foreground text-[12px]">
              {catalogIdentity.snapshot.organization}
            </span>
          )}
        </Row>
      ) : null}
      {catalogIdentity ? (
        <Row label={t("catalog.officialSizeLabel")}>
          <span className="text-foreground text-[12px]">
            {catalogIdentity.snapshot.dimensionsLabel}
          </span>
        </Row>
      ) : null}
    </Section>
  );
}
