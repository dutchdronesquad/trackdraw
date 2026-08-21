"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import {
  Folder,
  Frame,
  Pencil,
  Search,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { MobileDrawer } from "@/components/MobileDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  getToolLabel,
  toolShortcuts,
  type EditorTool,
  type Translate,
} from "@/lib/editor/tool-registry";
import { getTrackItemToolConfigs } from "@/lib/track/items/registry";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ShortcutCategoryId =
  "essentials" | "tools" | "edit" | "canvas" | "project";
type ShortcutChord = string[];

interface ShortcutItem {
  id: string;
  category: Exclude<ShortcutCategoryId, "essentials">;
  label: string;
  description: string;
  shortcuts: ShortcutChord[];
  note?: string;
}

interface ShortcutCategory {
  id: ShortcutCategoryId;
  label: string;
  icon: LucideIcon;
  items: ShortcutItem[];
}

const toolShortcutOrder: EditorTool[] = [
  "select",
  "grab",
  ...getTrackItemToolConfigs().map((tool) => tool.id),
];

function getToolShortcutItems(
  t: Translate,
  describe: (tool: string) => string
): ShortcutItem[] {
  return toolShortcutOrder.flatMap((tool): ShortcutItem[] => {
    const shortcut = toolShortcuts[tool];
    if (!shortcut) return [];
    const label = getToolLabel(tool, t);
    return [
      {
        id: `tool-${tool}`,
        category: "tools",
        label,
        description: describe(label),
        shortcuts: [[shortcut]],
      },
    ];
  });
}

function ShortcutKeys({
  item,
  alternativeLabel,
}: {
  item: ShortcutItem;
  alternativeLabel: string;
}) {
  const shortcutLabel = item.shortcuts
    .map((chord) => chord.join(" plus "))
    .join(" or ");

  return (
    <div
      className="flex shrink-0 flex-wrap items-center justify-end gap-1"
      aria-label={shortcutLabel}
    >
      {item.shortcuts.map((chord, chordIndex) => (
        <div key={`${item.id}-${chord.join("-")}`} className="contents">
          {chordIndex > 0 ? (
            <span className="text-muted-foreground/65 px-0.5 text-[11px]">
              {alternativeLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            {chord.map((key, keyIndex) => (
              <span
                key={`${item.id}-${chordIndex}-${key}`}
                className="inline-flex items-center gap-1"
              >
                {keyIndex > 0 ? (
                  <span className="text-muted-foreground/55 text-[11px]">
                    +
                  </span>
                ) : null}
                <Kbd className="border-border/70 bg-muted/65 text-foreground/80 h-6 min-w-6 border px-1.5 text-[11px] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                  {key}
                </Kbd>
              </span>
            ))}
          </span>
        </div>
      ))}
      {item.note ? (
        <span className="text-muted-foreground/70 ml-1 text-[11px]">
          {item.note}
        </span>
      ) : null}
    </div>
  );
}

function KeyboardShortcutBrowser({ mobile = false }: { mobile?: boolean }) {
  const t = useTranslations("dialogs.keyboardShortcuts");
  const tCommon = useTranslations("common");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<ShortcutCategoryId>("essentials");

  const categories = useMemo(() => {
    const tools = getToolShortcutItems(tShapes, (tool) =>
      t("descriptions.activateTool", { tool })
    );
    const edit: ShortcutItem[] = [
      {
        id: "undo",
        category: "edit",
        label: t("shortcuts.undo"),
        description: t("descriptions.undo"),
        shortcuts: [["Ctrl/Cmd", "Z"]],
      },
      {
        id: "redo",
        category: "edit",
        label: t("shortcuts.redo"),
        description: t("descriptions.redo"),
        shortcuts: [
          ["Ctrl/Cmd", "Shift", "Z"],
          ["Ctrl", "Y"],
        ],
      },
      {
        id: "duplicate",
        category: "edit",
        label: t("shortcuts.duplicateItems"),
        description: t("descriptions.duplicateItems"),
        shortcuts: [["Ctrl/Cmd", "D"]],
      },
      {
        id: "copy",
        category: "edit",
        label: t("shortcuts.copyItems"),
        description: t("descriptions.copyItems"),
        shortcuts: [["Ctrl/Cmd", "C"]],
      },
      {
        id: "paste",
        category: "edit",
        label: t("shortcuts.pasteItems"),
        description: t("descriptions.pasteItems"),
        shortcuts: [["Ctrl/Cmd", "V"]],
      },
      {
        id: "rotate-left",
        category: "edit",
        label: t("shortcuts.rotateLeft"),
        description: t("descriptions.rotateLeft"),
        shortcuts: [["Q"], ["["]],
        note: "15°",
      },
      {
        id: "rotate-right",
        category: "edit",
        label: t("shortcuts.rotateRight"),
        description: t("descriptions.rotateRight"),
        shortcuts: [["E"], ["]"]],
        note: "15°",
      },
      {
        id: "rotate-left-small",
        category: "edit",
        label: t("shortcuts.rotateLeftSmall"),
        description: t("descriptions.rotateLeftSmall"),
        shortcuts: [
          ["Shift", "Q"],
          ["Shift", "["],
        ],
        note: "5°",
      },
      {
        id: "rotate-right-small",
        category: "edit",
        label: t("shortcuts.rotateRightSmall"),
        description: t("descriptions.rotateRightSmall"),
        shortcuts: [
          ["Shift", "E"],
          ["Shift", "]"],
        ],
        note: "5°",
      },
      {
        id: "key-rotate-fine",
        category: "edit",
        label: t("shortcuts.keyRotateFine"),
        description: t("descriptions.keyRotateFine"),
        shortcuts: [["Alt", "Q / E / [ / ]"]],
        note: "1°",
      },
      {
        id: "mouse-rotate-snap",
        category: "edit",
        label: t("shortcuts.mouseRotateSnap"),
        description: t("descriptions.mouseRotateSnap"),
        shortcuts: [["Drag"]],
        note: "5°",
      },
      {
        id: "mouse-rotate-fine",
        category: "edit",
        label: t("shortcuts.mouseRotateFine"),
        description: t("descriptions.mouseRotateFine"),
        shortcuts: [["Alt", "Drag"]],
        note: "1°",
      },
      {
        id: "delete",
        category: "edit",
        label: t("shortcuts.deleteItems"),
        description: t("descriptions.deleteItems"),
        shortcuts: [["Backspace"], ["Delete"]],
      },
      {
        id: "nudge",
        category: "edit",
        label: t("shortcuts.nudgeItems"),
        description: t("descriptions.nudgeItems"),
        shortcuts: [["Arrow keys"]],
      },
      {
        id: "fine-nudge",
        category: "edit",
        label: t("shortcuts.fineNudge"),
        description: t("descriptions.fineNudge"),
        shortcuts: [["Alt", "Arrow keys"]],
      },
      {
        id: "finish-path",
        category: "edit",
        label: t("shortcuts.finishPath"),
        description: t("descriptions.finishPath"),
        shortcuts: [["Enter"]],
      },
      {
        id: "remove-last-point",
        category: "edit",
        label: t("shortcuts.removeLastPoint"),
        description: t("descriptions.removeLastPoint"),
        shortcuts: [["Backspace"], ["Delete"]],
      },
      {
        id: "delete-path-point",
        category: "edit",
        label: t("shortcuts.deletePathPoint"),
        description: t("descriptions.deletePathPoint"),
        shortcuts: [["Backspace"], ["Delete"]],
      },
      {
        id: "cancel-draft",
        category: "edit",
        label: t("shortcuts.cancelDraft"),
        description: t("descriptions.cancelDraft"),
        shortcuts: [["Escape"]],
      },
    ];
    const canvas: ShortcutItem[] = [
      {
        id: "fit-view",
        category: "canvas",
        label: t("shortcuts.fitView"),
        description: t("descriptions.fitView"),
        shortcuts: [["0"]],
      },
      {
        id: "clear-selection",
        category: "canvas",
        label: t("shortcuts.clearSelection"),
        description: t("descriptions.clearSelection"),
        shortcuts: [["Escape"]],
      },
      {
        id: "pan-view",
        category: "canvas",
        label: t("shortcuts.panView"),
        description: t("descriptions.panView"),
        shortcuts: [["Middle click"]],
      },
      {
        id: "bypass-snap",
        category: "canvas",
        label: t("shortcuts.bypassSnap"),
        description: t("descriptions.bypassSnap"),
        shortcuts: [["Alt"]],
      },
      {
        id: "zoom",
        category: "canvas",
        label: t("shortcuts.zoom"),
        description: t("descriptions.zoom"),
        shortcuts: [["Mouse wheel"]],
      },
      {
        id: "toggle-sidebar",
        category: "canvas",
        label: t("shortcuts.toggleSidebar"),
        description: t("descriptions.toggleSidebar"),
        shortcuts: [["Ctrl/Cmd", "B"]],
      },
    ];
    const project: ShortcutItem[] = [
      {
        id: "command-palette",
        category: "project",
        label: t("shortcuts.openCommandPalette"),
        description: t("descriptions.openCommandPalette"),
        shortcuts: [["Ctrl/Cmd", "K"]],
      },
      {
        id: "save-snapshot",
        category: "project",
        label: t("shortcuts.saveSnapshot"),
        description: t("descriptions.saveSnapshot"),
        shortcuts: [["Ctrl/Cmd", "S"]],
      },
    ];
    const byId = new Map(
      [...tools, ...edit, ...canvas, ...project].map((item) => [item.id, item])
    );
    const essentials = [
      "tool-select",
      "tool-grab",
      "fit-view",
      "command-palette",
      "undo",
      "redo",
      "delete",
      "duplicate",
      "copy",
      "paste",
      "clear-selection",
    ]
      .map((id) => byId.get(id))
      .filter((item): item is ShortcutItem => Boolean(item));
    const categoryList: ShortcutCategory[] = [
      {
        id: "essentials",
        label: t("categories.essentials"),
        icon: Sparkles,
        items: essentials,
      },
      {
        id: "tools",
        label: t("categories.tools"),
        icon: Wrench,
        items: tools,
      },
      {
        id: "edit",
        label: t("categories.edit"),
        icon: Pencil,
        items: edit,
      },
      {
        id: "canvas",
        label: t("categories.canvas"),
        icon: Frame,
        items: canvas,
      },
      {
        id: "project",
        label: tCommon("labels.project"),
        icon: Folder,
        items: project,
      },
    ];
    return categoryList;
  }, [t, tCommon, tShapes]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const activeItems = normalizedQuery
    ? Array.from(
        new Map(
          categories
            .flatMap((category) => category.items)
            .map((item) => [item.id, item])
        ).values()
      ).filter((item) =>
        [item.label, item.description, item.shortcuts.flat().join(" ")]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      )
    : (categories.find((category) => category.id === activeCategory)?.items ??
      []);
  const activeCategoryLabel = normalizedQuery
    ? t("search.results", { count: activeItems.length })
    : categories.find((category) => category.id === activeCategory)?.label;

  return (
    <div className={cn("flex min-h-0 flex-col", mobile ? "gap-3" : "gap-4")}>
      <label className="relative block">
        <span className="sr-only">{t("search.label")}</span>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search.placeholder")}
          className="border-border bg-background/75 text-foreground placeholder:text-muted-foreground focus:border-primary/65 focus:ring-primary/15 h-11 w-full rounded-xl border pr-10 pl-10 text-sm transition outline-none focus:ring-4"
          autoFocus={!mobile}
        />
      </label>

      <div
        className={cn(
          "border-border/70 min-h-0 overflow-hidden rounded-xl border",
          mobile ? "flex flex-col" : "grid grid-cols-[13rem_minmax(0,1fr)]"
        )}
      >
        <nav
          aria-label={t("categories.label")}
          className={cn(
            "bg-muted/15",
            mobile
              ? "border-border/60 [scrollbar-width:none] overflow-x-auto border-b [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
              : "border-border/60 border-r p-1.5"
          )}
        >
          <div className={cn(mobile ? "flex min-w-max p-1.5" : "space-y-0.5")}>
            {categories.map((category) => {
              const Icon = category.icon;
              const active = !normalizedQuery && activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory(category.id);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-visible:ring-primary/30 flex items-center gap-2 rounded-lg text-left text-sm transition focus-visible:ring-2 focus-visible:outline-none",
                    mobile ? "px-3 py-2" : "w-full px-3 py-2.5",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/55 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="font-medium">{category.label}</span>
                  <span className="text-muted-foreground/70 ml-auto text-xs tabular-nums">
                    {category.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="bg-background/35 min-h-0" aria-live="polite">
          <div className="border-border/60 text-muted-foreground/75 grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b px-4 py-2 text-[10px] font-semibold tracking-[0.14em] uppercase sm:grid-cols-[13.5rem_minmax(10rem,1fr)_16rem]">
            <span>{activeCategoryLabel}</span>
            <span className="hidden sm:block">{t("table.description")}</span>
            <span className="text-right">{t("table.shortcut")}</span>
          </div>
          <div
            className={cn(
              "divide-border/55 divide-y overflow-y-auto",
              mobile ? "max-h-[44dvh]" : "max-h-[min(25rem,calc(90vh-19rem))]"
            )}
          >
            {activeItems.length ? (
              activeItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 sm:grid-cols-[13.5rem_minmax(10rem,1fr)_16rem]"
                >
                  <span className="text-foreground/90 text-[13px] leading-5 font-medium">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground hidden text-xs leading-5 sm:block">
                    {item.description}
                  </span>
                  <ShortcutKeys item={item} alternativeLabel={t("keys.or")} />
                </div>
              ))
            ) : (
              <div className="px-4 py-10 text-center">
                <p className="text-foreground/85 text-sm font-medium">
                  {t("search.emptyTitle")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("search.emptyBody")}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <p className="text-muted-foreground/75 text-[11px] leading-relaxed">
        {t("systemLayoutHint")}
      </p>
    </div>
  );
}

export default function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const t = useTranslations("dialogs.keyboardShortcuts");
  const tCommon = useTranslations("common");
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={t("dialogTitle")}
        subtitle={t("dialogSubtitle")}
        contentClassName="max-h-[92dvh]"
        bodyClassName="px-3 pt-3"
      >
        <KeyboardShortcutBrowser mobile />
      </MobileDrawer>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/20 backdrop-blur-sm" />
        <Dialog.Content className="border-border/60 bg-card fixed top-1/2 left-1/2 z-50 flex max-h-[min(90vh,52rem)] w-[min(64rem,calc(100vw-2.5rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border p-7 shadow-[0_28px_90px_rgba(15,23,42,0.18)] focus:outline-none">
          <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-foreground text-xl font-semibold tracking-[-0.02em]">
                {t("dialogTitle")}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {t("dialogSubtitle")}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/30 rounded-full p-2 transition focus-visible:ring-2 focus-visible:outline-none"
                aria-label={tCommon("actions.close")}
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <KeyboardShortcutBrowser />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
