"use client";

import {
  Plus,
  ArrowDown,
  ArrowUp,
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
  const pathSelectionDetail =
    contextMenu.addWaypointSegmentIndex !== null
      ? "Segment selected"
      : contextMenu.deleteWaypointIndex !== null
        ? "Waypoint selected"
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
    <ContextMenuContent sideOffset={6} className="min-w-56">
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
                  ? "Quick actions"
                  : `${contextMenu.ids.length} selected`}
          </div>
        </ContextMenuLabel>
      </ContextMenuGroup>
      {hasPathActions && (
        <ContextMenuGroup>
          {contextMenu.editablePolylineId &&
            contextMenu.addWaypointSegmentIndex !== null && (
              <ContextMenuItem
                onClick={() => {
                  onAddWaypoint(
                    contextMenu.editablePolylineId!,
                    contextMenu.addWaypointSegmentIndex!
                  );
                  onClose();
                }}
              >
                <Plus className="size-3.5" />
                Add waypoint
              </ContextMenuItem>
            )}
          {contextMenu.editablePolylineId &&
            contextMenu.deleteWaypointIndex !== null && (
              <ContextMenuItem
                onClick={() => {
                  onDeleteWaypoint(
                    contextMenu.editablePolylineId!,
                    contextMenu.deleteWaypointIndex!
                  );
                  onClose();
                }}
              >
                <Trash2 className="size-3.5" />
                Delete waypoint
              </ContextMenuItem>
            )}
          {hasWaypointActions && hasPathActions && <ContextMenuSeparator />}
          {contextMenu.editablePolylineId && (
            <ContextMenuItem
              onClick={() => {
                onContinueEditing(contextMenu.editablePolylineId!);
                onClose();
              }}
            >
              <PencilLine className="size-3.5" />
              Continue editing
            </ContextMenuItem>
          )}
          {contextMenu.closablePolylineId && (
            <ContextMenuItem
              onClick={() => {
                onClosePolyline(contextMenu.closablePolylineId!);
                onClose();
              }}
            >
              <Link2 className="size-3.5" />
              Connect ends
            </ContextMenuItem>
          )}
        </ContextMenuGroup>
      )}
      {hasPathActions && <ContextMenuSeparator />}
      <ContextMenuGroup>
        <ContextMenuItem
          onClick={() => {
            onDuplicate(contextMenu.ids);
            onClose();
          }}
        >
          <Copy className="size-3.5" />
          Duplicate
          <ContextMenuShortcut>Ctrl/Cmd+D</ContextMenuShortcut>
        </ContextMenuItem>
        {contextMenu.canGroup && !contextMenu.hasGroupedShapes && (
          <ContextMenuItem
            onClick={() => {
              onGroupSelection(contextMenu.ids);
              onClose();
            }}
          >
            <Group className="size-3.5" />
            Group selection
          </ContextMenuItem>
        )}
        {!contextMenu.canGroup && contextMenu.hasGroupedShapes && (
          <ContextMenuItem
            onClick={() => {
              onUngroupSelection(contextMenu.ids);
              onClose();
            }}
          >
            <Ungroup className="size-3.5" />
            Ungroup selection
          </ContextMenuItem>
        )}
        {contextMenu.joinablePolylineIds.length >= 2 && (
          <ContextMenuItem
            onClick={() => {
              onJoinPolylines(contextMenu.joinablePolylineIds);
              onClose();
            }}
          >
            <GitMerge className="size-3.5" />
            Join paths
          </ContextMenuItem>
        )}
        <ContextMenuItem
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
          {contextMenu.locked ? "Unlock" : "Lock"}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={contextMenu.ids.length !== 1}>
            <ArrowUp className="size-3.5" />
            Arrange
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              onClick={() => {
                onBringForward(contextMenu.ids[0]);
                onClose();
              }}
            >
              <ArrowUp className="size-3.5" />
              Bring forward
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                onSendBackward(contextMenu.ids[0]);
                onClose();
              }}
            >
              <ArrowDown className="size-3.5" />
              Send backward
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        {contextMenu.rotatableIds.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <RotateCw className="size-3.5" />
              Rotate
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem
                onClick={() => {
                  onRotate(contextMenu.rotatableIds, -15);
                  onClose();
                }}
              >
                <RotateCcw className="size-3.5" />
                Rotate left
                <ContextMenuShortcut>Q / [</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  onRotate(contextMenu.rotatableIds, 15);
                  onClose();
                }}
              >
                <RotateCw className="size-3.5" />
                Rotate right
                <ContextMenuShortcut>E / ]</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuItem
        variant="destructive"
        onClick={() => {
          onDelete(contextMenu.ids);
          onClose();
        }}
      >
        <Trash2 className="size-3.5" />
        Delete
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
