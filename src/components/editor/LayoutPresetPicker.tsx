"use client";

import { memo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DesktopModal } from "@/components/DesktopModal";
import { MobileDrawer } from "@/components/MobileDrawer";
import {
  Bookmark,
  BookmarkPlus,
  Lightbulb,
  LogIn,
  Pencil,
  Store,
  Trash2,
  X,
} from "lucide-react";
import {
  findPresetById,
  getLayoutPresetBounds,
  getLayoutPresetKindCounts,
  getLayoutPresetShapeCount,
  type LayoutPreset,
} from "@/lib/planning/layout-presets";
import { useUserPresets } from "@/store/user-presets";
import { useAccountPresetSync } from "@/store/useAccountPresetSync";
import { authClient } from "@/lib/auth-client";
import { getShapeKindLabel, type Translate } from "@/lib/track/items/registry";
import { cn } from "@/lib/utils";

type NavSection = "my-presets" | "store";

function preparePresets(presets: LayoutPreset[], t: Translate) {
  return presets.map((preset) => {
    const counts = getLayoutPresetKindCounts(preset);
    return {
      preset,
      countSummary: Array.from(counts.entries())
        .map(([kind, count]) => `${count} ${getShapeKindLabel(kind, t)}`)
        .join(" · "),
      itemCount: getLayoutPresetShapeCount(preset),
    };
  });
}

const PW = 160;
const PH = 80;
const PP = 14;

const PresetPreview = memo(function PresetPreview({
  preset,
}: {
  preset: LayoutPreset;
}) {
  const bounds = getLayoutPresetBounds(preset);

  const contentW = PW - PP * 2;
  const contentH = PH - PP * 2;
  const scale = Math.min(contentW / bounds.width, contentH / bounds.height, 10);
  const scaledW = bounds.width * scale;
  const scaledH = bounds.height * scale;
  const ox = PP + (contentW - scaledW) / 2;
  const oy = PP + (contentH - scaledH) / 2;

  function px(worldX: number) {
    return ox + (worldX - bounds.minX) * scale;
  }
  function py(worldY: number) {
    return oy + (worldY - bounds.minY) * scale;
  }

  return (
    <svg
      viewBox={`0 0 ${PW} ${PH}`}
      className="h-20 w-full rounded-xl border border-white/8 bg-slate-950/90"
      role="presentation"
    >
      {preset.shapes.map((shape, index) => {
        const x = px(shape.x);
        const y = py(shape.y);
        const key = `${preset.id}-${index}`;

        if (shape.kind === "flag" || shape.kind === "cone") {
          return (
            <circle
              key={key}
              cx={x}
              cy={y}
              r={3}
              fill={shape.color ?? "#cbd5e1"}
              opacity="0.9"
            />
          );
        }

        if (shape.kind === "startfinish") {
          return (
            <rect
              key={key}
              x={x - 7}
              y={y - 2.5}
              width="14"
              height="5"
              rx="1.5"
              fill={shape.color ?? "#f59e0b"}
              opacity="0.9"
            />
          );
        }

        if (shape.kind === "ladder") {
          return (
            <rect
              key={key}
              x={x - 3}
              y={y - 6}
              width="6"
              height="12"
              rx="1.5"
              fill={shape.color ?? "#14b8a6"}
              opacity="0.9"
            />
          );
        }

        if (shape.kind === "divegate") {
          return (
            <rect
              key={key}
              x={x - 4.5}
              y={y - 4.5}
              width="9"
              height="9"
              rx="1.5"
              fill="none"
              stroke={shape.color ?? "#f97316"}
              strokeWidth="1.5"
              opacity="0.9"
            />
          );
        }

        return (
          <rect
            key={key}
            x={x - 4}
            y={y - 4}
            width="8"
            height="8"
            rx="1.5"
            fill={shape.color ?? "#3b82f6"}
            opacity="0.9"
          />
        );
      })}
    </svg>
  );
});

function UserPresetCard({
  preset,
  countSummary,
  itemCount,
  selected,
  onSelect,
  onRename,
  onRemove,
}: {
  preset: LayoutPreset;
  countSummary: string;
  itemCount: number;
  selected: boolean;
  onSelect: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const t = useTranslations("editor.layoutPresetPicker");
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleRenameCommit() {
    const value = inputRef.current?.value.trim() ?? "";
    if (value && value !== preset.name) onRename(preset.id, value);
    setRenaming(false);
  }

  return (
    <div
      className={cn(
        "border-border/60 bg-card hover:border-border flex flex-col gap-3 rounded-2xl border p-3 transition-colors",
        selected && "border-primary/25 bg-primary/4"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="cursor-pointer text-left"
      >
        <PresetPreview preset={preset} />
      </button>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                ref={inputRef}
                defaultValue={preset.name}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                onBlur={handleRenameCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameCommit();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="border-border/60 bg-background focus:border-primary/50 w-full rounded-md border px-2 py-0.5 text-sm font-semibold outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                onClick={onSelect}
                className="w-full cursor-pointer text-left text-sm font-semibold"
              >
                {preset.name}
              </button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <span className="bg-muted text-muted-foreground mr-1 inline-flex rounded-full px-2 py-1 text-[10px] font-medium whitespace-nowrap uppercase">
              {t("itemsCount", { count: itemCount })}
            </span>
            {!confirmDelete && (
              <button
                type="button"
                title={t("renamePresetTooltip")}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                  setRenaming(true);
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-1 transition-colors"
              >
                <Pencil className="size-3" />
              </button>
            )}
            {confirmDelete ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-muted-foreground hover:text-foreground rounded-md px-1.5 py-0.5 text-[10px] transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(preset.id)}
                  className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500 transition-colors hover:bg-red-500/20"
                >
                  {t("delete")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                title={t("deletePresetTooltip")}
                onClick={(e) => {
                  e.stopPropagation();
                  setRenaming(false);
                  setConfirmDelete(true);
                }}
                className="text-muted-foreground hover:text-destructive hover:bg-muted rounded-md p-1 transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-[11px]">{countSummary}</p>
      </div>
    </div>
  );
}

function UserPresetGrid({
  presets,
  selectedPresetId,
  onSelectPreset,
}: {
  presets: ReturnType<typeof preparePresets>;
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}) {
  const { renameUserPreset, removeUserPreset } = useAccountPresetSync();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {presets.map(({ preset, countSummary, itemCount }) => (
        <UserPresetCard
          key={preset.id}
          preset={preset}
          countSummary={countSummary}
          itemCount={itemCount}
          selected={preset.id === selectedPresetId}
          onSelect={() => onSelectPreset(preset.id)}
          onRename={renameUserPreset}
          onRemove={removeUserPreset}
        />
      ))}
    </div>
  );
}

function MyPresetsContent({
  selectedPresetId,
  onSelectPreset,
}: {
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}) {
  const t = useTranslations("editor.layoutPresetPicker");
  const tShapes = useTranslations("shapes") as unknown as Translate;
  const { data: authSession } = authClient.useSession();
  const isSignedIn = Boolean(authSession?.user?.id);
  const userPresets = useUserPresets((state) => state.userPresets);
  const preparedUserPresets = preparePresets(userPresets, tShapes);

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <LogIn className="text-muted-foreground/40 size-8" />
        <div className="space-y-1">
          <p className="text-foreground/70 text-sm font-medium">
            {t("signInTitle")}
          </p>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
            {t("signInDescription")}
          </p>
        </div>
      </div>
    );
  }

  if (preparedUserPresets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <BookmarkPlus className="text-muted-foreground/40 size-8" />
        <div className="space-y-1">
          <p className="text-foreground/70 text-sm font-medium">
            {t("noPresetsTitle")}
          </p>
          <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
            {t.rich("noPresetsDescription", {
              strong: (chunks) => (
                <strong className="text-foreground/60">{chunks}</strong>
              ),
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <UserPresetGrid
      presets={preparedUserPresets}
      selectedPresetId={selectedPresetId}
      onSelectPreset={onSelectPreset}
    />
  );
}

function StoreContent() {
  const t = useTranslations("editor.layoutPresetPicker");
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Store className="text-muted-foreground/40 size-8" />
      <div className="space-y-1">
        <p className="text-foreground/70 text-sm font-medium">
          {t("comingSoonTitle")}
        </p>
        <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
          {t("comingSoonDescription")}
        </p>
      </div>
    </div>
  );
}

function SidebarNav({
  active,
  onChange,
}: {
  active: NavSection;
  onChange: (section: NavSection) => void;
}) {
  const t = useTranslations("editor.layoutPresetPicker");
  return (
    <nav className="space-y-0.5">
      <button
        type="button"
        onClick={() => onChange("my-presets")}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
          active === "my-presets"
            ? "bg-primary/8 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Bookmark className="size-4 shrink-0" />
        {t("myPresetsNav")}
      </button>
      <button
        type="button"
        onClick={() => onChange("store")}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
          active === "store"
            ? "bg-primary/8 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
      >
        <Store className="size-4 shrink-0" />
        <span className="flex-1 text-left">{t("storeNav")}</span>
        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-medium uppercase">
          {t("soonBadge")}
        </span>
      </button>
    </nav>
  );
}

function MobilePresetsContent({
  selectedPresetId,
  onSelectPreset,
}: {
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}) {
  const [section, setSection] = useState<NavSection>("my-presets");

  return (
    <div className="space-y-4">
      <SidebarNav active={section} onChange={setSection} />
      {section === "my-presets" && (
        <MyPresetsContent
          selectedPresetId={selectedPresetId}
          onSelectPreset={onSelectPreset}
        />
      )}
      {section === "store" && <StoreContent />}
    </div>
  );
}

interface LayoutPresetPickerProps {
  mobile?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}

export function LayoutPresetPicker({
  mobile = false,
  open,
  onOpenChange,
  selectedPresetId,
  onSelectPreset,
}: LayoutPresetPickerProps) {
  const t = useTranslations("editor.layoutPresetPicker");
  const [section, setSection] = useState<NavSection>("my-presets");
  const userPresets = useUserPresets((state) => state.userPresets);
  const selectedPreset = findPresetById(selectedPresetId, userPresets);

  if (mobile) {
    return (
      <MobileDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={t("mobileTitle")}
        subtitle={t("mobileSubtitle")}
        pinnedContent={
          <>
            {selectedPreset && (
              <div className="border-border/30 shrink-0 border-b px-4 pt-3 pb-4">
                <div className="border-border/50 bg-muted/18 rounded-xl border px-4 py-3">
                  <p className="text-foreground text-sm font-medium">
                    {selectedPreset.name}
                  </p>
                  {selectedPreset.description && (
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {selectedPreset.description}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="border-border/30 shrink-0 border-b px-4 pt-3 pb-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                {t("placeFlowTitle")}
              </p>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {t("placeFlowDescription")}
              </p>
            </div>
          </>
        }
        bodyClassName="pt-4 pb-4"
      >
        <MobilePresetsContent
          selectedPresetId={selectedPresetId}
          onSelectPreset={onSelectPreset}
        />
      </MobileDrawer>
    );
  }

  if (!open) return null;

  return (
    <DesktopModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("desktopTitle")}
      headerless
      maxWidth="max-w-4xl"
      panelClassName="flex flex-col overflow-hidden rounded-4xl p-0"
      subtitle={undefined}
    >
      <div className="flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1 pr-6">
              <p className="text-foreground text-[1.25rem] font-semibold tracking-[-0.02em]">
                {t("desktopTitle")}
              </p>
              <p className="text-muted-foreground mt-1.5 max-w-none text-sm leading-relaxed">
                {t("desktopSubtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground/75 hover:text-foreground hover:bg-muted shrink-0 cursor-pointer rounded-full p-1.5 transition-colors"
              aria-label={t("close")}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="border-border/30 grid min-h-104 grid-cols-[16rem_minmax(0,1fr)] border-t">
          <div className="border-border/30 flex flex-col gap-6 border-r px-4 py-6">
            <SidebarNav active={section} onChange={setSection} />

            {selectedPreset && (
              <div className="border-border/60 bg-muted/18 rounded-xl border px-4 py-3">
                <p className="text-foreground text-sm font-medium">
                  {selectedPreset.name}
                </p>
                {selectedPreset.description && (
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {selectedPreset.description}
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto rounded-xl border border-amber-400/20 bg-amber-400/6 px-4 py-3">
              <div className="flex gap-2.5">
                <Lightbulb className="mt-px size-3.5 shrink-0 text-amber-400/80" />
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  {t.rich("tipText", {
                    strong: (chunks) => (
                      <strong className="text-foreground/60">{chunks}</strong>
                    ),
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="max-h-[58vh] min-h-0 overflow-y-auto px-8 py-6">
              {section === "my-presets" && (
                <MyPresetsContent
                  selectedPresetId={selectedPresetId}
                  onSelectPreset={onSelectPreset}
                />
              )}
              {section === "store" && <StoreContent />}
            </div>
          </div>
        </div>
        <div className="shrink-0 pb-2" />
      </div>
    </DesktopModal>
  );
}
