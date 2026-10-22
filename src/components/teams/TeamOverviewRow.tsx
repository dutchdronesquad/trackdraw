"use client";

import { ChevronRight, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TeamOverview } from "@/lib/teams";
import { TeamAvatar } from "./TeamAvatar";
import { TeamMembersPreview } from "./TeamMembersPreview";

export function TeamOverviewRow({
  team,
  busy,
  onSelect,
}: {
  team: TeamOverview["teams"][number];
  busy: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("dialogs.teams");
  return (
    <button
      type="button"
      className="group hover:bg-muted/40 focus-visible:ring-ring flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-5 text-left transition-colors outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-50 sm:items-center sm:gap-4 sm:px-3"
      disabled={busy}
      onClick={onSelect}
    >
      <TeamAvatar name={team.name} square className="mt-0.5 sm:mt-0" />
      <span className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className="text-foreground text-[15px] leading-snug font-semibold [overflow-wrap:anywhere] break-words">
              {team.name}
            </span>
            <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium">
              {t(`roles.${team.role}`)}
            </span>
          </span>
          <span className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
            <FolderOpen className="size-3.5 shrink-0" aria-hidden="true" />
            {t("projectCount", { count: team.projectCount })}
          </span>
        </span>
        {team.memberPreview && (
          <span className="flex shrink-0 items-center gap-2.5 sm:flex-col sm:items-end sm:gap-1.5">
            <TeamMembersPreview preview={team.memberPreview} />
            <span aria-hidden="true" className="text-muted-foreground text-xs">
              {t("memberCount", { count: team.memberPreview.total })}
            </span>
          </span>
        )}
      </span>
      <ChevronRight
        className="text-muted-foreground/60 group-hover:text-foreground mt-1 size-4 shrink-0 transition-colors sm:mt-0"
        aria-hidden="true"
      />
    </button>
  );
}
