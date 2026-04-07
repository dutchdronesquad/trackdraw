"use client";

import { useEffect, useState } from "react";
import {
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LogIn,
  Pencil,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  authClient,
  type AuthPasskey,
  isDevAuthShimEnabled,
} from "@/lib/auth-client";
import { SidebarDialog } from "@/components/SidebarDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function getDisplayName(
  user: { email?: string | null; name?: string | null } | null | undefined
) {
  return user?.name?.trim() || "TrackDraw account";
}

type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: boolean;
};

type View = "profile" | "security" | "danger";

export default function AccountDialog({
  open,
  onOpenChange,
}: AccountDialogProps) {
  const { data, isPending } = authClient.useSession();
  const isMobile = useIsMobile();
  const user = data?.user ?? null;
  const [view, setView] = useState<View>("profile");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailEditOpen, setEmailEditOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [passkeys, setPasskeys] = useState<AuthPasskey[]>([]);
  const [passkeysLoading, setPasskeysLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [passkeyDraftNames, setPasskeyDraftNames] = useState<
    Record<string, string>
  >({});
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setEmailEditOpen(false);
    setDeleteConfirmation("");
    setSaving(false);
    setChangingEmail(false);
    setDeleting(false);
    setError(null);
    setEmailNotice(null);
    setPasskeys([]);
    setPasskeysLoading(false);
    setPasskeyLoading(false);
    setEditingPasskeyId(null);
    setPasskeyDraftNames({});
    setDeletingPasskeyId(null);
    setView("profile");
  }, [open, user?.email, user?.name]);

  useEffect(() => {
    if (!open || !user) return;

    let cancelled = false;

    const loadPasskeys = async () => {
      setPasskeysLoading(true);
      try {
        const items = await authClient.passkey.list();
        if (cancelled) return;
        setPasskeys(items);
        setPasskeyDraftNames(
          Object.fromEntries(items.map((item) => [item.id, item.name ?? ""]))
        );
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load passkeys."
        );
      } finally {
        if (!cancelled) {
          setPasskeysLoading(false);
        }
      }
    };

    void loadPasskeys();

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Please enter the name you want TrackDraw to show.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authClient.updateProfileName(normalizedName);
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm account deletion.");
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await authClient.deleteUser();
      window.location.href = "/studio";
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete your account."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const currentEmail = user?.email?.trim().toLowerCase() ?? "";

    if (!normalizedEmail) {
      setError("Please enter the email you want to use for TrackDraw.");
      return;
    }

    if (normalizedEmail === currentEmail) {
      setError("Enter a different email address to change it.");
      return;
    }

    setChangingEmail(true);
    setError(null);
    setEmailNotice(null);

    try {
      await authClient.changeEmail({
        newEmail: normalizedEmail,
        callbackURL: "/studio",
      });
      setEmailEditOpen(false);
      setEmailNotice(
        "Check your inbox to complete the email change. You may need to confirm from your current email first and then verify the new one."
      );
    } catch (changeEmailError) {
      setError(
        changeEmailError instanceof Error
          ? changeEmailError.message
          : "Failed to change your email."
      );
    } finally {
      setChangingEmail(false);
    }
  };

  const hasEmailChanged =
    email.trim().toLowerCase() !== (user?.email ?? "").trim().toLowerCase();
  const hasNameChanged = name.trim() !== (user?.name ?? "").trim();

  const handleAddPasskey = async () => {
    setPasskeyLoading(true);
    setError(null);
    setEmailNotice(null);

    try {
      const createdPasskey = await authClient.passkey.add({
        name:
          user?.name?.trim() ||
          user?.email?.trim() ||
          `TrackDraw passkey ${passkeys.length + 1}`,
      });

      const nextPasskeys = createdPasskey
        ? [...passkeys, createdPasskey]
        : await authClient.passkey.list();
      setPasskeys(nextPasskeys);
      setPasskeyDraftNames(
        Object.fromEntries(
          nextPasskeys.map((item) => [item.id, item.name ?? ""])
        )
      );
      setEmailNotice("Passkey added. You can rename or remove it below.");
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : "Failed to add passkey."
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleRenamePasskey = async (passkeyId: string) => {
    const nextName = passkeyDraftNames[passkeyId]?.trim();
    if (!nextName) {
      setError("Please enter a passkey name before saving.");
      return;
    }

    setPasskeyLoading(true);
    setError(null);

    try {
      const updated = await authClient.passkey.update({
        id: passkeyId,
        name: nextName,
      });
      setPasskeys((current) =>
        current.map((item) => (item.id === passkeyId ? updated : item))
      );
      setEditingPasskeyId(null);
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : "Failed to rename passkey."
      );
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    const passkey = passkeys.find((item) => item.id === passkeyId);
    const confirmed = window.confirm(
      `Remove ${passkey?.name?.trim() || "this passkey"} from your TrackDraw account?\n\nIt may still appear on this device until you remove it from your password manager or device settings.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingPasskeyId(passkeyId);
    setError(null);

    try {
      await authClient.passkey.remove(passkeyId);
      setPasskeys((current) => current.filter((item) => item.id !== passkeyId));
      setEditingPasskeyId((current) =>
        current === passkeyId ? null : current
      );
      setEmailNotice(
        "Passkey removed from your TrackDraw account. It may still appear on this device until you remove it from your password manager or device settings."
      );
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error
          ? passkeyError.message
          : "Failed to remove passkey."
      );
    } finally {
      setDeletingPasskeyId(null);
    }
  };

  const passkeySupported =
    typeof window !== "undefined" && typeof PublicKeyCredential !== "undefined";

  const notSignedIn = (
    <div className="border-border/60 bg-background/70 rounded-2xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
          <LogIn className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Sign in to manage your account</p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Use your email to access cloud-backed account settings and profile
            details.
          </p>
        </div>
      </div>
    </div>
  );

  const profileContent = isPending ? (
    <p className="text-muted-foreground text-sm">Loading account…</p>
  ) : !user ? (
    notSignedIn
  ) : (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="bg-foreground text-background flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-medium">
          {user?.name?.trim()?.[0]?.toUpperCase() ??
            user?.email?.trim()?.[0]?.toUpperCase() ??
            "T"}
        </span>
        <div className="min-w-0">
          <p className="text-base leading-snug font-medium">
            {getDisplayName(user)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {user.email ?? "TrackDraw account"}
          </p>
        </div>
      </div>

      <div className="border-border/60 space-y-4 border-t pt-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Display name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
            placeholder="Your name"
          />
        </label>

        <div
          className={cn(
            "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
            isMobile && "flex-col gap-2"
          )}
        >
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || changingEmail || !hasNameChanged}
            className={cn(isMobile && "h-11 w-full")}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setName(user.name ?? "");
              setError(null);
            }}
            disabled={saving || changingEmail || !hasNameChanged}
            className={cn(
              isMobile &&
                "text-muted-foreground hover:text-foreground h-11 w-full border-0 bg-transparent shadow-none"
            )}
          >
            Reset
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}

      {emailNotice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {emailNotice}
        </div>
      )}
    </div>
  );

  const securityContent = isPending ? (
    <p className="text-muted-foreground text-sm">Loading account…</p>
  ) : !user ? (
    notSignedIn
  ) : (
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
              <label className="block space-y-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-[0.01em]">
                  New email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEmail(user.email ?? "");
                    setEmailEditOpen(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleChangeEmail}
                  disabled={changingEmail || !hasEmailChanged}
                  className={cn(isMobile && "h-11 w-full")}
                >
                  {changingEmail ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEmailEditOpen(true);
                setError(null);
                setEmailNotice(null);
              }}
              className={cn(isMobile && "h-11 w-full")}
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
            size="sm"
            onClick={handleAddPasskey}
            disabled={
              passkeyLoading ||
              passkeysLoading ||
              !passkeySupported ||
              isDevAuthShimEnabled()
            }
            className={cn("shrink-0", isMobile && "h-11 w-full")}
          >
            {passkeyLoading ? "Adding…" : "Add passkey"}
          </Button>
        </div>

        {isDevAuthShimEnabled() ? (
          <div className="bg-muted/20 border-border/60 rounded-2xl border px-4 py-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Passkeys are not available in `npm run dev`. Use `npm run preview`
              to test the real auth flow locally.
            </p>
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
            Loading passkeys…
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
                            {passkey.backedUp ? " • synced" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? null : (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size={isMobile ? "icon" : "icon-sm"}
                                aria-label="Rename passkey"
                                onClick={() => setEditingPasskeyId(passkey.id)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                            }
                          />
                          <TooltipContent>Rename</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size={isMobile ? "icon" : "icon-sm"}
                              aria-label={
                                isDeleting
                                  ? "Removing passkey"
                                  : "Remove passkey"
                              }
                              onClick={() =>
                                void handleDeletePasskey(passkey.id)
                              }
                              disabled={isDeleting || passkeyLoading}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                        <TooltipContent>
                          {isDeleting ? "Removing…" : "Remove from account"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) =>
                          setPasskeyDraftNames((current) => ({
                            ...current,
                            [passkey.id]: event.target.value,
                          }))
                        }
                        className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPasskeyId(null);
                            setPasskeyDraftNames((current) => ({
                              ...current,
                              [passkey.id]: passkey.name ?? "",
                            }));
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleRenamePasskey(passkey.id)}
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

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}

      {emailNotice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {emailNotice}
        </div>
      )}
    </div>
  );

  const dangerContent = isPending ? (
    <p className="text-muted-foreground text-sm">Loading account…</p>
  ) : !user ? (
    notSignedIn
  ) : (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Permanently remove this TrackDraw account and all its account-backed
        data. This action cannot be undone.
      </p>

      <div className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Type DELETE to confirm</span>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
            placeholder="DELETE"
          />
        </label>

        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteUser}
            disabled={
              deleting || deleteConfirmation.trim().toUpperCase() !== "DELETE"
            }
          >
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </div>
    </div>
  );

  const navItems = [
    {
      id: "profile" as View,
      label: "Profile",
      icon: <UserRound className="size-4" />,
    },
    {
      id: "security" as View,
      label: "Security",
      icon: <ShieldCheck className="size-4" />,
    },
    {
      id: "danger" as View,
      label: "Danger zone",
      icon: <ShieldAlert className="size-4" />,
      tone: "danger" as const,
    },
  ];

  const contentMap: Record<
    View,
    { title: string; description: string; content: React.ReactNode }
  > = {
    profile: {
      title: "Your profile",
      description: "Manage the name shown across your TrackDraw account.",
      content: profileContent,
    },
    security: {
      title: "Security",
      description:
        "Manage sign-in methods, account email, and passkeys for your TrackDraw account.",
      content: securityContent,
    },
    danger: {
      title: "Danger zone",
      description: "Destructive and irreversible account actions.",
      content: dangerContent,
    },
  };

  const current = contentMap[view];

  return (
    <SidebarDialog
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="Studio"
      title="Account"
      mobileSubtitle="Manage your TrackDraw account."
      navItems={navItems}
      activeItem={view}
      onItemChange={(id) => {
        setView(id as View);
        setError(null);
      }}
      contentTitle={current.title}
      contentDescription={current.description}
      maxWidth="max-w-3xl"
    >
      {current.content}
    </SidebarDialog>
  );
}
