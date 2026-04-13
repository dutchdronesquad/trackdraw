// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Header from "@/components/editor/Header";

const undoMock = vi.fn();
const redoMock = vi.fn();
const useUndoRedoMock = vi.fn();

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    priority: _priority,
    quality: _quality,
    loader: _loader,
    blurDataURL: _blurDataURL,
    placeholder: _placeholder,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
    priority?: boolean;
    quality?: number;
    loader?: unknown;
    blurDataURL?: string;
    placeholder?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    span: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      children?: React.ReactNode;
    }) => <span {...props}>{children}</span>,
  },
}));

vi.mock("@/components/editor/MobileAppMenu", () => ({
  default: () => <div data-testid="mobile-app-menu" />,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "light",
}));

vi.mock("@/hooks/useUndoRedo", () => ({
  useUndoRedo: () => useUndoRedoMock(),
}));

describe("Header", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    undoMock.mockReset();
    redoMock.mockReset();
    useUndoRedoMock.mockReset();
    useUndoRedoMock.mockReturnValue({
      undo: undoMock,
      redo: redoMock,
      canUndo: false,
      canRedo: false,
    });
  });

  it("renders read-only review actions", () => {
    render(
      <Header
        tab="2d"
        onTabChange={vi.fn()}
        onShare={vi.fn()}
        readOnly
        studioHref="/studio?fromShare=1"
      />
    );

    expect(screen.getByText("Shared review")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Make editable copy" })
        .getAttribute("href")
    ).toBe("/studio?fromShare=1");
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("switches tabs and toggles obstacle numbers", async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const onToggleObstacleNumbers = vi.fn();

    render(
      <Header
        tab="2d"
        onTabChange={onTabChange}
        onShare={vi.fn()}
        onToggleObstacleNumbers={onToggleObstacleNumbers}
        showObstacleNumbers={false}
      />
    );

    await user.click(screen.getByRole("button", { name: "3D" }));
    await user.click(
      screen.getByRole("button", { name: "Show obstacle numbers" })
    );

    expect(onTabChange).toHaveBeenCalledWith("3d");
    expect(onToggleObstacleNumbers).toHaveBeenCalledTimes(1);
  });

  it("runs undo and redo actions when history is available", async () => {
    const user = userEvent.setup();

    useUndoRedoMock.mockReturnValue({
      undo: undoMock,
      redo: redoMock,
      canUndo: true,
      canRedo: true,
    });

    render(<Header tab="2d" onTabChange={vi.fn()} onShare={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    await user.click(screen.getByRole("button", { name: "Redo" }));

    expect(undoMock).toHaveBeenCalledTimes(1);
    expect(redoMock).toHaveBeenCalledTimes(1);
  });
});
