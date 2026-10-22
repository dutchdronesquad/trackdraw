"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useTeamDialogState } from "./TeamDialogState";
import { TeamRoleSelect } from "./TeamRoleSelect";
import { TeamAvatar } from "./TeamAvatar";
import { TeamOwnershipTransfer } from "./TeamOwnershipTransfer";
import { TeamDeletion } from "./TeamDeletion";
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
  if (confirm === "delete")
    return <TeamDeletion team={team} busy={busy} onCommand={onCommand} />;
  const invitations = team.invitations.filter((item) =>
    ["pending", "sending", "expired"].includes(item.status)
  );
  return (
    <div className="space-y-6">
      <TeamOwnershipTransfer team={team} busy={busy} onCommand={onCommand} />
      <section aria-label={t("members")}>
        <h3 className="text-muted-foreground border-border/60 border-b pb-3 text-sm font-medium">
          {t("members")}
        </h3>
        <ul className="divide-border/60 divide-y">
          {team.members.map((member) => (
            <li key={member.userId} className="py-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_7rem_auto]">
                <div className="col-start-1 row-start-1">
                  <TeamAvatar name={member.name || member.email} />
                </div>
                <div className="col-start-2 row-start-1 min-w-0">
                  <p className="text-sm font-medium break-words">
                    {member.name || member.email}
                  </p>
                  {member.name && (
                    <p className="text-muted-foreground mt-0.5 text-xs break-all">
                      {member.email}
                    </p>
                  )}
                </div>
                {member.role === "owner" ? (
                  <span className="text-muted-foreground col-start-2 row-start-2 text-sm sm:col-start-3 sm:row-start-1 sm:text-right">
                    {t("roles.owner")}
                  </span>
                ) : (
                  <>
                    <div className="col-start-2 row-start-2 max-w-28 sm:col-start-3 sm:row-start-1">
                      <TeamRoleSelect
                        label={t("memberRole", { email: member.email })}
                        value={member.role}
                        disabled={busy}
                        className="text-muted-foreground w-28 border-transparent shadow-none"
                        onValueChange={(role) =>
                          onCommand({
                            action: "role",
                            teamId: team.id,
                            userId: member.userId,
                            role,
                          })
                        }
                      />
                    </div>
                    <div className="col-start-3 row-start-1 sm:col-start-4">
                      <TeamActions
                        label={t("memberActions", { email: member.email })}
                        busy={busy}
                      >
                        <DropdownMenuItem
                          onSelect={() =>
                            setConfirm(`transfer:${member.userId}`)
                          }
                        >
                          {t("lifecycle.transferAction")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setConfirm(member.userId)}
                        >
                          {t("remove")}
                        </DropdownMenuItem>
                      </TeamActions>
                    </div>
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
