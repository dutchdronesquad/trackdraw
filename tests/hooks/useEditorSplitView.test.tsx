// @vitest-environment happy-dom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EditorViewDivider } from "@/components/editor/EditorViewDivider";
import { useEditorSplitView } from "@/hooks/editor/useEditorSplitView";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("previews fractional divider movement without rerendering the editor shell", () => {
  let observerCallback!: ResizeObserverCallback;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  let renderCount = 0;
  let controls!: ReturnType<typeof useEditorSplitView>[1];
  const { container } = render(<Workspace />);
  function Workspace() {
    const [ref, split] = useEditorSplitView(true);
    controls = split;
    renderCount++;
    return <div ref={ref} />;
  }
  act(() => {
    observerCallback(
      [{ contentRect: { width: 1200 } }] as ResizeObserverEntry[],
      {} as ResizeObserver
    );
  });
  const before = renderCount;
  act(() => {
    controls.resize(51.125);
    controls.resize(51.25);
    controls.resize(51.375);
  });
  expect(renderCount).toBe(before);
  expect(
    (container.firstChild as HTMLElement).style.getPropertyValue(
      "--editor-split-ratio"
    )
  ).toBe("51.375%");
  act(() => {
    controls.commit(51.375);
  });
  expect(controls.ratio).toBe(51.375);
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

it("coalesces pointer moves into one frame and commits the release position", () => {
  const canvas = document.createElement("div");
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 1200, 800)
  );
  const resize = vi.fn((ratio: number) => ratio);
  const commit = vi.fn();
  const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
  const cancel = vi
    .spyOn(window, "cancelAnimationFrame")
    .mockImplementation(() => {});
  const { getByRole } = render(
    <EditorViewDivider
      canvasAreaRef={{ current: canvas }}
      split={{
        active: true,
        available: true,
        minRatio: 34,
        maxRatio: 66,
        ratio: 50,
        open: vi.fn(),
        setRequested: vi.fn(),
        resize,
        commit,
        reset: vi.fn(),
      }}
    />
  );
  const divider = getByRole("separator");
  vi.spyOn(divider, "getBoundingClientRect").mockReturnValue(
    new DOMRect(588, 0, 24, 800)
  );
  divider.setPointerCapture = vi.fn();
  fireEvent.pointerDown(divider, { pointerId: 1, clientX: 600, button: 0 });
  fireEvent.pointerMove(divider, { pointerId: 1, clientX: 624 });
  fireEvent.pointerMove(divider, { pointerId: 1, clientX: 625 });
  expect(resize).not.toHaveBeenCalled();
  expect(raf).toHaveBeenCalledOnce();
  act(() => {
    raf.mock.calls[0][0](0);
  });
  expect(resize).toHaveBeenCalledWith((625 / 1200) * 100);
  fireEvent.pointerMove(divider, { pointerId: 1, clientX: 626 });
  fireEvent.pointerUp(divider, { pointerId: 1, clientX: 627 });
  expect(cancel).toHaveBeenCalledWith(42);
  expect(commit).toHaveBeenCalledOnce();
  expect(commit).toHaveBeenCalledWith((626 / 1200) * 100);

  commit.mockClear();
  fireEvent.pointerDown(divider, { pointerId: 2, clientX: 600, button: 0 });
  fireEvent.pointerMove(divider, { pointerId: 2, clientX: 660 });
  fireEvent.pointerCancel(divider, { pointerId: 2 });
  expect(resize).toHaveBeenLastCalledWith(50);
  expect(commit).not.toHaveBeenCalled();

  fireEvent.pointerDown(divider, { pointerId: 3, clientX: 600, button: 0 });
  fireEvent.pointerMove(divider, { pointerId: 3, clientX: 650 });
  fireEvent.lostPointerCapture(divider, { pointerId: 3 });
  expect(commit).toHaveBeenLastCalledWith((650 / 1200) * 100);
});
