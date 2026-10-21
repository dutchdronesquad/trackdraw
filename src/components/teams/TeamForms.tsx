"use client";
import { useId } from "react";
import { TeamRoleSelect } from "./TeamRoleSelect";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamCommand } from "@/lib/teams";
import { cn } from "@/lib/utils";
import { useTeamDialogState } from "./TeamDialogState";

export function TeamForms({
  onCommand,
  onCancel,
}: {
  onCommand: (command: TeamCommand) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("dialogs.teams");
  const roleId = useId();
  const {
    screen,
    team,
    name,
    setName,
    renameDraft,
    setRenameDraft,
    email,
    setEmail,
    role,
    setRole,
    busy,
  } = useTeamDialogState();
  const inviting = screen === "invite";
  const draft = screen === "rename" ? (renameDraft ?? team?.name ?? "") : name;
  return (
    <form
      className={cn("space-y-6", !inviting && "max-w-md")}
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        if (inviting && team)
          onCommand({
            action: "invite",
            teamId: team.id,
            email: email.trim(),
            role,
          });
        else if (screen === "rename" && team)
          onCommand({ action: "rename", teamId: team.id, name: draft });
        else if (screen === "create")
          onCommand({ action: "create", name: draft });
      }}
    >
      {inviting ? (
        <>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <label className="block space-y-2 text-sm font-medium">
              <span className="block">{t("email")}</span>
              <Input
                className="h-10"
                type="email"
                value={email}
                maxLength={254}
                required
                autoComplete="email"
                disabled={busy}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <div className="min-w-0 space-y-2">
              <label className="block text-sm font-medium" htmlFor={roleId}>
                {t("role")}
              </label>
              <TeamRoleSelect
                id={roleId}
                label={t("role")}
                value={role}
                disabled={busy}
                onValueChange={setRole}
              />
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t(role === "editor" ? "editorHelp" : "viewerHelp")}
              </p>
            </div>
          </div>
          <div className="text-muted-foreground space-y-1 text-sm leading-relaxed">
            <p>{t("inviteDelivery")}</p>
            <p>{t("inviteSignIn")}</p>
          </div>
        </>
      ) : (
        <label className="block space-y-2 text-sm font-medium">
          <span>{t("teamName")}</span>
          <Input
            value={draft}
            maxLength={80}
            required
            disabled={busy}
            onChange={(e) =>
              screen === "rename"
                ? setRenameDraft(e.target.value)
                : setName(e.target.value)
            }
          />
        </label>
      )}
      <div
        className={cn(
          "flex flex-wrap items-center gap-3",
          inviting && "border-border/60 justify-end border-t pt-5"
        )}
      >
        {inviting && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            busy ||
            (inviting
              ? !email.trim()
              : !draft.trim() ||
                (screen === "rename" && draft.trim() === team?.name))
          }
        >
          {t(inviting ? "invite" : screen === "rename" ? "rename" : "create")}
        </Button>
        {!inviting && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
