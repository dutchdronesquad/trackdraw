"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  GitMerge,
  Lock,
  PencilLine,
  RotateCcw,
  RotateCw,
  Scan,
  Trash2,
  Unlock,
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
  closablePolylineId: string | null;
  editablePolylineId: string | null;
  ids: string[];
  joinablePolylineIds: string[];
  label: string;
  locked: boolean;
  rotatableIds: string[];
}

interface CanvasContextMenuContentProps {
  contextMenu: ContextMenuData;
  onClose: () => void;
  onContinueEditing: (polylineId: string) => void;
  onClosePolyline: (id: string) => void;
  onDuplicate: (ids: string[]) => void;
  onJoinPolylines: (ids: string[]) => void;
  onToggleLock: (ids: string[], locked: boolean) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onRotate: (ids: string[], delta: number) => void;
  onDelete: (ids: string[]) => void;
}

export function CanvasContextMenuContent({
  contextMenu,
  onClose,
  onContinueEditing,
  onClosePolyline,
  onDuplicate,
  onJoinPolylines,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onRotate,
  onDelete,
}: CanvasContextMenuContentProps) {
  return (
    <ContextMenuContent sideOffset={6} className="min-w-56">
      <ContextMenuGroup>
        <ContextMenuLabel>
          <div className="text-foreground/85 font-medium">
            {contextMenu.label}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {contextMenu.ids.length === 1
              ? "Quick actions"
              : `${contextMenu.ids.length} selected`}
          </div>
        </ContextMenuLabel>
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
            <Scan className="size-3.5" />
            Close loop
          </ContextMenuItem>
        )}
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
