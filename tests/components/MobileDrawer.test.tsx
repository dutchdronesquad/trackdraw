// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileDrawer } from "@/components/MobileDrawer";

vi.mock("vaul", async () => {
  const React = await import("react");

  const Root = ({
    children,
    handleOnly,
  }: {
    children: React.ReactNode;
    handleOnly?: boolean;
  }) => (
    <div data-testid="drawer-root" data-handle-only={String(handleOnly)}>
      {children}
    </div>
  );
  const Primitive = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, ...props }, ref) => (
    <div ref={ref} {...props}>
      {children}
    </div>
  ));
  Primitive.displayName = "DrawerPrimitive";
  const Handle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
  >(({ children, ...props }, ref) => (
    <div ref={ref} data-vaul-handle="" {...props}>
      {children}
    </div>
  ));
  Handle.displayName = "DrawerHandle";

  return {
    Drawer: {
      Content: Primitive,
      Description: Primitive,
      Handle,
      NestedRoot: Root,
      Overlay: Primitive,
      Portal: Primitive,
      Root,
      Title: Primitive,
    },
  };
});

describe("MobileDrawer", () => {
  afterEach(cleanup);

  it("keeps drag work on the handle and contains mobile scrolling", () => {
    render(
      <MobileDrawer
        open
        onOpenChange={vi.fn()}
        title="Inspector"
        subtitle="Selected item"
      >
        Drawer body
      </MobileDrawer>
    );

    expect(screen.getByTestId("drawer-root").dataset.handleOnly).toBe("true");

    const overlay = document.querySelector(
      '[data-slot="mobile-drawer-overlay"]'
    );
    expect(overlay?.className).toContain("bg-black/20");
    expect(overlay?.className).not.toContain("backdrop-blur");

    const content = document.querySelector(
      '[data-slot="mobile-drawer-content"]'
    );
    expect(content?.className).toContain("group/drawer-content");
    const handle = content?.querySelector("[data-vaul-handle]");
    expect(handle).toBeTruthy();
    expect(handle?.className).toContain("self-center");

    const body = screen.getByText("Drawer body");
    expect(body.className).toContain("touch-pan-y");
    expect(body.className).toContain("overscroll-y-contain");
    expect(body.className).toContain("overflow-y-auto");
  });
});
