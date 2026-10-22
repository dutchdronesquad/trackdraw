"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  Clipboard,
  LoaderCircle,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ApiKeyProjectAccess } from "@/lib/api/project-access";
import { ApiKeyActions } from "./ApiKeyActions";
import { ApiKeyProjectAccessSelector } from "./ApiKeyProjectAccess";
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";
import type { AccountApiKey, CreatedAccountApiKey } from "./types";
import { formatDate } from "./utils";

const formRow = "grid gap-3 py-4 sm:grid-cols-2 sm:gap-8";

const desktopColumns =
  "grid-cols-[minmax(0,1fr)_14.5rem_8rem_5rem] max-[960px]:grid-cols-[minmax(0,1fr)_8rem_7rem_5rem]";

function ApiKeyRow({
  apiKey,
  isMobile,
  deleting,
  onDelete,
  onEdit,
  error,
}: {
  apiKey: AccountApiKey;
  isMobile: boolean;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
  error: string | null;
}) {
  const t = useTranslations("dialogs.account.apiKeys");
  const [confirming, setConfirming] = useState(false);
  const name = apiKey.name?.trim() || t("fallback.unnamed");
  const writeAccess = Boolean(apiKey.permissions?.projects?.length);
  const access = apiKey.projectAccess?.teamId
    ? t("access.teamSelection")
    : apiKey.projectAccess?.mode === "selected"
      ? t("access.trigger", { count: apiKey.projectAccess.projectIds.length })
      : t("access.all");

  return (
    <div
      role="row"
      className={cn(
        "border-border/60 grid min-h-14 items-center gap-x-3 gap-y-1 border-b py-2 text-sm",
        isMobile ? "grid-cols-[minmax(0,1fr)_auto]" : desktopColumns
      )}
    >
      <ConfirmationDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("revoke.confirmTitle")}
        description={
          <>
            <span className="text-foreground mb-2 block font-medium">
              {name}
            </span>
            {t("revoke.warningNonExpiring")}
          </>
        }
        confirmLabel={t(deleting ? "revoke.revoking" : "revoke.action")}
        busy={deleting}
        error={error}
        onConfirm={onDelete}
      />
      <div role="cell" className="min-w-0 px-2.5">
        <p className="truncate font-medium" title={name}>
          {name}
        </p>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {t("meta.lastUsed", { date: formatDate(apiKey.lastRequest) })}
        </p>
      </div>
      <div
        role="cell"
        className={cn(
          "text-muted-foreground min-w-0 px-2.5",
          isMobile && "col-start-1 row-start-2 text-xs"
        )}
      >
        {access}
        {writeAccess ? ` · ${t("access.writable")}` : ""}
      </div>
      <div
        role="cell"
        className={cn(
          "text-muted-foreground px-2.5 text-xs tabular-nums",
          isMobile && "col-start-1 row-start-3"
        )}
      >
        {isMobile
          ? t("meta.expiresOn", { date: formatDate(apiKey.expiresAt) })
          : formatDate(apiKey.expiresAt)}
      </div>
      <div
        role="cell"
        className={cn(
          "self-start",
          isMobile && "col-start-2 row-span-3 row-start-1"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deleting}
              aria-label={t("edit.actions", { name })}
              className="size-9"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              {t("edit.action")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirming(true)}
              aria-label={t("revoke.ariaLabel", { name })}
            >
              {t("revoke.action")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

type ApiKeysViewProps = {
  isPending: boolean;
  isMobile: boolean;
  user: unknown;
  apiKeys: AccountApiKey[];
  apiKeysLoading: boolean;
  apiKeyName: string;
  apiKeyExpiryDays: string;
  projectAccess: ApiKeyProjectAccess;
  onProjectAccessChange: (value: ApiKeyProjectAccess) => void;
  draftOpen: boolean;
  onDraftOpenChange: (open: boolean) => void;
  creatingApiKey: boolean;
  createdApiKey: CreatedAccountApiKey | null;
  deletingApiKeyId: string | null;
  error: string | null;
  onApiKeyNameChange: (value: string) => void;
  onApiKeyExpiryDaysChange: (value: string) => void;
  onCreateApiKey: (
    projectAccess: ApiKeyProjectAccess,
    writeAccess?: boolean
  ) => Promise<boolean>;
  onCopyApiKey: (key: string) => void;
  onDeleteApiKey: (keyId: string) => void;
  onRefreshApiKeys: () => void;
  editDraft: { keyId: string; projectAccess: ApiKeyProjectAccess } | null;
  onEditDraftChange: (
    draft: { keyId: string; projectAccess: ApiKeyProjectAccess } | null
  ) => void;
  updatingApiKey: boolean;
  onUpdateApiKeyAccess: (
    keyId: string,
    access: ApiKeyProjectAccess
  ) => Promise<boolean>;
};

export function AccountApiKeysView({
  isPending,
  isMobile,
  user,
  apiKeys,
  apiKeysLoading,
  apiKeyName,
  apiKeyExpiryDays,
  projectAccess,
  onProjectAccessChange,
  draftOpen,
  onDraftOpenChange,
  creatingApiKey,
  createdApiKey,
  deletingApiKeyId,
  error,
  onApiKeyNameChange,
  onApiKeyExpiryDaysChange,
  onCreateApiKey,
  onCopyApiKey,
  onDeleteApiKey,
  onRefreshApiKeys,
  onUpdateApiKeyAccess,
  editDraft,
  onEditDraftChange,
  updatingApiKey,
}: ApiKeysViewProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const [writeAccess, setWriteAccess] = useState(false);
  const writeAccessId = useId();
  const writeHintId = useId();

  const heading = useRef<HTMLHeadingElement>(null);
  const hadEditor = useRef(false);
  const editingKeyId = editDraft?.keyId;
  useEffect(() => {
    if (editingKeyId || hadEditor.current) heading.current?.focus();
    hadEditor.current = Boolean(editingKeyId);
  }, [editingKeyId]);

  if (isPending) return <AccountDialogLoading />;
  if (!user) return <AccountDialogNotSignedIn />;

  function resetDraft() {
    onApiKeyNameChange("");
    onApiKeyExpiryDaysChange("90");
    onProjectAccessChange({ mode: "all" });
    onDraftOpenChange(false);
    setWriteAccess(false);
  }

  async function createKey() {
    if (await onCreateApiKey(projectAccess, writeAccess)) resetDraft();
  }

  if (editDraft) {
    const key = apiKeys.find((item) => item.id === editDraft.keyId);
    const name = key?.name?.trim() || t("account.apiKeys.fallback.unnamed");
    const cancel = () => onEditDraftChange(null);
    return (
      <form
        className="flex w-full flex-col gap-3 sm:gap-4"
        aria-label={t("account.apiKeys.edit.heading")}
        onSubmit={(event) => {
          event.preventDefault();
          if (updatingApiKey) return;
          void onUpdateApiKeyAccess(
            editDraft.keyId,
            editDraft.projectAccess
          ).then((ok) => {
            if (ok) onEditDraftChange(null);
          });
        }}
      >
        <Button
          type="button"
          variant="ghost"
          disabled={updatingApiKey}
          onClick={cancel}
          className="text-primary h-7 self-start px-0 text-xs hover:bg-transparent"
        >
          <ArrowLeft className="size-3.5" />
          {t("account.apiKeys.edit.back")}
        </Button>
        <div className="space-y-1">
          <h3
            ref={heading}
            tabIndex={-1}
            className="text-base font-semibold outline-none"
          >
            {t("account.apiKeys.edit.heading")}
          </h3>
          <p className="text-muted-foreground text-xs">
            {t("account.apiKeys.edit.keyName", { name })}
          </p>
          <p className="text-muted-foreground pt-1 text-xs">
            {t("account.apiKeys.edit.description")}
          </p>
        </div>
        <ApiKeyProjectAccessSelector
          inline
          value={editDraft.projectAccess}
          disabled={updatingApiKey}
          onChange={(projectAccess) =>
            onEditDraftChange({ ...editDraft, projectAccess })
          }
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updatingApiKey}
                onClick={cancel}
              >
                {tCommon("actions.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  updatingApiKey ||
                  (editDraft.projectAccess.mode === "selected" &&
                    !editDraft.projectAccess.projectIds.length)
                }
              >
                {updatingApiKey && (
                  <LoaderCircle className="size-3.5 animate-spin" />
                )}
                {t(
                  updatingApiKey
                    ? "account.apiKeys.edit.saving"
                    : "account.apiKeys.edit.save"
                )}
              </Button>
            </div>
          }
        />
        <AccountDialogError error={error} />
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {isMobile && (
        <div className="flex justify-end">
          <ApiKeyActions
            loading={apiKeysLoading}
            onRefresh={onRefreshApiKeys}
          />
        </div>
      )}

      {draftOpen ? (
        <form
          aria-label={t("account.apiKeys.newKey")}
          onSubmit={(event) => {
            event.preventDefault();
            void createKey();
          }}
          className="w-full space-y-5"
        >
          <div>
            <h3 className="text-sm font-medium">
              {t("account.apiKeys.newKey")}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t("account.apiKeys.form.description")}
            </p>
          </div>
          <div className="border-border/60 border-b">
            <div className={formRow}>
              <div className="space-y-1">
                <label htmlFor="api-key-name" className="text-sm font-medium">
                  {t("account.apiKeys.form.keyNameLabel")}
                </label>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t("account.apiKeys.form.nameHint")}
                </p>
              </div>
              <Input
                id="api-key-name"
                autoFocus
                type="text"
                value={apiKeyName}
                disabled={creatingApiKey}
                required
                maxLength={64}
                onChange={(event) => onApiKeyNameChange(event.target.value)}
                className="h-9 rounded-lg px-2.5 text-sm shadow-none focus-visible:ring-2 sm:max-w-sm sm:justify-self-end"
                placeholder={t("account.apiKeys.form.namePlaceholder")}
              />
            </div>
            <div className={formRow}>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("account.apiKeys.access.label")}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t(
                    projectAccess.teamId
                      ? "account.apiKeys.access.teamHint"
                      : projectAccess.mode === "all"
                        ? "account.apiKeys.access.allHint"
                        : "account.apiKeys.access.selectedHint"
                  )}
                </p>
              </div>
              <div className="w-full sm:max-w-sm sm:justify-self-end">
                <ApiKeyProjectAccessSelector
                  value={projectAccess}
                  onChange={onProjectAccessChange}
                  disabled={creatingApiKey}
                />
              </div>
            </div>
            <div className={formRow}>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {tCommon("labels.expires")}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {t("account.apiKeys.form.expiryHint")}
                </p>
              </div>
              <Select
                value={apiKeyExpiryDays}
                onValueChange={onApiKeyExpiryDaysChange}
                disabled={creatingApiKey}
              >
                <SelectTrigger
                  aria-label={tCommon("labels.expires")}
                  className="h-9 w-full rounded-lg shadow-none focus-visible:ring-2 sm:max-w-sm sm:justify-self-end"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {[7, 30, 90, 365].map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days === 365
                        ? t("account.apiKeys.form.expiryYear")
                        : t("account.apiKeys.form.expiryDays", { days })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-border/60 flex items-center justify-between gap-8 border-t py-4">
              <div className="min-w-0 space-y-1">
                <label
                  htmlFor={writeAccessId}
                  className="cursor-pointer text-sm font-medium"
                >
                  {t("account.apiKeys.access.allowWrites")}
                </label>
                <p
                  id={writeHintId}
                  className="text-muted-foreground text-xs leading-relaxed"
                >
                  {t(
                    projectAccess.mode === "selected"
                      ? "account.apiKeys.access.selectedWriteHint"
                      : "account.apiKeys.access.writeHint"
                  )}
                </p>
              </div>
              <Switch
                id={writeAccessId}
                className="data-[state=unchecked]:bg-muted-foreground/25"
                aria-describedby={writeHintId}
                checked={writeAccess}
                disabled={creatingApiKey}
                onCheckedChange={setWriteAccess}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={creatingApiKey}
              onClick={resetDraft}
              className="text-muted-foreground h-9 rounded-lg px-3 text-sm"
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                creatingApiKey ||
                !apiKeyName.trim() ||
                (projectAccess.mode === "selected" &&
                  projectAccess.projectIds.length === 0)
              }
              className="h-9 rounded-lg px-4 text-sm"
            >
              {creatingApiKey && (
                <LoaderCircle className="size-3.5 animate-spin" />
              )}
              {t("account.apiKeys.form.create")}
            </Button>
          </div>
        </form>
      ) : null}

      {createdApiKey && (
        <section
          aria-label={t("account.apiKeys.created.title")}
          className="border-brand-primary/30 bg-brand-primary/5 space-y-3 rounded-xl border p-4"
        >
          <div>
            <p className="text-sm font-medium">
              {t("account.apiKeys.created.title")}
            </p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t("account.apiKeys.created.description")}
            </p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2",
              isMobile && "flex-col items-stretch"
            )}
          >
            <code className="bg-muted/50 min-w-0 flex-1 overflow-x-auto rounded-lg px-2.5 py-2 text-xs">
              {createdApiKey.key}
            </code>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onCopyApiKey(createdApiKey.key)}
              className="h-8 rounded-lg px-2.5 text-xs"
            >
              <Clipboard className="size-3.5" />
              {tCommon("actions.copy")}
            </Button>
          </div>
        </section>
      )}
      {!draftOpen && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3
              ref={heading}
              tabIndex={-1}
              className="text-sm font-medium outline-none"
            >
              {t("account.apiKeys.active.title")}
            </h3>
            <Button
              type="button"
              className="h-8 shrink-0 rounded-lg px-3 text-xs"
              onClick={() => onDraftOpenChange(true)}
            >
              <Plus className="size-3.5" />
              {t("account.apiKeys.newKey")}
            </Button>
          </div>
          <div role="table" aria-label={t("account.apiKeys.active.title")}>
            <div
              role="row"
              className={cn(
                "text-muted-foreground border-border/60 grid items-center gap-3 border-b pb-3 text-xs font-medium",
                desktopColumns,
                isMobile && "sr-only"
              )}
            >
              <span role="columnheader" className="px-2.5">
                {tCommon("labels.name")}
              </span>
              <span role="columnheader" className="px-2.5">
                {t("account.apiKeys.access.label")}
              </span>
              <span role="columnheader" className="px-2.5">
                {tCommon("labels.expires")}
              </span>
              <span role="columnheader" className="sr-only">
                {tCommon("labels.actions")}
              </span>
            </div>
            {apiKeysLoading ? (
              <div role="row">
                <div
                  role="cell"
                  className="text-muted-foreground flex items-center gap-2 px-2.5 py-5 text-sm"
                >
                  <LoaderCircle className="size-4 animate-spin" />
                  {t("account.apiKeys.active.loading")}
                </div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div role="row">
                <p
                  role="cell"
                  className="text-muted-foreground px-2.5 py-5 text-sm"
                >
                  {t("account.apiKeys.empty.title")}
                </p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <ApiKeyRow
                  error={error}
                  key={apiKey.id}
                  apiKey={apiKey}
                  isMobile={isMobile}
                  deleting={deletingApiKeyId === apiKey.id}
                  onDelete={() => onDeleteApiKey(apiKey.id)}
                  onEdit={() =>
                    onEditDraftChange({
                      keyId: apiKey.id,
                      projectAccess: apiKey.projectAccess ?? { mode: "all" },
                    })
                  }
                />
              ))
            )}
          </div>
        </section>
      )}

      <AccountDialogError error={error} />
    </div>
  );
}
