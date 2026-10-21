"use client";

import { Plus, UsersRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function TeamEmptyState({
  busy,
  onCreate,
  hasInvitations = false,
}: {
  busy: boolean;
  onCreate: () => void;
  hasInvitations?: boolean;
}) {
  const t = useTranslations("dialogs.teams");
  return (
    <section className="flex flex-col items-center px-4 py-12 text-center">
      <div className="bg-muted text-muted-foreground mb-5 flex size-12 items-center justify-center rounded-2xl">
        <UsersRound className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-medium">{t("emptyTitle")}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">
        {t(hasInvitations ? "emptyInvitationDescription" : "emptyDescription")}
      </p>
      <Button
        className="mt-6 h-9 rounded-lg px-4"
        disabled={busy}
        onClick={onCreate}
      >
        <Plus className="size-4" />
        {t("create")}
      </Button>
    </section>
  );
}
