import { useTranslations } from "next-intl";
import {
  Fingerprint,
  KeyRound,
  LoaderCircle,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/AppTooltip";
import type { AuthPasskey } from "@/lib/auth-client";
import { isDevAuthShimEnabled } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  AccountDialogError,
  AccountDialogLoading,
  AccountDialogNotSignedIn,
} from "./shared";

type SecurityUser = {
  email?: string | null;
};

type SecurityViewProps = {
  isPending: boolean;
  isMobile: boolean;
  user: SecurityUser | null;
  email: string;
  emailEditOpen: boolean;
  changingEmail: boolean;
  hasEmailChanged: boolean;
  passkeySupported: boolean;
  passkeys: AuthPasskey[];
  passkeysLoading: boolean;
  passkeyLoading: boolean;
  passkeyReauthRequired: boolean;
  editingPasskeyId: string | null;
  passkeyDraftNames: Record<string, string>;
  deletingPasskeyId: string | null;
  error: string | null;
  onEmailChange: (email: string) => void;
  onEmailEditOpenChange: (open: boolean) => void;
  onResetError: () => void;
  onChangeEmail: () => void;
  onAddPasskey: () => void;
  onPasskeyReauthenticate: () => void;
  onEditingPasskeyIdChange: (id: string | null) => void;
  onPasskeyDraftNamesChange: (
    updater: (current: Record<string, string>) => Record<string, string>
  ) => void;
  onRenamePasskey: (passkeyId: string) => void;
  onDeletePasskey: (passkeyId: string) => void;
};

export function AccountSecurityView({
  isPending,
  isMobile,
  user,
  email,
  emailEditOpen,
  changingEmail,
  hasEmailChanged,
  passkeySupported,
  passkeys,
  passkeysLoading,
  passkeyLoading,
  passkeyReauthRequired,
  editingPasskeyId,
  passkeyDraftNames,
  deletingPasskeyId,
  error,
  onEmailChange,
  onEmailEditOpenChange,
  onResetError,
  onChangeEmail,
  onAddPasskey,
  onPasskeyReauthenticate,
  onEditingPasskeyIdChange,
  onPasskeyDraftNamesChange,
  onRenamePasskey,
  onDeletePasskey,
}: SecurityViewProps) {
  const t = useTranslations("dialogs");
  const tCommon = useTranslations("common");
  if (isPending) {
    return <AccountDialogLoading />;
  }

  if (!user) {
    return <AccountDialogNotSignedIn />;
  }

  return (
    <div className="space-y-6">
      <div className="border-border/60 space-y-4 border-b pb-5">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {t("account.security.emailAddress")}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            {user.email ?? t("account.profile.noAccountEmail")}
          </p>
        </div>

        <div className="space-y-3">
          {emailEditOpen ? (
            <div className="bg-muted/20 border-border/60 space-y-4 rounded-2xl border px-4 py-4">
              <label className="block">
                <span className="text-muted-foreground mb-2 block text-xs font-medium tracking-[0.01em]">
                  {t("account.security.newEmail")}
                </span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder={t("account.security.emailPlaceholder")}
                  className="h-8 rounded-lg px-2.5 shadow-none"
                />
              </label>

              <p className="text-muted-foreground text-sm leading-relaxed">
                {t("account.security.emailChangeDescription")}
              </p>

              <div
                className={cn(
                  "flex items-center justify-end gap-2",
                  isMobile && "flex-col items-stretch"
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onEmailChange(user.email ?? "");
                    onEmailEditOpenChange(false);
                    onResetError();
                  }}
                  className="h-8 rounded-lg px-2.5"
                >
                  {tCommon("actions.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={onChangeEmail}
                  disabled={changingEmail || !hasEmailChanged}
                  className={cn("h-8 rounded-lg px-2.5", isMobile && "w-full")}
                >
                  {changingEmail
                    ? t("account.security.savingEmail")
                    : tCommon("actions.save")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onEmailEditOpenChange(true);
                onResetError();
              }}
              className={cn("h-8 rounded-lg px-2.5", isMobile && "w-full")}
            >
              {t("account.security.changeEmail")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "flex items-start justify-between gap-4",
            isMobile && "flex-col"
          )}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {t("account.security.passkeysTitle")}
            </p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              {t("account.security.passkeysDescription")}
            </p>
          </div>
          <Button
            type="button"
            onClick={onAddPasskey}
            disabled={
              passkeyLoading ||
              passkeysLoading ||
              !passkeySupported ||
              isDevAuthShimEnabled()
            }
            className={cn(
              "h-8 shrink-0 rounded-lg px-2.5",
              isMobile && "w-full"
            )}
          >
            {passkeyLoading
              ? t("account.security.addingPasskey")
              : t("account.security.addPasskey")}
          </Button>
        </div>

        {isDevAuthShimEnabled() ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("account.security.devAuthUnavailable")}
            </p>
          </div>
        ) : passkeyReauthRequired ? (
          <div className="border-brand-primary/25 bg-brand-primary/8 space-y-3 rounded-2xl border px-4 py-4">
            <div>
              <p className="text-sm font-medium">
                {t("account.security.reauthTitle")}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t("account.security.reauthDescription")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onPasskeyReauthenticate}
              className={cn("h-8 rounded-lg px-2.5", isMobile && "w-full")}
            >
              {t("account.security.signInAgain")}
            </Button>
          </div>
        ) : !passkeySupported ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t("account.security.unsupportedBrowser")}
            </p>
          </div>
        ) : passkeysLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            {t("account.security.loadingPasskeys")}
          </div>
        ) : passkeys.length === 0 ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-xl">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {t("account.security.emptyTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t("account.security.emptyDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey) => {
              const isEditing = editingPasskeyId === passkey.id;
              const draftName =
                passkeyDraftNames[passkey.id] ?? passkey.name ?? "";
              const isDeleting = deletingPasskeyId === passkey.id;
              const createdAt = new Date(
                passkey.createdAt
              ).toLocaleDateString();

              return (
                <div
                  key={passkey.id}
                  className="bg-muted/20 border-border/60 space-y-3 rounded-2xl border px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-xl">
                          {passkey.deviceType === "multiDevice" ? (
                            <Smartphone className="size-4" />
                          ) : (
                            <Fingerprint className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {passkey.name?.trim() ||
                              t("account.security.unnamedPasskey")}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {t("account.security.addedDate", {
                              date: createdAt,
                            })}
                            {passkey.backedUp
                              ? ` · ${t("account.security.synced")}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? null : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={isMobile ? undefined : "size-7"}
                              aria-label={t("account.security.renameAriaLabel")}
                              onClick={() =>
                                onEditingPasskeyIdChange(passkey.id)
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {tCommon("actions.rename")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              isDeleting
                                ? t("account.security.removingAriaLabel")
                                : t("account.security.removeAriaLabel")
                            }
                            onClick={() => onDeletePasskey(passkey.id)}
                            disabled={isDeleting || passkeyLoading}
                            className={
                              isMobile
                                ? "text-muted-foreground hover:text-foreground"
                                : "text-muted-foreground hover:text-foreground size-7"
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isDeleting
                            ? t("account.security.removing")
                            : t("account.security.removeTooltip")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        type="text"
                        value={draftName}
                        onChange={(event) =>
                          onPasskeyDraftNamesChange((current) => ({
                            ...current,
                            [passkey.id]: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "account.security.passkeyNamePlaceholder"
                        )}
                        className="h-8 rounded-lg px-2.5 shadow-none"
                      />

                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {t("account.security.renameDescription")}
                      </p>

                      <div
                        className={cn(
                          "flex items-center justify-end gap-2",
                          isMobile && "flex-col items-stretch"
                        )}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            onEditingPasskeyIdChange(null);
                            onPasskeyDraftNamesChange((current) => ({
                              ...current,
                              [passkey.id]: passkey.name ?? "",
                            }));
                          }}
                          className="h-8 rounded-lg px-2.5"
                        >
                          {tCommon("actions.cancel")}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => onRenamePasskey(passkey.id)}
                          disabled={passkeyLoading || !draftName.trim()}
                          className="h-8 rounded-lg px-2.5"
                        >
                          {t("account.security.saveName")}
                        </Button>
                      </div>
                    </div>
                  ) : null}
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
