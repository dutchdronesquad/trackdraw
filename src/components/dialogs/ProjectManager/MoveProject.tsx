"use client";
import { useRef } from "react";
import type { useProjectMove } from "./useProjectMove";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Content as DialogContent } from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  ChevronDown,
  File,
  FolderInput,
  Link2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { accountInteractionClassName } from "@/components/dialogs/AccountDialog/interaction-style";
import { TeamAvatar } from "@/components/teams/TeamAvatar";

export function MoveProject({
  review,
  onCancel,
}: {
  review: ReturnType<typeof useProjectMove>;
  onCancel: () => void;
}) {
  const t = useTranslations("dialogs.teamLibrary");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const cancel = useRef<HTMLButtonElement>(null);
  const {
    preview,
    teams,
    teamId,
    setTeamId,
    busy,
    error,
    setError,
    setAttempt,
    publicationsOpen,
    setPublicationsOpen,
    submitting,
    move,
  } = review;
  const onOpenChange = (next: boolean) => {
    if (!next && !submitting.current) onCancel();
  };
  const body = (
    <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-5">
      {preview ? (
        <>
          <div className="mb-6 flex min-w-0 items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <File className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold [overflow-wrap:anywhere] break-words">
                {preview.title}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {t("moveDialog.personal")}
              </p>
            </div>
          </div>
          <label
            htmlFor="move-project-team"
            className="mb-2 block text-sm font-medium"
          >
            {t("destination")}
          </label>
          <Select
            value={teamId}
            onValueChange={setTeamId}
            disabled={busy || !teams.length}
          >
            <SelectTrigger
              id="move-project-team"
              className="h-10 w-full rounded-lg"
            >
              <SelectValue placeholder={t("chooseTeam")} />
            </SelectTrigger>
            <SelectContent className={accountInteractionClassName}>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamAvatar name={team.name} compact className="size-6" />
                    <span className="truncate">{team.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            {t(teams.length ? "moveDialog.ownership" : "noOwnedTeam")}
          </p>
          <div className="border-border/60 mt-5 space-y-5 border-t pt-5">
            <div className="flex gap-3">
              <UsersRound
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">
                  {t("moveDialog.accessTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {t("moveDialog.accessBody")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <FolderInput
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium">
                  {t("moveDialog.removedTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {t("moveDialog.removedBody")}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3 rounded-lg bg-amber-500/8 p-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle
              className="mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">
                {t("moveDialog.warningTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed">
                {t("moveDialog.warningBody")}
              </p>
            </div>
          </div>
          <Collapsible
            open={publicationsOpen}
            onOpenChange={setPublicationsOpen}
            className="border-border/60 mt-5 border-t pt-4"
          >
            <CollapsibleTrigger className="group hover:bg-muted focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg py-1 text-left outline-none focus-visible:ring-2">
              <Link2
                className="text-muted-foreground size-5 shrink-0"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {t("moveDialog.publicationsTitle")}
                </span>
                <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
                  {t("moveDialog.publicationsSummary")}
                </span>
              </span>
              <ChevronDown
                className="text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-3 pl-8 text-xs leading-relaxed">
              <p>
                {t("publicationImpact", {
                  shares: preview.shareCount,
                  gallery: preview.galleryCount,
                })}
              </p>
              <p className="text-muted-foreground">
                {t("publicationUnchanged")}
              </p>
            </CollapsibleContent>
          </Collapsible>
        </>
      ) : !error ? (
        <p role="status" className="text-muted-foreground py-6 text-sm">
          {t("loading")}
        </p>
      ) : null}
      {error && (
        <div className="space-y-3 py-3">
          <p role="alert" className="text-destructive text-sm leading-relaxed">
            {t("moveFailed")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            {tCommon("actions.tryAgain")}
          </Button>
        </div>
      )}
    </div>
  );
  const footer = (
    <DialogFooter className="border-border/60 shrink-0 flex-row justify-end gap-2 border-t px-6 py-4 sm:space-x-0">
      <Button ref={cancel} variant="outline" onClick={onCancel} disabled={busy}>
        {t("cancel")}
      </Button>
      <Button
        onClick={() => void move()}
        disabled={!preview || !teamId || busy}
        aria-busy={busy}
      >
        {t("moveDialog.confirm")}
      </Button>
    </DialogFooter>
  );
  if (isMobile)
    return (
      <MobileDrawer
        nested
        open
        onOpenChange={onOpenChange}
        onEscapeKeyDown={(event) => {
          if (submitting.current) event.preventDefault();
        }}
        title={t("moveDialog.title")}
        bodyClassName={`p-0 ${accountInteractionClassName}`}
        contentClassName={`h-[92dvh] max-h-[92dvh] overflow-clip ${accountInteractionClassName}`}
        pinnedContent={
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            aria-label={tCommon("actions.close")}
            onClick={onCancel}
            className="absolute top-6 right-3 size-8 rounded-full"
          >
            <X />
          </Button>
        }
        footerContent={footer}
      >
        {body}
      </MobileDrawer>
    );
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-slate-950/15 backdrop-blur-sm" />
        <DialogContent
          className={`bg-background border-border/60 fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[34rem] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border shadow-xl outline-none ${accountInteractionClassName}`}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (submitting.current) event.preventDefault();
          }}
        >
          <DialogHeader className="shrink-0 px-6 pt-6 pb-5 text-left">
            <DialogTitle className="pr-8 text-xl leading-snug tracking-tight">
              {t("moveDialog.title")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("moveDialog.ownership")}
            </DialogDescription>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={tCommon("actions.close")}
                className="absolute top-4 right-4 size-8 rounded-full"
              >
                <X />
              </Button>
            </DialogClose>
          </DialogHeader>
          {body}
          {footer}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
