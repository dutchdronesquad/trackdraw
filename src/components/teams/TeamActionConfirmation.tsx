"use client";

import { useTranslations } from "next-intl";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import type { TeamCommand, TeamDetails } from "@/lib/teams";
import { useTeamDialogState } from "./TeamDialogState";

export function TeamActionConfirmation({
  team,
  busy,
  onCommand,
}: {
  team: TeamDetails;
  busy: boolean;
  onCommand: (command: TeamCommand) => void;
}) {
  const t = useTranslations("dialogs.teams");
  const { confirm, setConfirm, error } = useTeamDialogState();
  const member = team.members.find(
    (item) =>
      item.role !== "owner" &&
      (confirm === item.userId || confirm === `transfer:${item.userId}`)
  );
  const transfer = !!member && confirm === `transfer:${member.userId}`;
  const leave = team.role !== "owner" && confirm === "leave";
  const actionLabel = t(
    transfer ? "lifecycle.transferAction" : leave ? "leave" : "confirmRemove"
  );
  return (
    <ConfirmationDialog
      open={leave || (team.role === "owner" && !!member)}
      onOpenChange={(open) => {
        if (!open) setConfirm(null);
      }}
      busy={busy}
      destructive={!transfer}
      title={actionLabel}
      description={
        leave
          ? t("leaveConfirm")
          : t(transfer ? "lifecycle.transferConfirm" : "removeConfirm", {
              name: member?.name || member?.email || "",
            })
      }
      confirmLabel={actionLabel}
      error={error ? t(`errors.${error}`) : null}
      onConfirm={() => {
        if (leave) onCommand({ action: "leave", teamId: team.id });
        else if (member && team.role === "owner")
          onCommand({
            action: transfer ? "transfer-owner" : "remove",
            teamId: team.id,
            userId: member.userId,
          });
      }}
    />
  );
}
