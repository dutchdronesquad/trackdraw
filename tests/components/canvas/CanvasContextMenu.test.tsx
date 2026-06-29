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

const polylineContextMenu: ContextMenuData = {
  ...baseContextMenu,
  ids: ["path-1"],
  label: "Race route",
  editablePolylineId: "path-1",
  rotatableIds: [],
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

  // ── Lock / unlock ──────────────────────────────────────────────

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
      { onClose, onDelete, onDuplicate, onToggleLock }
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

  it("shows Unlock when shape is locked and calls onToggleLock with false", async () => {
    const user = userEvent.setup();
    const onToggleLock = vi.fn();
    const onClose = vi.fn();

    renderContextMenu({ locked: true }, { onToggleLock, onClose });

    await user.click(screen.getByRole("button", { name: "Unlock" }));

    expect(onToggleLock).toHaveBeenCalledWith(["gate-1"], false);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Waypoint actions ───────────────────────────────────────────

  it("does not show Add waypoint without editablePolylineId", () => {
    renderContextMenu({ addWaypointSegmentIndex: 2 });
    expect(screen.queryByRole("button", { name: /add waypoint/i })).toBeNull();
  });

  it("does not show Add waypoint when editablePolylineId is set but segmentIndex is null", () => {
    renderContextMenu({ editablePolylineId: "path-1" });
    expect(screen.queryByRole("button", { name: /add waypoint/i })).toBeNull();
  });

  it("shows Add waypoint when editablePolylineId and addWaypointSegmentIndex are both set", () => {
    renderContextMenu({
      ...polylineContextMenu,
      addWaypointSegmentIndex: 3,
    });
    expect(screen.getByRole("button", { name: /add waypoint/i })).toBeDefined();
  });

  it("clicking Add waypoint calls onAddWaypoint with correct args and closes", async () => {
    const user = userEvent.setup();
    const onAddWaypoint = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { ...polylineContextMenu, addWaypointSegmentIndex: 3 },
      { onAddWaypoint, onClose }
    );

    await user.click(screen.getByRole("button", { name: /add waypoint/i }));

    expect(onAddWaypoint).toHaveBeenCalledWith("path-1", 3);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows Delete waypoint only when editablePolylineId and deleteWaypointIndex are both set", () => {
    renderContextMenu({ editablePolylineId: "path-1", deleteWaypointIndex: 1 });
    expect(
      screen.getByRole("button", { name: /delete waypoint/i })
    ).toBeDefined();
  });

  it("clicking Delete waypoint calls onDeleteWaypoint with correct args and closes", async () => {
    const user = userEvent.setup();
    const onDeleteWaypoint = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { ...polylineContextMenu, deleteWaypointIndex: 2 },
      { onDeleteWaypoint, onClose }
    );

    await user.click(screen.getByRole("button", { name: /delete waypoint/i }));

    expect(onDeleteWaypoint).toHaveBeenCalledWith("path-1", 2);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Path actions ───────────────────────────────────────────────

  it("shows Continue editing when editablePolylineId is set", () => {
    renderContextMenu({ editablePolylineId: "path-1" });
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeDefined();
  });

  it("clicking Continue editing calls onContinueEditing with the polyline id and closes", async () => {
    const user = userEvent.setup();
    const onContinueEditing = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { editablePolylineId: "path-1" },
      { onContinueEditing, onClose }
    );

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(onContinueEditing).toHaveBeenCalledWith("path-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows Connect ends when closablePolylineId is set", () => {
    renderContextMenu({ closablePolylineId: "path-1" });
    expect(screen.getByRole("button", { name: /^connect$/i })).toBeDefined();
  });

  it("clicking Connect ends calls onClosePolyline with the polyline id and closes", async () => {
    const user = userEvent.setup();
    const onClosePolyline = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { closablePolylineId: "path-1" },
      { onClosePolyline, onClose }
    );

    await user.click(screen.getByRole("button", { name: /^connect$/i }));

    expect(onClosePolyline).toHaveBeenCalledWith("path-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not show path action group when neither editablePolylineId nor closablePolylineId is set", () => {
    renderContextMenu();
    expect(screen.queryByRole("button", { name: /^continue$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^connect$/i })).toBeNull();
  });

  // ── Multi-selection actions ────────────────────────────────────

  it("shows Group selection when canGroup is true and selection is not grouped", () => {
    renderContextMenu({
      canGroup: true,
      hasGroupedShapes: false,
      ids: ["gate-1", "gate-2"],
    });
    expect(
      screen.getByRole("button", { name: /group selection/i })
    ).toBeDefined();
  });

  it("clicking Group selection calls onGroupSelection with all ids and closes", async () => {
    const user = userEvent.setup();
    const onGroupSelection = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { canGroup: true, hasGroupedShapes: false, ids: ["a", "b"] },
      { onGroupSelection, onClose }
    );

    await user.click(screen.getByRole("button", { name: /group selection/i }));

    expect(onGroupSelection).toHaveBeenCalledWith(["a", "b"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows Ungroup selection when hasGroupedShapes is true and canGroup is false", () => {
    renderContextMenu({
      canGroup: false,
      hasGroupedShapes: true,
      ids: ["gate-1", "gate-2"],
    });
    expect(
      screen.getByRole("button", { name: /ungroup selection/i })
    ).toBeDefined();
  });

  it("shows Join paths when joinablePolylineIds has two or more entries", () => {
    renderContextMenu({
      joinablePolylineIds: ["path-1", "path-2"],
      ids: ["path-1", "path-2"],
    });
    expect(screen.getByRole("button", { name: /join paths/i })).toBeDefined();
  });

  it("does not show Join paths with fewer than two joinable polylines", () => {
    renderContextMenu({ joinablePolylineIds: ["path-1"] });
    expect(screen.queryByRole("button", { name: /join paths/i })).toBeNull();
  });

  it("clicking Join paths calls onJoinPolylines with joinable ids and closes", async () => {
    const user = userEvent.setup();
    const onJoinPolylines = vi.fn();
    const onClose = vi.fn();

    renderContextMenu(
      { joinablePolylineIds: ["path-1", "path-2"], ids: ["path-1", "path-2"] },
      { onJoinPolylines, onClose }
    );

    await user.click(screen.getByRole("button", { name: /join paths/i }));

    expect(onJoinPolylines).toHaveBeenCalledWith(["path-1", "path-2"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Label / subtitle ───────────────────────────────────────────

  it("shows 'Segment selected' subtitle when addWaypointSegmentIndex is set", () => {
    renderContextMenu({
      editablePolylineId: "path-1",
      addWaypointSegmentIndex: 0,
    });
    expect(screen.getByText("Segment selected")).toBeDefined();
  });

  it("shows 'Waypoint selected' subtitle when deleteWaypointIndex is set", () => {
    renderContextMenu({
      editablePolylineId: "path-1",
      deleteWaypointIndex: 1,
    });
    expect(screen.getByText("Waypoint selected")).toBeDefined();
  });

  it("shows item count subtitle for multi-selection without group label", () => {
    renderContextMenu({ ids: ["a", "b", "c"] });
    expect(screen.getByText("3 selected")).toBeDefined();
  });

  it("shows 'Quick actions' subtitle for single shape without path selection", () => {
    renderContextMenu({ ids: ["gate-1"] });
    expect(screen.getByText("Quick actions")).toBeDefined();
  });

  // ── Standard actions ───────────────────────────────────────────

  it("clicking Duplicate calls onDuplicate with shape ids and closes", async () => {
    const user = userEvent.setup();
    const onDuplicate = vi.fn();
    const onClose = vi.fn();

    renderContextMenu({ ids: ["gate-1"] }, { onDuplicate, onClose });

    await user.click(screen.getByRole("button", { name: /duplicate/i }));

    expect(onDuplicate).toHaveBeenCalledWith(["gate-1"]);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("clicking Delete calls onDelete with shape ids and closes", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    renderContextMenu({ ids: ["gate-1"] }, { onDelete, onClose });

    await user.click(screen.getByRole("button", { name: "Delete Del" }));

    expect(onDelete).toHaveBeenCalledWith(["gate-1"]);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
