"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onSave,
}: CompleteProfileDialogProps) {
  const t = useTranslations("dialogs");
  const isMobile = useIsMobile();
  const [name, setName] = useState(currentName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(currentName ?? "");
    setSaving(false);
    setError(null);
  }, [currentName, open]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError(t("completeProfile.nameRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(normalizedName);
      toast.success(t("completeProfile.success"));
      onOpenChange(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("completeProfile.updateFailed")
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
          {t("completeProfile.displayNameLabel")}
        </label>
        <input
          id="complete-profile-name"
          type="text"
          autoComplete="name"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("completeProfile.namePlaceholder")}
          className="border-input bg-background/80 ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring h-11 w-full rounded-xl border px-3.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-3.5 py-3 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm leading-relaxed">
        {email
          ? t("completeProfile.descriptionWithEmail", { email })
          : t("completeProfile.description")}
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          {t("completeProfile.skip")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? t("completeProfile.saving") : t("completeProfile.save")}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={t("completeProfile.title")}
        subtitle={t("completeProfile.subtitle")}
      >
        {content}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("completeProfile.title")}
      subtitle={t("completeProfile.subtitle")}
      maxWidth="max-w-md"
    >
      {content}
    </DesktopModal>
  );
}
