"use client";

import { useTranslations } from "next-intl";
import type { TeamSummary } from "@/lib/teams";
import { TeamAvatar } from "./TeamAvatar";

export function TeamMembersPreview({
  preview,
}: {
  preview: NonNullable<TeamSummary["memberPreview"]>;
}) {
  const t = useTranslations("dialogs.teams");
  const names = preview.names.slice(0, 3);
  const remaining = Math.max(0, preview.total - names.length);
  return (
    <span
      role="img"
      aria-label={t("memberCount", { count: preview.total })}
      title={names.join(", ")}
      className="flex shrink-0 -space-x-2"
    >
      {names.map((name, index) => (
        <TeamAvatar
          key={index}
          name={name}
          compact
          className="ring-background size-8 ring-2"
        />
      ))}
      {remaining > 0 && (
        <span
          aria-hidden="true"
          className="bg-muted text-muted-foreground ring-background flex size-8 items-center justify-center rounded-full text-[11px] font-medium ring-2"
        >
          +{remaining}
        </span>
      )}
    </span>
  );
}
