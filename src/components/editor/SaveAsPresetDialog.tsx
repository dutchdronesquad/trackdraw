"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";

interface SaveAsPresetDialogProps {
  open: boolean;
  shapeCount: number;
  pathCount: number;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export function SaveAsPresetDialog({
  open,
  shapeCount,
  pathCount,
  onSave,
  onCancel,
}: SaveAsPresetDialogProps) {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    const value = inputRef.current?.value.trim() ?? "";
    if (!value) return;
    onSave(value);
  }

  const content = (
    <div className="space-y-4">
      {pathCount > 0 && (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {pathCount === 1 ? "1 path" : `${pathCount} paths`} in your selection
          will not be included — presets only capture non-path shapes.
        </p>
      )}
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          {shapeCount === 1
            ? "1 shape will be saved."
            : `${shapeCount} shapes will be saved.`}{" "}
          Give this preset a name so you can find it in the picker later.
        </p>
        <Input
          ref={inputRef}
          key={open ? "open" : "closed"}
          defaultValue=""
          placeholder="Preset name"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancel();
          }}
          className="h-9"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave}>
          Save preset
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={(next) => {
          if (!next) onCancel();
        }}
        title="Save as preset"
        subtitle="Name your preset to place it later from the preset picker."
        bodyClassName="pt-4 pb-4"
      >
        {content}
      </MobileDrawer>
    );
  }

  return createPortal(
    <DesktopModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="Save as preset"
      subtitle="Name your preset to place it later from the preset picker."
      maxWidth="max-w-sm"
    >
      {content}
    </DesktopModal>,
    document.body
  );
}
