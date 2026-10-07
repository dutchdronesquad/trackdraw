"use client";
import {
  inspectorSelectTriggerClass,
  inspectorSelectItemClass,
} from "@/components/inspector/shared";

import { ExternalLink } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTrackElementCatalogDimensionsLabel,
  getTrackElementCatalogName,
  type TrackElementCatalogEntry,
  type TrackElementCatalogId,
  type TrackElementCatalogIdentity,
} from "@/lib/track/elements/catalog";
import { Section } from "@/components/inspector/shared";
import { useTranslations } from "next-intl";
import type { Translate } from "@/lib/track/items/registry";

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
  const tCommon = useTranslations("common");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  return (
    <Section title={t("catalog.sectionTitle")} defaultOpen>
      <div>
        <Select
          value={activeEntryId}
          disabled={disabled}
          onValueChange={(value) => onChange(value as TrackElementCatalogId)}
        >
          <SelectTrigger
            aria-label={tCommon("labels.type")}
            className={inspectorSelectTriggerClass}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entries.map((entry) => (
              <SelectItem
                key={entry.id}
                value={entry.id}
                className={inspectorSelectItemClass}
              >
                {getTrackElementCatalogName(entry, tShapes)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {catalogIdentity ? (
        <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
          <span aria-label={t("catalog.sizeLabel")}>
            {getTrackElementCatalogDimensionsLabel(
              catalogIdentity.elementId,
              tShapes
            )}
          </span>
          {catalogIdentity.snapshot.organization ? (
            catalogEntry?.sources?.[0]?.url ? (
              <a
                href={catalogEntry.sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1.5 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {catalogIdentity.snapshot.organization}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span>{catalogIdentity.snapshot.organization}</span>
            )
          ) : null}
        </div>
      ) : null}
    </Section>
  );
}
