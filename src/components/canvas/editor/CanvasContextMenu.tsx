"use client";

import {
  Plus,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Copy,
  GitMerge,
  Group,
  Link2,
  Lock,
  PencilLine,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  Ungroup,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { useSavePresetTrigger } from "@/store/save-preset-trigger";
import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

export interface ContextMenuData {
  addWaypointSegmentIndex: number | null;
  canGroup: boolean;
  closablePolylineId: string | null;
  deleteWaypointIndex: number | null;
  editablePolylineId: string | null;
  groupLabel: string | null;
  hasGroupedShapes: boolean;
  hasLockedShapes: boolean;
  ids: string[];
  joinablePolylineIds: string[];
  label: string;
  locked: boolean;
  rotatableIds: string[];
}

interface CanvasContextMenuContentProps {
  contextMenu: ContextMenuData;
  onAddWaypoint: (shapeId: string, segmentIndex: number) => void;
  onClose: () => void;
  onContinueEditing: (polylineId: string) => void;
  onClosePolyline: (id: string) => void;
  onDuplicate: (ids: string[]) => void;
  onGroupSelection: (ids: string[]) => void;
  onJoinPolylines: (ids: string[]) => void;
  onToggleLock: (ids: string[], locked: boolean) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onRotate: (ids: string[], delta: number) => void;
  onUngroupSelection: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onDeleteWaypoint: (shapeId: string, waypointIndex: number) => void;
}

export function CanvasContextMenuContent({
  contextMenu,
  onAddWaypoint,
  onClose,
  onContinueEditing,
  onClosePolyline,
  onDuplicate,
  onGroupSelection,
  onJoinPolylines,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onRotate,
  onUngroupSelection,
  onDelete,
  onDeleteWaypoint,
}: CanvasContextMenuContentProps) {
  const t = useTranslations("editor.contextMenu");
  const tActions = useTranslations("inspector.actions");
  const tCommon = useTranslations("common");
  const { data: authSession } = authClient.useSession();
  const canSavePresets =
    Boolean(authSession?.user?.id) && contextMenu.ids.length > 1;
  const triggerSavePreset = useSavePresetTrigger((s) => s.trigger);

  const pathSelectionDetail =
    contextMenu.addWaypointSegmentIndex !== null
      ? t("segmentSelected")
      : contextMenu.deleteWaypointIndex !== null
        ? t("waypointSelected")
        : null;
  const hasPathActions =
    Boolean(contextMenu.editablePolylineId) ||
    Boolean(contextMenu.closablePolylineId);
  const hasWaypointActions =
    (contextMenu.editablePolylineId &&
      contextMenu.addWaypointSegmentIndex !== null) ||
    (contextMenu.editablePolylineId &&
      contextMenu.deleteWaypointIndex !== null);

  return (
    <ContextMenuContent className="min-w-56">
      <ContextMenuGroup>
        <ContextMenuLabel>
          <div className="text-foreground/85 font-medium">
            {contextMenu.label}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {pathSelectionDetail
              ? pathSelectionDetail
              : contextMenu.groupLabel
                ? contextMenu.groupLabel
                : contextMenu.ids.length === 1
                  ? t("quickActions")
                  : t("selectedCount", { count: contextMenu.ids.length })}
          </div>
        </ContextMenuLabel>
      </ContextMenuGroup>
      {hasPathActions && (
        <ContextMenuGroup>
          {contextMenu.editablePolylineId &&
            contextMenu.addWaypointSegmentIndex !== null && (
              <ContextMenuItem
                className="gap-2"
                onClick={() => {
                  onAddWaypoint(
                    contextMenu.editablePolylineId!,
                    contextMenu.addWaypointSegmentIndex!
                  );
                  onClose();
                }}
              >
                <Plus className="size-3.5" />
                {t("addWaypoint")}
              </ContextMenuItem>
            )}
          {contextMenu.editablePolylineId &&
            contextMenu.deleteWaypointIndex !== null && (
              <ContextMenuItem
                className="gap-2"
                onClick={() => {
                  onDeleteWaypoint(
                    contextMenu.editablePolylineId!,
                    contextMenu.deleteWaypointIndex!
                  );
                  onClose();
                }}
              >
                <Trash2 className="size-3.5" />
                {t("deleteWaypoint")}
              </ContextMenuItem>
            )}
          {hasWaypointActions && hasPathActions && <ContextMenuSeparator />}
          {contextMenu.editablePolylineId && (
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
                onContinueEditing(contextMenu.editablePolylineId!);
                onClose();
              }}
            >
              <PencilLine className="size-3.5" />
              {tActions("continueEditing")}
            </ContextMenuItem>
          )}
          {contextMenu.closablePolylineId && (
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
                onClosePolyline(contextMenu.closablePolylineId!);
                onClose();
              }}
            >
              <Link2 className="size-3.5" />
              {tActions("connectEnds")}
            </ContextMenuItem>
          )}
        </ContextMenuGroup>
      )}
      {hasPathActions && <ContextMenuSeparator />}
      <ContextMenuGroup>
        <ContextMenuItem
          className="gap-2"
          disabled={contextMenu.hasLockedShapes}
          onClick={() => {
            onDuplicate(contextMenu.ids);
            onClose();
          }}
        >
          <Copy className="size-3.5" />
          {tCommon("actions.duplicate")}
          <ContextMenuShortcut>Ctrl/Cmd+D</ContextMenuShortcut>
        </ContextMenuItem>
        {canSavePresets && (
          <ContextMenuItem
            className="gap-2"
            onClick={() => {
              triggerSavePreset();
              onClose();
            }}
          >
            <Bookmark className="size-3.5" />
            {tActions("savePreset")}
          </ContextMenuItem>
        )}
        {contextMenu.canGroup && !contextMenu.hasGroupedShapes && (
          <ContextMenuItem
            className="gap-2"
            onClick={() => {
              onGroupSelection(contextMenu.ids);
              onClose();
            }}
          >
            <Group className="size-3.5" />
            {tActions("groupSelection")}
          </ContextMenuItem>
        )}
        {!contextMenu.canGroup && contextMenu.hasGroupedShapes && (
          <ContextMenuItem
            className="gap-2"
            onClick={() => {
              onUngroupSelection(contextMenu.ids);
              onClose();
            }}
          >
            <Ungroup className="size-3.5" />
            {tActions("ungroupSelection")}
          </ContextMenuItem>
        )}
        {contextMenu.joinablePolylineIds.length >= 2 && (
          <ContextMenuItem
            className="gap-2"
            onClick={() => {
              onJoinPolylines(contextMenu.joinablePolylineIds);
              onClose();
            }}
          >
            <GitMerge className="size-3.5" />
            {tActions("joinPaths")}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          className="gap-2"
          onClick={() => {
            onToggleLock(contextMenu.ids, !contextMenu.locked);
            onClose();
          }}
        >
          {contextMenu.locked ? (
            <Unlock className="size-3.5" />
          ) : (
            <Lock className="size-3.5" />
          )}
          {contextMenu.locked
            ? tCommon("actions.unlock")
            : tCommon("actions.lock")}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger
            className="gap-2"
            disabled={contextMenu.ids.length !== 1}
          >
            <ArrowUp className="size-3.5" />
            {t("arrange")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
                onBringForward(contextMenu.ids[0]);
                onClose();
              }}
            >
              <ArrowUp className="size-3.5" />
              {t("bringForward")}
            </ContextMenuItem>
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
                onSendBackward(contextMenu.ids[0]);
                onClose();
              }}
            >
              <ArrowDown className="size-3.5" />
              {t("sendBackward")}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        {contextMenu.rotatableIds.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <RotateCw className="size-3.5" />
              {t("rotate")}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                className="gap-2"
                onClick={() => {
                  onRotate(contextMenu.rotatableIds, -15);
                  onClose();
                }}
              >
                <RotateCcw className="size-3.5" />
                {t("rotateLeft")}
                <ContextMenuShortcut>Q / [</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem
                className="gap-2"
                onClick={() => {
                  onRotate(contextMenu.rotatableIds, 15);
                  onClose();
                }}
              >
                <RotateCw className="size-3.5" />
                {t("rotateRight")}
                <ContextMenuShortcut>E / ]</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuItem
        className="text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20 [&_svg]:text-destructive gap-2"
        disabled={contextMenu.hasLockedShapes}
        onClick={() => {
          onDelete(contextMenu.ids);
          onClose();
        }}
      >
        <Trash2 className="size-3.5" />
        {tCommon("actions.delete")}
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
