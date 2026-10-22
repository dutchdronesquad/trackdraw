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
      className="group hover:bg-muted/40 focus-visible:ring-ring grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_1rem] items-start gap-x-3 gap-y-2.5 rounded-lg px-2 py-5 text-left transition-colors outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-50 sm:grid-cols-[minmax(0,1fr)_5.5rem_7rem_1rem] sm:items-center sm:gap-4 sm:px-3"
      disabled={busy}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-3 sm:gap-4">
        <TeamAvatar name={team.name} square />
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <span className="text-foreground text-[15px] leading-snug font-semibold [overflow-wrap:anywhere] break-words">
            {team.name}
          </span>
          <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-4 font-medium">
            {t(`roles.${team.role}`)}
          </span>
        </span>
      </span>
      <span className="text-muted-foreground col-start-1 row-start-2 flex items-center gap-1.5 pl-14 text-xs sm:col-start-2 sm:row-start-1 sm:pl-0 sm:text-sm">
        <FolderOpen
          className="size-3.5 shrink-0 sm:hidden"
          aria-hidden="true"
        />
        {t("projectCount", { count: team.projectCount })}
      </span>
      {team.memberPreview && (
        <span className="col-start-1 row-start-3 flex pl-14 sm:col-start-3 sm:row-start-1 sm:justify-end sm:pl-0">
          <TeamMembersPreview preview={team.memberPreview} />
        </span>
      )}
      <ChevronRight
        className="text-muted-foreground/60 group-hover:text-foreground col-start-2 row-start-1 mt-1 size-4 shrink-0 transition-colors sm:col-start-4 sm:mt-0"
        aria-hidden="true"
      />
    </button>
  );
}
