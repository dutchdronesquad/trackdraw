"use client";

import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useTranslations } from "next-intl";

type ProjectVersionConflictDialogProps = {
  open: boolean;
  mobile?: boolean;
  title: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
  onOpenCloudVersion: () => void;
  onKeepLocalCopy: () => void;
};

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ProjectVersionConflictDialog({
  open,
  mobile = false,
  title,
  localUpdatedAt,
  cloudUpdatedAt,
  onOpenCloudVersion,
  onKeepLocalCopy,
}: ProjectVersionConflictDialogProps) {
  const t = useTranslations("dialogs");
  const content = (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-relaxed">
        <span className="text-foreground font-medium">
          {title || t("versionConflict.thisProject")}
        </span>{" "}
        {t("versionConflict.body")}
      </p>

      <div className="space-y-2">
        <div className="border-border/50 bg-background/70 rounded-2xl border px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            {t("versionConflict.localVersion")}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {t("versionConflict.lastChanged", {
              date: formatDateTime(localUpdatedAt),
            })}
          </p>
        </div>
        <div className="border-border/50 bg-background/70 rounded-2xl border px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            {t("versionConflict.cloudVersion")}
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            {t("versionConflict.lastChanged", {
              date: formatDateTime(cloudUpdatedAt),
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onKeepLocalCopy}>
          {t("versionConflict.keepLocal")}
        </Button>
        <Button type="button" onClick={onOpenCloudVersion}>
          {t("versionConflict.useCloud")}
        </Button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={() => {}}
        title={t("versionConflict.title")}
        subtitle={t("versionConflict.subtitle")}
      >
        {content}
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={() => {}}
      title="Choose a project version"
      subtitle="Pick the version you want to keep using on this device."
      maxWidth="max-w-md"
    >
      {content}
    </DesktopModal>
  );
}
