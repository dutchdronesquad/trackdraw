"use client";

import { useState } from "react";
import { Clipboard, LoaderCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const desktopColumns =
  "grid-cols-[minmax(0,1fr)_14.5rem_8rem_5rem] max-[960px]:grid-cols-[minmax(0,1fr)_8rem_7rem_5rem]";

function ApiKeyRow({
  apiKey,
  isMobile,
  deleting,
  onDelete,
}: {
  apiKey: AccountApiKey;
  isMobile: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const t = useTranslations("dialogs.account.apiKeys");
  const tCommon = useTranslations("common");
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
      {confirming ? (
        <div
          role="cell"
          className="col-span-full flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-2.5"
        >
          <div className="min-w-0">
            <p className="font-medium">{t("revoke.confirmTitle")}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t(
                isMobile
                  ? "revoke.warningExpiring"
                  : "revoke.warningNonExpiring"
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              className="h-8 px-2 text-xs"
              onClick={() => setConfirming(false)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs"
              onClick={onDelete}
            >
              {deleting && <LoaderCircle className="size-3.5 animate-spin" />}
              {t(deleting ? "revoke.revoking" : "revoke.action")}
            </Button>
          </div>
        </div>
      ) : (
        <>
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
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              aria-label={t("revoke.ariaLabel", { name })}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 px-2.5 text-xs"
              onClick={() => setConfirming(true)}
            >
              {deleting && <LoaderCircle className="size-3.5 animate-spin" />}
              {t(deleting ? "revoke.revoking" : "revoke.action")}
            </Button>
          </div>
        </>
      )}
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
}: ApiKeysViewProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  const [writeAccess, setWriteAccess] = useState(false);

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
          className="space-y-5"
        >
          <div>
            <h3 className="text-sm font-medium">
              {t("account.apiKeys.newKey")}
            </h3>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {t("account.apiKeys.form.description")}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <div className="min-w-0 sm:col-span-2">
              <label
                htmlFor="api-key-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("account.apiKeys.form.keyNameLabel")}
              </label>
              <Input
                id="api-key-name"
                autoFocus
                type="text"
                value={apiKeyName}
                disabled={creatingApiKey}
                required
                maxLength={64}
                onChange={(event) => onApiKeyNameChange(event.target.value)}
                className="h-10 rounded-lg px-3 text-sm shadow-none focus-visible:ring-2"
                placeholder={t("account.apiKeys.form.namePlaceholder")}
              />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-sm font-medium">
                {t("account.apiKeys.access.label")}
              </p>
              <ApiKeyProjectAccessSelector
                value={projectAccess}
                onChange={onProjectAccessChange}
                disabled={creatingApiKey}
              />
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {t(
                  projectAccess.teamId
                    ? "account.apiKeys.access.teamHint"
                    : projectAccess.mode === "all"
                      ? "account.apiKeys.access.allHint"
                      : "account.apiKeys.access.selectedHint"
                )}
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-2 text-sm font-medium">
                {tCommon("labels.expires")}
              </p>
              <Select
                value={apiKeyExpiryDays}
                onValueChange={onApiKeyExpiryDaysChange}
                disabled={creatingApiKey}
              >
                <SelectTrigger
                  aria-label={tCommon("labels.expires")}
                  className="border-input focus-visible:border-ring focus-visible:ring-ring/40 flex h-[34px] w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2"
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
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={writeAccess}
                disabled={creatingApiKey}
                onChange={(event) => setWriteAccess(event.target.checked)}
                className="accent-brand-primary mt-1"
              />
              <span>
                {t("account.apiKeys.access.allowWrites")}
                <span className="text-muted-foreground mt-1 block text-xs">
                  {t("account.apiKeys.access.writeHint")}
                </span>
              </span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-3">
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
            <h3 className="text-sm font-medium">
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
                  key={apiKey.id}
                  apiKey={apiKey}
                  isMobile={isMobile}
                  deleting={deletingApiKeyId === apiKey.id}
                  onDelete={() => onDeleteApiKey(apiKey.id)}
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
