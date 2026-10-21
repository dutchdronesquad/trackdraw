"use client";
import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamCommand, TeamDetails, TeamDeletionImpact } from "@/lib/teams";
import { useTeamDialogState } from "./TeamDialogState";

export function TeamDeletion({
  team,
  busy,
  onCommand,
}: {
  team: TeamDetails;
  busy: boolean;
  onCommand: (command: TeamCommand) => void;
}) {
  const t = useTranslations("dialogs.teams");
  const { deleteConfirmation, setDeleteConfirmation, setConfirm } =
    useTeamDialogState();
  const inputId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const impact = team.deletionImpact;
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && impact && deleteConfirmation === team.name)
          onCommand({
            action: "delete",
            teamId: team.id,
            confirmation: deleteConfirmation,
            impact,
          });
      }}
    >
      <div className="space-y-2">
        <h3
          ref={heading}
          tabIndex={-1}
          className="text-sm font-semibold outline-none"
        >
          {t("lifecycle.deleteTitle")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("lifecycle.deleteDescription")}
        </p>
      </div>
      {impact && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {(Object.keys(impact) as (keyof TeamDeletionImpact)[]).map((key) => (
            <div key={key}>
              <dt className="text-muted-foreground text-xs">
                {t(`lifecycle.impact.${key}`)}
              </dt>
              <dd className="mt-1 text-sm font-medium">{impact[key]}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="text-muted-foreground text-xs">
        {t("lifecycle.downloads")}
      </p>
      <div className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t("lifecycle.confirmName", { name: team.name })}
        </label>
        <Input
          id={inputId}
          value={deleteConfirmation}
          onChange={(event) => setDeleteConfirmation(event.target.value)}
          disabled={busy}
          autoComplete="off"
          className="sm:max-w-sm"
        />
      </div>
      <div className="border-border/60 flex justify-end gap-2 border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirm(null)}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={busy || !impact || deleteConfirmation !== team.name}
        >
          {t("lifecycle.deleteAction")}
        </Button>
      </div>
    </form>
  );
}
