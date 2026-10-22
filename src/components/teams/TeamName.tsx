"use client";

import { useEffect, useRef, type Ref, type KeyboardEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TeamCommand, TeamDetails } from "@/lib/teams";
import { useTeamDialogState } from "./TeamDialogState";

export function TeamName({
  team,
  busy,
  headingRef,
  onCommand,
}: {
  team: TeamDetails;
  busy: boolean;
  headingRef: Ref<HTMLHeadingElement>;
  onCommand: (command: TeamCommand) => void;
}) {
  const t = useTranslations("dialogs.teams");
  const { renameDraft, setRenameDraft } = useTeamDialogState();
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  const editing = renameDraft !== null;
  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (wasEditing.current) trigger.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const cancelOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) setRenameDraft(null);
    }
  };
  if (!editing)
    return (
      <h2 ref={headingRef} tabIndex={-1} className="outline-none">
        <button
          ref={trigger}
          type="button"
          disabled={busy}
          aria-label={`${t("renameTitle")}: ${team.name}`}
          title={t("renameTitle")}
          className="group hover:bg-muted/50 focus-visible:ring-ring -ml-2 flex max-w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[15px] leading-snug font-semibold tracking-[-0.01em] outline-none focus-visible:ring-2 disabled:cursor-wait disabled:opacity-50"
          onClick={() => setRenameDraft(team.name)}
        >
          <span className="min-w-0 break-words">{team.name}</span>
          <Pencil
            aria-hidden="true"
            className="text-muted-foreground size-3.5 shrink-0 opacity-50 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </button>
      </h2>
    );
  return (
    <>
      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {team.name}
      </h2>
      <form
        className="flex w-full max-w-lg items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && renameDraft.trim() && renameDraft.trim() !== team.name)
            onCommand({
              action: "rename",
              teamId: team.id,
              name: renameDraft.trim(),
            });
        }}
      >
        <Input
          ref={input}
          onKeyDown={cancelOnEscape}
          aria-label={t("teamName")}
          className="h-9 min-w-0 rounded-lg px-3 shadow-none"
          value={renameDraft}
          onChange={(event) => setRenameDraft(event.target.value)}
          maxLength={80}
          required
          disabled={busy}
        />
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={
            busy || !renameDraft.trim() || renameDraft.trim() === team.name
          }
          onKeyDown={cancelOnEscape}
          aria-label={t("rename")}
        >
          <Check className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          disabled={busy}
          onKeyDown={cancelOnEscape}
          aria-label={t("cancel")}
          onClick={() => setRenameDraft(null)}
        >
          <X className="size-4" />
        </Button>
      </form>
    </>
  );
}
