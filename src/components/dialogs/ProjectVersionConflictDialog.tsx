"use client";

import { Button } from "@/components/ui/button";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";

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
  const content = (
    <div className="space-y-5">
      <p className="text-muted-foreground text-sm leading-relaxed">
        <span className="text-foreground font-medium">
          {title || "This project"}
        </span>{" "}
        changed on another device while you were signed out. Choose which
        version you want to keep using on this device.
      </p>

      <div className="space-y-2">
        <div className="border-border/50 bg-background/70 rounded-2xl border px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            This device version
          </p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            Last changed {formatDateTime(localUpdatedAt)}
          </p>
        </div>
        <div className="border-border/50 bg-background/70 rounded-2xl border px-4 py-3">
          <p className="text-foreground text-sm font-medium">Account version</p>
          <p className="text-muted-foreground mt-1 text-[12px]">
            Last changed {formatDateTime(cloudUpdatedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onKeepLocalCopy}>
          Keep this device version
        </Button>
        <Button type="button" onClick={onOpenCloudVersion}>
          Use account version
        </Button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={() => {}}
        title="Choose a project version"
        subtitle="Pick the version you want to keep using on this device."
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
