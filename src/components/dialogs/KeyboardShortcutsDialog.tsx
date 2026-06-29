"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MobileDrawer } from "@/components/MobileDrawer";
import { DesktopModal } from "@/components/DesktopModal";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  toolLabels,
  toolShortcuts,
  type EditorTool,
} from "@/lib/editor/tool-registry";
import { getTrackItemToolConfigs } from "@/lib/track/items/registry";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toolShortcutOrder: EditorTool[] = [
  "select",
  "grab",
  ...getTrackItemToolConfigs().map((tool) => tool.id),
];

const toolShortcutItems = toolShortcutOrder
  .map((tool) => {
    const shortcut = toolShortcuts[tool];
    if (!shortcut) return null;
    return { label: toolLabels[tool], keys: [shortcut] };
  })
  .filter((item): item is { label: string; keys: string[] } => item !== null);

type ShortcutSectionId =
  | "tools"
  | "selection"
  | "pathEditing"
  | "canvas"
  | "project";

function ShortcutSections() {
  const t = useTranslations("dialogs");
  const [openSection, setOpenSection] = useState<ShortcutSectionId | null>(
    "tools"
  );

  const shortcutSections: Array<{
    id: ShortcutSectionId;
    title: string;
    items: Array<{ label: string; keys: string[] }>;
  }> = [
    {
      id: "tools",
      title: t("keyboardShortcuts.sectionTools"),
      items: toolShortcutItems,
    },
    {
      id: "selection",
      title: t("keyboardShortcuts.sectionSelection"),
      items: [
        {
          label: t("keyboardShortcuts.shortcuts.duplicateItems"),
          keys: ["Ctrl/Cmd", "D"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.copyItems"),
          keys: ["Ctrl/Cmd", "C"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.pasteItems"),
          keys: ["Ctrl/Cmd", "V"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.rotateLeft"),
          keys: ["Q / [", "15°"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.rotateRight"),
          keys: ["E / ]", "15°"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.mouseRotateSnap"),
          keys: ["Drag", "5°"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.mouseRotateFine"),
          keys: ["Alt", "1°"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.keyRotateFine"),
          keys: ["Alt", "1°"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.deleteItems"),
          keys: ["Backspace/Delete"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.nudgeItems"),
          keys: ["Arrow Keys"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.fineNudge"),
          keys: ["Alt", "Arrow Keys"],
        },
      ],
    },
    {
      id: "pathEditing",
      title: t("keyboardShortcuts.sectionPathEditing"),
      items: [
        { label: t("keyboardShortcuts.shortcuts.finishPath"), keys: ["Enter"] },
        {
          label: t("keyboardShortcuts.shortcuts.removeLastPoint"),
          keys: ["Backspace/Delete"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.deletePathPoint"),
          keys: ["Backspace/Delete"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.cancelDraft"),
          keys: ["Escape"],
        },
      ],
    },
    {
      id: "canvas",
      title: t("keyboardShortcuts.sectionCanvas"),
      items: [
        { label: t("keyboardShortcuts.shortcuts.fitView"), keys: ["0"] },
        {
          label: t("keyboardShortcuts.shortcuts.clearSelection"),
          keys: ["Escape"],
        },
        {
          label: t("keyboardShortcuts.shortcuts.panView"),
          keys: ["Middle Click"],
        },
        { label: t("keyboardShortcuts.shortcuts.bypassSnap"), keys: ["Alt"] },
        { label: t("keyboardShortcuts.shortcuts.zoom"), keys: ["Mouse Wheel"] },
      ],
    },
    {
      id: "project",
      title: t("keyboardShortcuts.sectionProject"),
      items: [
        {
          label: t("keyboardShortcuts.shortcuts.saveSnapshot"),
          keys: ["Ctrl/Cmd", "S"],
        },
      ],
    },
  ];

  return (
    <div className="space-y-1.5">
      {shortcutSections.map((section) => (
        <div
          key={section.id}
          className="group border-border/70 bg-muted/15 overflow-hidden rounded-lg border"
        >
          <h3 className="m-0">
            <button
              type="button"
              onClick={() =>
                setOpenSection((current) =>
                  current === section.id ? null : section.id
                )
              }
              className="bg-muted/40 hover:bg-muted/60 flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors"
              aria-expanded={openSection === section.id}
            >
              <span className="text-muted-foreground/80 text-[11px] font-semibold tracking-[0.16em] uppercase">
                {section.title}
              </span>
              <motion.div
                animate={{ rotate: openSection === section.id ? 180 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <ChevronDown className="text-muted-foreground size-3.5" />
              </motion.div>
            </button>
          </h3>
          <AnimatePresence initial={false}>
            {openSection === section.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="divide-border/60 divide-y">
                  {section.items.map((item) => (
                    <div
                      key={`${section.id}-${item.label}-${item.keys.join("-")}`}
                      className="flex min-h-9 items-center justify-between gap-3 px-3 py-1.5"
                    >
                      <span className="text-foreground/80 pr-3 text-[13px] leading-5">
                        {item.label}
                      </span>
                      <KbdGroup className="shrink-0 flex-wrap justify-end">
                        {item.keys.map((key) => (
                          <Kbd key={`${item.label}-${key}`}>{key}</Kbd>
                        ))}
                      </KbdGroup>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const t = useTranslations("dialogs");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={t("keyboardShortcuts.dialogTitle")}
        subtitle={t("keyboardShortcuts.dialogSubtitle")}
      >
        <ShortcutSections />
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("keyboardShortcuts.dialogTitle")}
      subtitle={t("keyboardShortcuts.dialogSubtitle")}
      maxWidth="max-w-2xl"
    >
      <ShortcutSections />
    </DesktopModal>
  );
}
