"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTeamDialogState } from "./TeamDialogState";
import type { TeamCommand, TeamDetails } from "@/lib/teams";
export function TeamManagement({
  team,
  busy,
  onCommand,
}: {
  team: TeamDetails;
  busy: boolean;
  onCommand: (command: TeamCommand) => void;
}) {
  const t = useTranslations("dialogs.teams");
  const {
    renameDraft,
    setRenameDraft: setName,
    email,
    setEmail,
    role,
    setRole,
    confirm,
    setConfirm,
  } = useTeamDialogState();
  const name = renameDraft ?? team.name;
  if (team.role !== "owner")
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t("yourRole", { role: t(`roles.${team.role}`) })}
        </p>
        {confirm === "leave" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="w-full text-sm">{t("leaveConfirm")}</p>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => onCommand({ action: "leave", teamId: team.id })}
            >
              {t("leave")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm("leave")}
          >
            {t("leave")}
          </Button>
        )}
      </div>
    );
  return (
    <div className="space-y-6">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onCommand({ action: "rename", teamId: team.id, name });
        }}
      >
        <label className="block text-sm font-medium">
          {t("teamName")}
          <Input
            className="mt-2"
            value={name}
            maxLength={80}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <Button
          type="submit"
          variant="outline"
          disabled={busy || !name.trim() || name.trim() === team.name}
        >
          {t("rename")}
        </Button>
      </form>
      <section className="border-border/60 border-t pt-5">
        <h3 className="text-sm font-semibold">{t("members")}</h3>
        <ul className="divide-border/60 mt-2 divide-y">
          {team.members.map((member) => (
            <li key={member.userId} className="space-y-3 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">
                  {member.name || member.email}
                </p>
                {member.name && (
                  <p className="text-muted-foreground text-xs break-all">
                    {member.email}
                  </p>
                )}
              </div>
              {member.role === "owner" ? (
                <p className="text-muted-foreground text-sm">
                  {t("roles.owner")}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm">
                    <span className="sr-only">
                      {t("memberRole", { email: member.email })}
                    </span>
                    <select
                      className="border-input bg-background h-9 rounded-md border px-2 text-sm"
                      value={member.role}
                      disabled={busy}
                      onChange={(e) =>
                        onCommand({
                          action: "role",
                          teamId: team.id,
                          userId: member.userId,
                          role: e.target.value as "editor" | "viewer",
                        })
                      }
                    >
                      <option value="editor">{t("roles.editor")}</option>
                      <option value="viewer">{t("roles.viewer")}</option>
                    </select>
                  </label>
                  {confirm === member.userId ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          onCommand({
                            action: "remove",
                            teamId: team.id,
                            userId: member.userId,
                          });
                          setConfirm(null);
                        }}
                      >
                        {t("confirmRemove")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirm(null)}
                      >
                        {t("cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirm(member.userId)}
                    >
                      {t("remove")}
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="border-border/60 space-y-3 border-t pt-5">
        <h3 className="text-sm font-semibold">{t("inviteTitle")}</h3>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            onCommand({
              action: "invite",
              teamId: team.id,
              email: email.trim(),
              role,
            });
          }}
        >
          <label className="block text-sm">
            {t("email")}
            <Input
              className="mt-2"
              type="email"
              value={email}
              maxLength={254}
              required
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-wrap items-center gap-3 text-sm">
            {t("role")}
            <select
              className="border-input bg-background h-9 rounded-md border px-2"
              value={role}
              disabled={busy}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
            >
              <option value="editor">{t("roles.editor")}</option>
              <option value="viewer">{t("roles.viewer")}</option>
            </select>
          </label>
          <Button type="submit" disabled={busy || !email.trim()}>
            {t("invite")}
          </Button>
        </form>
        <p className="text-muted-foreground text-xs leading-5">
          {t("inviteHelp")}
        </p>
        <ul className="divide-border/60 divide-y">
          {team.invitations.map((item) => (
            <li key={item.id} className="space-y-2 py-3">
              <p className="text-sm break-all">{item.email}</p>
              <p className="text-muted-foreground text-xs">
                {t(`roles.${item.role}`)} · {t(`statuses.${item.status}`)}
              </p>
              {(item.status === "pending" ||
                item.status === "sending" ||
                item.status === "expired") && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      onCommand({
                        action: "resend",
                        teamId: team.id,
                        invitationId: item.id,
                      })
                    }
                  >
                    {t("resend")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      onCommand({
                        action: "revoke",
                        teamId: team.id,
                        invitationId: item.id,
                      })
                    }
                  >
                    {t("revoke")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
