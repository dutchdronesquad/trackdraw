"use client";
import { useId } from "react";
import { TeamRoleSelect } from "./TeamRoleSelect";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamCommand } from "@/lib/teams";
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
      className="max-w-md space-y-6"
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
          <label className="block space-y-2 text-sm font-medium">
            <span>{t("email")}</span>
            <Input
              type="email"
              value={email}
              maxLength={254}
              required
              autoComplete="email"
              disabled={busy}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={roleId}>
              {t("role")}
            </label>
            <TeamRoleSelect
              id={roleId}
              label={t("role")}
              value={role}
              disabled={busy}
              onValueChange={setRole}
            />
            <p className="text-muted-foreground text-sm">
              {t(role === "editor" ? "editorHelp" : "viewerHelp")}
            </p>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {t("inviteHelp")}
          </p>
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
      <div className="flex flex-wrap items-center gap-3">
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
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
