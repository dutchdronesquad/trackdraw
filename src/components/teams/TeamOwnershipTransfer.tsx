"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { TeamCommand, TeamDetails } from "@/lib/teams";
import { useTeamDialogState } from "./TeamDialogState";

export function TeamOwnershipTransfer({
  team,
  busy,
  onCommand,
}: {
  team: TeamDetails;
  busy: boolean;
  onCommand: (command: TeamCommand) => void;
}) {
  const t = useTranslations("dialogs.teams");
  const { confirm, setConfirm } = useTeamDialogState();
  const cancel = useRef<HTMLButtonElement>(null);
  const member = team.members.find(
    (item) => item.role !== "owner" && confirm === `transfer:${item.userId}`
  );
  return (
    <Dialog
      open={!!member}
      onOpenChange={(open) => {
        if (!open && !busy) setConfirm(null);
      }}
    >
      <DialogContent
        role="alertdialog"
        className="max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          cancel.current?.focus();
        }}
      >
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle>{t("lifecycle.transferAction")}</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {t("lifecycle.transferConfirm", {
              name: member?.name || member?.email || "",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            ref={cancel}
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(null)}
          >
            {t("cancel")}
          </Button>
          <Button
            disabled={busy || !member}
            onClick={() => {
              if (!busy && member)
                onCommand({
                  action: "transfer-owner",
                  teamId: team.id,
                  userId: member.userId,
                });
            }}
          >
            {t("lifecycle.transferAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
