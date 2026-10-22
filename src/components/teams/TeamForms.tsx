"use client";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const nameHelpId = useId();
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
  const creating = screen === "create";
  const draft = screen === "rename" ? (renameDraft ?? team?.name ?? "") : name;
  return (
    <form
      className={cn("space-y-5", creating && "w-full space-y-6")}
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
                className="h-9 rounded-lg px-3 shadow-none"
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
                className="h-9 rounded-lg px-3 shadow-none"
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
        <div className="space-y-2">
          <label className="block space-y-2 text-sm font-medium">
            <span className="block">{t("teamName")}</span>
            <Input
              className="h-9 rounded-lg px-3 shadow-none"
              aria-describedby={creating ? nameHelpId : undefined}
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
          {creating && (
            <span
              id={nameHelpId}
              className="text-muted-foreground block text-xs leading-relaxed font-normal"
            >
              {t("createNameHelp")}
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
          !creating && "border-border/60 border-t pt-5"
        )}
      >
        <Button
          type="button"
          variant={creating ? "ghost" : "outline"}
          className={cn(
            "h-8 rounded-lg px-2.5",
            creating &&
              "text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3"
          )}
          disabled={busy}
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          className={cn("h-8 rounded-lg px-2.5", creating && "h-9 px-4")}
          disabled={
            busy ||
            (inviting
              ? !email.trim()
              : !draft.trim() ||
                (screen === "rename" && draft.trim() === team?.name))
          }
        >
          {creating && busy && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          )}
          {t(
            inviting
              ? "invite"
              : screen === "rename"
                ? "rename"
                : creating && busy
                  ? "creating"
                  : "create"
          )}
        </Button>
      </div>
    </form>
  );
}
