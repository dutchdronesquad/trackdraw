"use client";

import { useEffect, useState } from "react";
import { LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { authClient } from "@/lib/auth-client";

function getDisplayName(
  user:
    | {
        email?: string | null;
        name?: string | null;
      }
    | null
    | undefined
) {
  return user?.name?.trim() || "TrackDraw account";
}

type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: boolean;
};

export default function AccountDialog({
  open,
  onOpenChange,
  mobile = false,
}: AccountDialogProps) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const [name, setName] = useState(user?.name ?? "");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const sectionClassName = mobile
    ? "space-y-4 border-t border-border/50 pt-4"
    : "";
  const mobileAvatarClassName = mobile ? "size-10 text-xs" : "size-12 text-sm";

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(user?.name ?? "");
    setDeleteConfirmation("");
    setSaving(false);
    setDeleting(false);
    setError(null);
    setSuccess(null);
  }, [open, user?.name]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Please enter the name you want TrackDraw to show.");
      setSuccess(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await authClient.updateProfileName(normalizedName);
      setSuccess("Profile updated.");
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
      setSuccess(null);
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

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

  const content = isPending ? (
    <div className="text-muted-foreground text-sm">Loading account…</div>
  ) : !user ? (
    <div className="border-border/60 bg-background/70 rounded-3xl border p-5">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl">
          <LogIn className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium">
            Sign in to manage your account
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Use your email to access cloud-backed account settings and profile
            details.
          </p>
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span
          className={`bg-foreground text-background flex shrink-0 items-center justify-center rounded-full font-medium ${mobileAvatarClassName}`}
        >
          {user?.name?.trim()?.[0]?.toUpperCase() ??
            user?.email?.trim()?.[0]?.toUpperCase() ??
            "T"}
        </span>
        <div className="min-w-0">
          <h2
            className={mobile ? "text-sm font-medium" : "text-base font-medium"}
          >
            {getDisplayName(user)}
          </h2>
          <p
            className={
              mobile
                ? "text-muted-foreground mt-0.5 text-[12px] leading-relaxed"
                : "text-muted-foreground mt-1 text-sm leading-relaxed"
            }
          >
            Signed in as {user.email ?? "TrackDraw account"}.
          </p>
        </div>
      </div>

      <div
        className={[
          "space-y-5",
          mobile ? sectionClassName : "border-border/60 border-t pt-5",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex items-center gap-3">
          <span className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <UserRound className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-medium">Profile details</h2>
            {!mobile ? (
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                Update the name TrackDraw shows on your account.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Display name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="Your name"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              className="border-input bg-muted/55 text-muted-foreground h-11 w-full rounded-xl border px-3.5 text-sm"
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : success ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        ) : null}

        <div
          className={[
            "mt-5 flex gap-2",
            mobile
              ? "flex-col-reverse"
              : "flex-col-reverse sm:flex-row sm:justify-end",
          ].join(" ")}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setName(user.name ?? "");
              setError(null);
              setSuccess(null);
            }}
            disabled={saving}
            className={mobile ? "text-muted-foreground h-11 w-full" : undefined}
          >
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || name.trim() === (user.name ?? "").trim()}
            className={mobile ? "h-11 w-full" : undefined}
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <div
        className={[
          "space-y-4",
          mobile
            ? "border-border/40 space-y-3 border-t pt-6"
            : "border-border/60 border-t pt-5",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <h2 className="text-foreground text-sm font-medium">Delete account</h2>
        <p
          className={
            mobile
              ? "text-muted-foreground text-[12px] leading-relaxed"
              : "text-muted-foreground mt-1 text-sm leading-relaxed"
          }
        >
          Permanently remove this TrackDraw account and its account-backed data.
        </p>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span
              className={
                mobile ? "text-[12px] font-medium" : "text-sm font-medium"
              }
            >
              Type DELETE to confirm
            </span>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
              placeholder="DELETE"
            />
          </label>

          <div className={mobile ? "pt-1" : "flex justify-end"}>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={
                deleting || deleteConfirmation.trim().toUpperCase() !== "DELETE"
              }
              className={mobile ? "h-11 w-full" : undefined}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Account"
        subtitle="Manage your TrackDraw profile and account details."
        bodyClassName="px-4 pt-2 pb-5"
        contentClassName="bg-background"
      >
        {content}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Account"
      subtitle="Manage your TrackDraw profile and account details."
      maxWidth="max-w-2xl"
    >
      {content}
    </DesktopModal>
  );
}
