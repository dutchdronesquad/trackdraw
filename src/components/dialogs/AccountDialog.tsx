"use client";

import { useEffect, useState } from "react";
import { LogIn, ShieldAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { SidebarDialog } from "@/components/SidebarDialog";

function getDisplayName(
  user: { email?: string | null; name?: string | null } | null | undefined
) {
  return user?.name?.trim() || "TrackDraw account";
}

type AccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** @deprecated SidebarDialog detects mobile automatically — prop kept for
   *  backward compatibility but has no effect. */
  mobile?: boolean;
};

type View = "profile" | "danger";

export default function AccountDialog({
  open,
  onOpenChange,
}: AccountDialogProps) {
  const { data, isPending } = authClient.useSession();
  const user = data?.user ?? null;
  const [view, setView] = useState<View>("profile");
  const [name, setName] = useState(user?.name ?? "");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setDeleteConfirmation("");
    setSaving(false);
    setDeleting(false);
    setError(null);
    setSuccess(null);
    setView("profile");
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

  // ─── Not signed in ───────────────────────────────────────────────────────

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

  // ─── Profile view ────────────────────────────────────────────────────────

  const profileContent = isPending ? (
    <p className="text-muted-foreground text-sm">Loading account…</p>
  ) : !user ? (
    notSignedIn
  ) : (
    <div className="space-y-6">
      {/* Avatar + identity */}
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

      {/* Fields */}
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

      {/* Feedback */}
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setName(user.name ?? "");
            setError(null);
            setSuccess(null);
          }}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || name.trim() === (user.name ?? "").trim()}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );

  // ─── Danger zone view ────────────────────────────────────────────────────

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

  // ─── Nav items ───────────────────────────────────────────────────────────

  const navItems = [
    {
      id: "profile" as View,
      label: "Profile",
      icon: <UserRound className="size-4" />,
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
      description:
        "Manage the name and email associated with your TrackDraw account.",
      content: profileContent,
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
        setSuccess(null);
      }}
      contentTitle={current.title}
      contentDescription={current.description}
      maxWidth="max-w-3xl"
    >
      {current.content}
    </SidebarDialog>
  );
}
