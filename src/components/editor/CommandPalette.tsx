"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Box,
  Download,
  FolderOpen,
  Import,
  Keyboard,
  MessageCircle,
  Search,
  Settings,
  Share2,
  View,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { EditorView } from "@/lib/editor/view";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeView: EditorView;
  hasPath: boolean;
  onOpenProjects: () => void;
  onOpenAccountSettings: () => void;
  onOpenShortcuts: () => void;
  onSwitchView: (view: EditorView) => void;
  onStartFlyThrough: () => void;
  onShare: () => void;
  onExport: () => void;
  onImport: () => void;
  onFeedback: () => void;
};

type PaletteAction = {
  id: string;
  group: "navigate" | "view" | "transfer" | "support";
  label: string;
  description: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabledReason?: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export default function CommandPalette({
  open,
  onOpenChange,
  activeView,
  hasPath,
  onOpenProjects,
  onOpenAccountSettings,
  onOpenShortcuts,
  onSwitchView,
  onStartFlyThrough,
  onShare,
  onExport,
  onImport,
  onFeedback,
}: CommandPaletteProps) {
  const t = useTranslations("editor.commandPalette");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo<PaletteAction[]>(
    () => [
      {
        id: "projects",
        group: "navigate",
        label: t("actions.projects.label"),
        description: t("actions.projects.description"),
        keywords: ["project", "files", "manage", "open"],
        icon: FolderOpen,
        onSelect: onOpenProjects,
      },
      {
        id: "account-settings",
        group: "navigate",
        label: t("actions.accountSettings.label"),
        description: t("actions.accountSettings.description"),
        keywords: ["account", "profile", "security", "settings"],
        icon: Settings,
        onSelect: onOpenAccountSettings,
      },
      {
        id: "keyboard-shortcuts",
        group: "navigate",
        label: t("actions.shortcuts.label"),
        description: t("actions.shortcuts.description"),
        keywords: ["keyboard", "help", "keys", "shortcuts"],
        icon: Keyboard,
        onSelect: onOpenShortcuts,
      },
      {
        id: "view-2d",
        group: "view",
        label: t("actions.view2d.label"),
        description: t("actions.view2d.description"),
        keywords: ["2d", "canvas", "editor", "view"],
        icon: View,
        onSelect: () => onSwitchView("2d"),
        disabledReason:
          activeView === "2d" ? t("actions.view2d.alreadyActive") : undefined,
      },
      {
        id: "view-3d",
        group: "view",
        label: t("actions.view3d.label"),
        description: t("actions.view3d.description"),
        keywords: ["3d", "preview", "view", "orbit"],
        icon: Box,
        onSelect: () => onSwitchView("3d"),
        disabledReason:
          activeView === "3d" ? t("actions.view3d.alreadyActive") : undefined,
      },
      {
        id: "fly-through",
        group: "view",
        label: t("actions.flyThrough.label"),
        description: t("actions.flyThrough.description"),
        keywords: ["3d", "fpv", "flight", "fly", "preview", "route"],
        icon: Box,
        onSelect: onStartFlyThrough,
        disabledReason: hasPath
          ? undefined
          : t("actions.flyThrough.noPathReason"),
      },
      {
        id: "share",
        group: "transfer",
        label: t("actions.share.label"),
        description: t("actions.share.description"),
        keywords: ["publish", "link", "share"],
        icon: Share2,
        onSelect: onShare,
      },
      {
        id: "export",
        group: "transfer",
        label: t("actions.export.label"),
        description: t("actions.export.description"),
        keywords: ["download", "png", "pdf", "svg", "json", "export"],
        icon: Download,
        onSelect: onExport,
      },
      {
        id: "import",
        group: "transfer",
        label: t("actions.import.label"),
        description: t("actions.import.description"),
        keywords: ["upload", "json", "import"],
        icon: Import,
        onSelect: onImport,
      },
      {
        id: "feedback",
        group: "support",
        label: t("actions.feedback.label"),
        description: t("actions.feedback.description"),
        keywords: ["support", "idea", "problem", "bug", "feedback"],
        icon: MessageCircle,
        onSelect: onFeedback,
      },
    ],
    [
      activeView,
      hasPath,
      onExport,
      onFeedback,
      onImport,
      onOpenAccountSettings,
      onOpenProjects,
      onOpenShortcuts,
      onShare,
      onStartFlyThrough,
      onSwitchView,
      t,
    ]
  );

  const filteredActions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return actions;

    return actions.filter((action) =>
      normalizeSearchValue(
        [action.label, action.description, ...action.keywords].join(" ")
      ).includes(normalizedQuery)
    );
  }, [actions, query]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setQuery("");
        setActiveIndex(0);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.key.toLocaleLowerCase() !== "k") return;

      if (!open && document.querySelector('[role="dialog"]')) return;

      event.preventDefault();
      handleOpenChange(!open);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const runAction = (action: PaletteAction) => {
    if (action.disabledReason) return;
    handleOpenChange(false);
    window.setTimeout(action.onSelect, 0);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredActions.length ? (current + 1) % filteredActions.length : 0
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredActions.length
          ? (current - 1 + filteredActions.length) % filteredActions.length
          : 0
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const action = filteredActions[activeIndex];
      if (action) runAction(action);
    }
  };

  const groups = ["navigate", "view", "transfer", "support"] as const;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[18vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:rounded-xl">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("description")}
        </DialogDescription>

        <div className="border-border flex items-center gap-3 border-b py-0 pr-14 pl-4">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={t("placeholder")}
            role="combobox"
            aria-label={t("searchLabel")}
            aria-controls="command-palette-results"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-activedescendant={
              filteredActions[activeIndex]
                ? `command-palette-${filteredActions[activeIndex].id}`
                : undefined
            }
            className="placeholder:text-muted-foreground h-13 min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="border-border bg-muted text-muted-foreground hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex">
            {t("escapeKey")}
          </kbd>
        </div>

        <div
          id="command-palette-results"
          role="listbox"
          aria-label={t("resultsLabel")}
          className="max-h-[min(60vh,28rem)] overflow-y-auto p-2"
        >
          {filteredActions.length ? (
            groups.map((group) => {
              const groupActions = filteredActions.filter(
                (action) => action.group === group
              );
              if (!groupActions.length) return null;

              return (
                <div key={group} role="group" aria-label={t(`groups.${group}`)}>
                  <h2 className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
                    {t(`groups.${group}`)}
                  </h2>
                  <div>
                    {groupActions.map((action) => {
                      const index = filteredActions.indexOf(action);
                      const Icon = action.icon;
                      const disabled = Boolean(action.disabledReason);

                      return (
                        <button
                          key={action.id}
                          id={`command-palette-${action.id}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          aria-disabled={disabled}
                          onMouseMove={() => setActiveIndex(index)}
                          onClick={() => runAction(action)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none",
                            index === activeIndex && "bg-muted",
                            disabled && "text-muted-foreground"
                          )}
                        >
                          <span className="border-border bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                            <Icon className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {action.label}
                            </span>
                            <span
                              className={cn(
                                "text-muted-foreground block truncate text-xs",
                                action.disabledReason &&
                                  "text-amber-600 dark:text-amber-400"
                              )}
                            >
                              {action.disabledReason ?? action.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground px-4 py-10 text-center text-sm">
              {t("empty")}
            </div>
          )}
        </div>

        <div className="border-border text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[10px]">
          <span>{t("hintNavigate")}</span>
          <span>{t("hintRun")}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
