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
} from "@/components/ui/tooltip";
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
          <p className="text-sm font-medium">Email address</p>
          <p className="text-muted-foreground truncate text-sm">
            {user.email ?? "TrackDraw account"}
          </p>
        </div>

        <div className="space-y-3">
          {emailEditOpen ? (
            <div className="bg-muted/20 border-border/60 space-y-4 rounded-2xl border px-4 py-4">
              <label className="block">
                <span className="text-muted-foreground mb-2 block text-xs font-medium tracking-[0.01em]">
                  New email
                </span>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="name@example.com"
                />
              </label>

              <p className="text-muted-foreground text-sm leading-relaxed">
                After saving, we will send a confirmation to your current email
                address first. Once confirmed, you will verify the new one.
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
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={onChangeEmail}
                  disabled={changingEmail || !hasEmailChanged}
                  className={cn(isMobile && "w-full")}
                >
                  {changingEmail ? "Saving..." : "Save"}
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
              className={cn(isMobile && "w-full")}
            >
              Change email
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
            <p className="text-sm font-medium">Passkeys</p>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Add a passkey for faster sign-in on supported devices.
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
            className={cn("shrink-0", isMobile && "w-full")}
          >
            {passkeyLoading ? "Adding..." : "Add passkey"}
          </Button>
        </div>

        {isDevAuthShimEnabled() ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Passkeys are not available in `npm run dev`. Use `npm run preview`
              to test the real auth flow locally.
            </p>
          </div>
        ) : passkeyReauthRequired ? (
          <div className="border-brand-primary/25 bg-brand-primary/8 space-y-3 rounded-2xl border px-4 py-4">
            <div>
              <p className="text-sm font-medium">Sign in again to continue</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Passkey setup requires a recent sign-in. You can stay signed in
                for normal work, but this security action needs confirmation.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onPasskeyReauthenticate}
              className={cn(isMobile && "w-full")}
            >
              Sign in again
            </Button>
          </div>
        ) : !passkeySupported ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              This browser does not currently expose WebAuthn here, so passkey
              setup is unavailable on this device.
            </p>
          </div>
        ) : passkeysLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Loading passkeys...
          </div>
        ) : passkeys.length === 0 ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-xl">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">No passkeys yet</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  Add one to make sign-in quicker on your trusted devices.
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
                            {passkey.name?.trim() || "Unnamed passkey"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Added {createdAt}
                            {passkey.backedUp ? " · synced" : ""}
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
                              size={isMobile ? "icon" : "icon-sm"}
                              aria-label="Rename passkey"
                              onClick={() =>
                                onEditingPasskeyIdChange(passkey.id)
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rename</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size={isMobile ? "icon" : "icon-sm"}
                            aria-label={
                              isDeleting ? "Removing passkey" : "Remove passkey"
                            }
                            onClick={() => onDeletePasskey(passkey.id)}
                            disabled={isDeleting || passkeyLoading}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isDeleting ? "Removing..." : "Remove from account"}
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
                        placeholder="Passkey name"
                      />

                      <p className="text-muted-foreground text-xs leading-relaxed">
                        This only changes how the passkey is labeled in your
                        TrackDraw account.
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
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={() => onRenamePasskey(passkey.id)}
                          disabled={passkeyLoading || !draftName.trim()}
                        >
                          Save name
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
