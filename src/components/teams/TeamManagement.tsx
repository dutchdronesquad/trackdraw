"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTeamDialogState } from "./TeamDialogState";
import { TeamAvatar } from "./TeamAvatar";
import { TeamActions } from "./TeamActions";
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
  const { confirm, setConfirm } = useTeamDialogState();
  if (team.role !== "owner")
    return (
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm">
          {t("yourRole", { role: t(`roles.${team.role}`) })}
        </p>
        {confirm === "leave" && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{t("leaveConfirm")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => onCommand({ action: "leave", teamId: team.id })}
              >
                {t("leave")}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  const invitations = team.invitations.filter((item) =>
    ["pending", "sending", "expired"].includes(item.status)
  );
  return (
    <div className="space-y-8">
      <section aria-label={t("members")}>
        <h3 className="text-muted-foreground border-border/60 border-b pb-3 text-sm font-medium">
          {t("members")}
        </h3>
        <ul className="divide-border/60 divide-y">
          {team.members.map((member) => (
            <li key={member.userId} className="py-5">
              <div className="flex items-center gap-3">
                <TeamAvatar name={member.name || member.email} />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium break-words">
                    {member.name || member.email}
                  </p>
                  {member.name && (
                    <p className="text-muted-foreground mt-1 text-sm break-all">
                      {member.email}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs sm:hidden">
                    {t(`roles.${member.role}`)}
                  </p>
                </div>
                {member.role === "owner" ? (
                  <span className="text-muted-foreground hidden text-sm sm:block">
                    {t("roles.owner")}
                  </span>
                ) : (
                  <>
                    <label className="hidden sm:block">
                      <span className="sr-only">
                        {t("memberRole", { email: member.email })}
                      </span>
                      <select
                        className="bg-background text-muted-foreground h-10 rounded-md px-2 text-sm"
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
                    <TeamActions
                      label={t("memberActions", { email: member.email })}
                      busy={busy}
                    >
                      <DropdownMenuItem
                        disabled={member.role === "editor"}
                        onSelect={() =>
                          onCommand({
                            action: "role",
                            teamId: team.id,
                            userId: member.userId,
                            role: "editor",
                          })
                        }
                      >
                        {t("makeEditor")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={member.role === "viewer"}
                        onSelect={() =>
                          onCommand({
                            action: "role",
                            teamId: team.id,
                            userId: member.userId,
                            role: "viewer",
                          })
                        }
                      >
                        {t("makeViewer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => setConfirm(member.userId)}
                      >
                        {t("remove")}
                      </DropdownMenuItem>
                    </TeamActions>
                  </>
                )}
              </div>
              {confirm === member.userId && (
                <div className="mt-4 space-y-3 pl-0 sm:pl-13">
                  <p className="text-sm">
                    {t("removeConfirm", { name: member.name || member.email })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        onCommand({
                          action: "remove",
                          teamId: team.id,
                          userId: member.userId,
                        })
                      }
                    >
                      {t("confirmRemove")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirm(null)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      {invitations.length > 0 && (
        <section aria-label={t("pendingInvitations")}>
          <h3 className="text-muted-foreground border-border/60 border-b pb-3 text-sm font-medium">
            {t("pendingInvitations")}
          </h3>
          <ul className="divide-border/60 divide-y">
            {invitations.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-4">
                <TeamAvatar name={item.email} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium break-all">{item.email}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t(`roles.${item.role}`)} · {t(`statuses.${item.status}`)}
                  </p>
                </div>
                <TeamActions
                  label={t("invitationActions", { email: item.email })}
                  busy={busy}
                >
                  <DropdownMenuItem
                    onSelect={() =>
                      onCommand({
                        action: "resend",
                        teamId: team.id,
                        invitationId: item.id,
                      })
                    }
                  >
                    {t("resend")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() =>
                      onCommand({
                        action: "revoke",
                        teamId: team.id,
                        invitationId: item.id,
                      })
                    }
                  >
                    {t("revoke")}
                  </DropdownMenuItem>
                </TeamActions>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
