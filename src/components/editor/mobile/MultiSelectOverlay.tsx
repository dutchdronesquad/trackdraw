"use client";

import { motion } from "framer-motion";
import { Copy, Group, Lock, Trash2, Ungroup, Unlock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EditorMobileMultiSelectOverlayProps {
  canUngroupSelection: boolean;
  className: string;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onGroupSelection: () => void;
  onSetGroupName?: (name: string) => void;
  onToggleSelectionLock: () => void;
  onUngroupSelection: () => void;
  selectedCount: number;
  selectedGroupName?: string | null;
  selectionLocked: boolean;
}

export function MultiSelectOverlay({
  canUngroupSelection,
  className,
  onDeleteSelection,
  onDuplicateSelection,
  onGroupSelection,
  onSetGroupName,
  onToggleSelectionLock,
  onUngroupSelection,
  selectedCount,
  selectedGroupName,
  selectionLocked,
}: EditorMobileMultiSelectOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start justify-between gap-3 px-1 pb-2">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold tracking-[0.08em] text-white/92 uppercase">
            {selectedCount > 0 ? `${selectedCount} selected` : "Multi-select"}
          </p>
          <p className="truncate text-[11px] text-white/70">
            Tap items to add or remove them.
          </p>
        </div>
      </div>

      {canUngroupSelection && onSetGroupName ? (
        <div className="px-1 pb-2">
          <Input
            value={selectedGroupName ?? ""}
            onChange={(event) => onSetGroupName(event.target.value)}
            placeholder="Group name"
            className="h-9 rounded-[0.9rem] border-white/12 bg-white/8 px-3 text-[12px] text-white placeholder:text-white/38"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={onDuplicateSelection}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          <Copy className="size-4" />
          <span>Duplicate</span>
        </button>
        <button
          onClick={canUngroupSelection ? onUngroupSelection : onGroupSelection}
          disabled={selectedCount < 2 && !canUngroupSelection}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          {canUngroupSelection ? (
            <Ungroup className="size-4" />
          ) : (
            <Group className="size-4" />
          )}
          <span>{canUngroupSelection ? "Ungroup" : "Group"}</span>
        </button>
        <button
          onClick={onToggleSelectionLock}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-white/72 transition-colors hover:bg-white/10 hover:text-white disabled:text-white/35"
        >
          {selectionLocked ? (
            <Unlock className="size-4" />
          ) : (
            <Lock className="size-4" />
          )}
          <span>{selectionLocked ? "Unlock" : "Lock"}</span>
        </button>
        <button
          onClick={onDeleteSelection}
          disabled={selectedCount === 0}
          className="flex flex-col items-center gap-1 rounded-[0.95rem] px-2 py-2 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-400/12 hover:text-rose-200 disabled:text-white/35"
        >
          <Trash2 className="size-4" />
          <span>Delete</span>
        </button>
      </div>
    </motion.div>
  );
}
