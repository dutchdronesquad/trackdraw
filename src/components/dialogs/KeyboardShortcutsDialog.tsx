"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { MobileDrawer } from "@/components/MobileDrawer";
import { DesktopModal } from "@/components/DesktopModal";
import { useIsMobile } from "@/hooks/use-mobile";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcutSections = [
  {
    title: "Tools",
    items: [
      { label: "Select", keys: ["V"] },
      { label: "Grab", keys: ["H"] },
      { label: "Gate", keys: ["G"] },
      { label: "Ladder", keys: ["R"] },
      { label: "Dive Gate", keys: ["D"] },
      { label: "Flag", keys: ["F"] },
      { label: "Cone", keys: ["C"] },
      { label: "Start Pads", keys: ["S"] },
      { label: "Label", keys: ["L"] },
      { label: "Path", keys: ["P"] },
    ],
  },
  {
    title: "Selection",
    items: [
      { label: "Duplicate selected items", keys: ["Ctrl/Cmd", "D"] },
      { label: "Copy selected items", keys: ["Ctrl/Cmd", "C"] },
      { label: "Paste copied items", keys: ["Ctrl/Cmd", "V"] },
      { label: "Rotate selected items left", keys: ["Q / [", "15°"] },
      { label: "Rotate selected items right", keys: ["E / ]", "15°"] },
      { label: "Mouse rotate snap", keys: ["Drag", "5°"] },
      { label: "Fine mouse rotate", keys: ["Alt", "1°"] },
      { label: "Fine key rotate", keys: ["Alt", "1°"] },
      { label: "Delete selected items", keys: ["Backspace/Delete"] },
      { label: "Nudge selected items", keys: ["Arrow Keys"] },
      { label: "Fine nudge", keys: ["Alt", "Arrow Keys"] },
    ],
  },
  {
    title: "Path Editing",
    items: [
      { label: "Finish path", keys: ["Enter"] },
      { label: "Remove last draft point", keys: ["Backspace/Delete"] },
      { label: "Delete selected path point", keys: ["Backspace/Delete"] },
      { label: "Cancel current draft", keys: ["Escape"] },
    ],
  },
  {
    title: "Canvas",
    items: [
      { label: "Fit view to field", keys: ["0"] },
      { label: "Clear selection", keys: ["Escape"] },
      { label: "Pan view", keys: ["Middle Click"] },
      { label: "Free place / free drag", keys: ["Alt"] },
      { label: "Zoom", keys: ["Mouse Wheel"] },
    ],
  },
  {
    title: "Project",
    items: [{ label: "Save snapshot", keys: ["Ctrl/Cmd", "S"] }],
  },
];

function ShortcutSections() {
  const [openSection, setOpenSection] = useState("Tools");

  return (
    <div className="space-y-1.5">
      {shortcutSections.map((section) => (
        <div
          key={section.title}
          className="group border-border/70 bg-muted/15 overflow-hidden rounded-lg border"
        >
          <button
            type="button"
            onClick={() =>
              setOpenSection((current) =>
                current === section.title ? "" : section.title
              )
            }
            className="bg-muted/40 hover:bg-muted/60 flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors"
            aria-expanded={openSection === section.title}
          >
            <span className="text-muted-foreground/80 text-[11px] font-semibold tracking-[0.16em] uppercase">
              {section.title}
            </span>
            <motion.div
              animate={{ rotate: openSection === section.title ? 180 : 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <ChevronDown className="text-muted-foreground size-3.5" />
            </motion.div>
          </button>
          <AnimatePresence initial={false}>
            {openSection === section.title && (
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
                      key={`${section.title}-${item.label}-${item.keys.join("-")}`}
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
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title="Keyboard Shortcuts"
        subtitle="Available keyboard and canvas shortcuts in the studio."
      >
        <ShortcutSections />
      </MobileDrawer>
    );
  }

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard Shortcuts"
      subtitle="Available keyboard and canvas shortcuts in the studio."
      maxWidth="max-w-2xl"
    >
      <ShortcutSections />
    </DesktopModal>
  );
}
