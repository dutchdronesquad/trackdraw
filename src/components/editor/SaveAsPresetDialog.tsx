"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Shapes } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("editor.saveAsPresetDialog");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    if (shapeCount === 0) return;
    const value = inputRef.current?.value.trim() ?? "";
    if (!value) return;
    onSave(value);
  }

  const content = (
    <div className="space-y-4">
      <div className="border-border/40 bg-muted/30 flex items-center gap-3 rounded-xl border px-3.5 py-3">
        <div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Shapes className="text-primary size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-[13px] font-medium">
            {t("shapeCount", { count: shapeCount })}
          </p>
          {pathCount > 0 && (
            <p className="text-muted-foreground text-[11px] leading-snug">
              {t("pathsExcluded", { count: pathCount })}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-foreground/80 text-[11px] font-medium tracking-wide uppercase">
          {t("presetNameLabel")}
        </label>
        <Input
          ref={inputRef}
          key={open ? "open" : "closed"}
          defaultValue=""
          placeholder={t("presetNamePlaceholder")}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancel();
          }}
          className="h-9"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {tCommon("actions.cancel")}
        </Button>
        <Button type="button" onClick={handleSave} disabled={shapeCount === 0}>
          <Bookmark className="size-3.5" />
          {t("savePreset")}
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
        title={t("title")}
        subtitle={t("subtitle")}
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
      title={t("title")}
      subtitle={t("subtitle")}
      maxWidth="max-w-sm"
    >
      {content}
    </DesktopModal>,
    document.body
  );
}
