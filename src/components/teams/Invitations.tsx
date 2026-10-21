"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { TeamInvitation } from "@/lib/teams";
export function Invitations({
  items,
  busy,
  onAccept,
}: {
  items: TeamInvitation[];
  busy: boolean;
  onAccept: (id: string) => void;
}) {
  const t = useTranslations("dialogs.teams");
  return (
    <ul className="divide-border/60 divide-y">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium break-words">{item.teamName}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t(`roles.${item.role}`)} · {t(`statuses.${item.status}`)}
            </p>
          </div>
          {item.status === "pending" ? (
            <Button disabled={busy} onClick={() => onAccept(item.id)}>
              {t("accept")}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              {t(
                item.status === "sending"
                  ? "invitationSending"
                  : "invitationEnded"
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
