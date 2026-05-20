// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CanvasContextMenuContent,
  type ContextMenuData,
} from "@/components/canvas/editor/CanvasContextMenu";

vi.mock("@/components/ui/context-menu", () => {
  function PassthroughDiv({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    return <div className={className}>{children}</div>;
  }

  function PassthroughSpan({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) {
    return <span className={className}>{children}</span>;
  }

  function MockContextMenuSubTrigger({
    children,
    disabled,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
  }) {
    return (
      <button disabled={disabled} type="button">
        {children}
      </button>
    );
  }

  function MockContextMenuItem({
    children,
    disabled,
    onClick,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) {
    return (
      <button disabled={disabled} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return {
    ContextMenuContent: PassthroughDiv,
    ContextMenuGroup: PassthroughDiv,
    ContextMenuLabel: PassthroughDiv,
    ContextMenuSeparator: () => <hr />,
    ContextMenuShortcut: PassthroughSpan,
    ContextMenuSub: PassthroughDiv,
    ContextMenuSubContent: PassthroughDiv,
    ContextMenuSubTrigger: MockContextMenuSubTrigger,
    ContextMenuItem: MockContextMenuItem,
  };
});

const baseContextMenu: ContextMenuData = {
  addWaypointSegmentIndex: null,
  canGroup: false,
  closablePolylineId: null,
  deleteWaypointIndex: null,
  editablePolylineId: null,
  groupLabel: null,
  hasGroupedShapes: false,
  hasLockedShapes: false,
  ids: ["gate-1"],
  joinablePolylineIds: [],
  label: "Gate",
  locked: false,
  rotatableIds: ["gate-1"],
};

function renderContextMenu(
  contextMenu: Partial<ContextMenuData> = {},
  callbacks: Partial<React.ComponentProps<typeof CanvasContextMenuContent>> = {}
) {
  const props: React.ComponentProps<typeof CanvasContextMenuContent> = {
    contextMenu: { ...baseContextMenu, ...contextMenu },
    onAddWaypoint: vi.fn(),
    onBringForward: vi.fn(),
    onClose: vi.fn(),
    onClosePolyline: vi.fn(),
    onContinueEditing: vi.fn(),
    onDelete: vi.fn(),
    onDeleteWaypoint: vi.fn(),
    onDuplicate: vi.fn(),
    onGroupSelection: vi.fn(),
    onJoinPolylines: vi.fn(),
    onRotate: vi.fn(),
    onSendBackward: vi.fn(),
    onToggleLock: vi.fn(),
    onUngroupSelection: vi.fn(),
    ...callbacks,
  };

  render(<CanvasContextMenuContent {...props} />);
  return props;
}

describe("CanvasContextMenuContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables duplicate and delete actions when the selection contains locked shapes", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    const onToggleLock = vi.fn();

    renderContextMenu(
      {
        hasLockedShapes: true,
        ids: ["gate-1", "gate-2"],
        label: "Mixed selection",
        rotatableIds: ["gate-1"],
      },
      {
        onClose,
        onDelete,
        onDuplicate,
        onToggleLock,
      }
    );

    expect(
      (
        screen.getByRole("button", {
          name: "Duplicate Ctrl/Cmd+D",
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Delete Del" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Lock" }));

    expect(onDuplicate).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
    expect(onToggleLock).toHaveBeenCalledWith(["gate-1", "gate-2"], true);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
