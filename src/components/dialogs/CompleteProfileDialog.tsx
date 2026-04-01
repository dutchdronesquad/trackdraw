"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";

type CompleteProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string | null;
  currentName?: string | null;
  mobile?: boolean;
  onSave: (name: string) => Promise<void>;
};

export default function CompleteProfileDialog({
  open,
  onOpenChange,
  email,
  currentName,
  mobile = false,
  onSave,
}: CompleteProfileDialogProps) {
  const [name, setName] = useState(currentName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(currentName ?? "");
    setSaving(false);
    setError(null);
  }, [currentName, open]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Please enter the name you want TrackDraw to show.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(normalizedName);
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update your account name."
      );
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="complete-profile-name"
          className="text-foreground text-sm font-medium"
        >
          Display name
        </label>
        <input
          id="complete-profile-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed">
        This is the name TrackDraw will show for cloud projects and shared
        layouts{email ? ` on ${email}` : ""}.
      </p>

      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Not now
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? "Saving…" : "Save name"}
        </Button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Add your name"
        subtitle="Give your account a clear display name for cloud projects and sharing."
      >
        {content}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Add your name"
      subtitle="Give your account a clear display name for cloud projects and sharing."
      maxWidth="max-w-md"
    >
      {content}
    </DesktopModal>
  );
}
