"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Braces,
  Clipboard,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
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
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";
import type { AccountApiKey, CreatedAccountApiKey } from "./types";
import { formatDate } from "./utils";
import { useTranslations } from "next-intl";

function ActionTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
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
  creatingApiKey: boolean;
  createdApiKey: CreatedAccountApiKey | null;
  deletingApiKeyId: string | null;
  error: string | null;
  onApiKeyNameChange: (value: string) => void;
  onApiKeyExpiryDaysChange: (value: string) => void;
  onCreateApiKey: () => void;
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
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<string | null>(
    null
  );

  if (isPending) {
    return <AccountDialogLoading />;
  }

  if (!user) {
    return <AccountDialogNotSignedIn />;
  }

  return (
    <div className="space-y-6">
      <div className="border-border/60 space-y-4 border-b pb-5">
        <div
          className={cn(
            "grid gap-x-3 gap-y-2 sm:grid-cols-[1fr_9rem_auto]",
            isMobile && "grid-cols-1 gap-y-3"
          )}
        >
          <span
            id="api-key-name-label"
            className="order-1 block text-sm font-medium"
          >
            {t("account.apiKeys.keyNameLabel")}
          </span>
          <span
            id="api-key-expiry-label"
            className="order-3 mt-1 block text-sm font-medium sm:order-2 sm:mt-0"
          >
            {tCommon("labels.expires")}
          </span>
          <span aria-hidden="true" className="hidden sm:order-3 sm:block" />

          <Input
            aria-labelledby="api-key-name-label"
            type="text"
            value={apiKeyName}
            onChange={(event) => onApiKeyNameChange(event.target.value)}
            className="order-2 h-8 rounded-lg px-2.5 shadow-none sm:order-4"
            placeholder={t("account.apiKeys.namePlaceholder")}
            maxLength={64}
          />

          <div className="order-4 sm:order-5">
            <Select
              value={apiKeyExpiryDays}
              onValueChange={onApiKeyExpiryDaysChange}
            >
              <SelectTrigger
                aria-labelledby="api-key-expiry-label"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border bg-transparent pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="7">
                  {t("account.apiKeys.expiryDays", { days: 7 })}
                </SelectItem>
                <SelectItem value="30">
                  {t("account.apiKeys.expiryDays", { days: 30 })}
                </SelectItem>
                <SelectItem value="90">
                  {t("account.apiKeys.expiryDays", { days: 90 })}
                </SelectItem>
                <SelectItem value="365">
                  {t("account.apiKeys.expiryYear")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            onClick={onCreateApiKey}
            disabled={creatingApiKey || !apiKeyName.trim()}
            className={cn(
              "order-5 h-8 rounded-lg px-2.5 sm:order-6 sm:w-auto",
              isMobile && "mt-1 w-full"
            )}
          >
            {creatingApiKey ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("account.apiKeys.create")}
          </Button>
        </div>

        {createdApiKey ? (
          <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t("account.apiKeys.createdTitle")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t("account.apiKeys.createdDescription")}
              </p>
            </div>
            <div
              className={cn(
                "flex items-center gap-2",
                isMobile && "flex-col items-stretch"
              )}
            >
              <code className="border-border/60 bg-background/80 min-w-0 flex-1 overflow-x-auto rounded-xl border px-3 py-2 text-xs">
                {createdApiKey.key}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={() => onCopyApiKey(createdApiKey.key)}
                className={cn("h-8 rounded-lg px-2.5", isMobile && "w-full")}
              >
                <Clipboard className="size-4" />
                {tCommon("actions.copy")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {t("account.apiKeys.activeTitle")}
            </p>
            <Button
              type="button"
              variant="ghost"
              onClick={onRefreshApiKeys}
              disabled={apiKeysLoading}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 w-7 shrink-0 rounded-lg px-0"
              aria-label={t("account.apiKeys.refreshAriaLabel")}
            >
              <RefreshCw
                className={cn("size-4", apiKeysLoading && "animate-spin")}
              />
            </Button>
          </div>
          <div>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {t("account.apiKeys.descriptionPrefix")}{" "}
              <Link
                href="/api/docs"
                target="_blank"
                rel="noreferrer"
                className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                {t("account.apiKeys.docsLink")}
                <ExternalLink className="size-3" />
              </Link>
            </p>
          </div>
        </div>

        {apiKeysLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            {t("account.apiKeys.loading")}
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Braces className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("account.apiKeys.emptyTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t("account.apiKeys.emptyDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map((apiKey) => {
              const isDeleting = deletingApiKeyId === apiKey.id;
              const isConfirming = confirmRevokeKeyId === apiKey.id;

              return (
                <div
                  key={apiKey.id}
                  className="group bg-muted/20 border-border/60 relative overflow-hidden rounded-xl border px-3 py-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-xl">
                          <Braces className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {apiKey.name?.trim() ||
                              t("account.apiKeys.unnamedKey")}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="border-border/50 bg-background/60 text-muted-foreground inline-flex rounded-md border px-1.5 py-0.5 text-[11px]">
                              {t("account.apiKeys.expiresOn", {
                                date: formatDate(apiKey.expiresAt),
                              })}
                            </span>
                            <span className="border-border/50 bg-background/60 text-muted-foreground inline-flex rounded-md border px-1.5 py-0.5 text-[11px]">
                              {t("account.apiKeys.lastUsed", {
                                date: formatDate(apiKey.lastRequest),
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ActionTooltip label={t("account.apiKeys.revokeTooltip")}>
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeKeyId(apiKey.id)}
                          disabled={isDeleting}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-100 transition-colors disabled:pointer-events-none disabled:opacity-50"
                          aria-label={t("account.apiKeys.revokeAriaLabel", {
                            name:
                              apiKey.name?.trim() ||
                              t("account.apiKeys.unnamedKey"),
                          })}
                        >
                          {isDeleting ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </button>
                      </ActionTooltip>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isConfirming && (
                      <motion.div
                        className="bg-background/97 absolute inset-0 flex items-center justify-between gap-2 rounded-2xl px-4 backdrop-blur-sm"
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "100%", opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-sm font-medium">
                            {t("account.apiKeys.revokeConfirmTitle")}
                          </p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {isMobile
                              ? t("account.apiKeys.revokeWarningExpiring")
                              : t("account.apiKeys.revokeWarningNonExpiring")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteApiKey(apiKey.id);
                              setConfirmRevokeKeyId(null);
                            }}
                            disabled={isDeleting}
                            className="bg-destructive/10 hover:bg-destructive/20 text-destructive disabled:text-destructive/60 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed"
                          >
                            {isDeleting
                              ? t("account.apiKeys.revoking")
                              : t("account.apiKeys.revoke")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeKeyId(null)}
                            disabled={isDeleting}
                            className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50 cursor-pointer rounded-lg px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed"
                          >
                            {tCommon("actions.cancel")}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AccountDialogError error={error} />
    </div>
  );
}
