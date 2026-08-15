// @vitest-environment happy-dom

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardNavUser from "@/components/dashboard/NavUser";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(async () => undefined),
  },
}));

vi.mock("@/components/UserAvatar", () => ({
  default: ({ name }: { name: string }) => <span>{name}</span>,
}));

describe("DashboardNavUser", () => {
  afterEach(() => cleanup());

  it("opens the footer profile menu above its trigger", async () => {
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <DashboardNavUser
          user={{
            name: "Metrics Admin",
            email: "admin@example.com",
            role: "admin",
          }}
        />
      </SidebarProvider>
    );

    await user.click(screen.getByRole("button", { name: /Metrics Admin/ }));

    expect(screen.getByRole("menu").getAttribute("data-side")).toBe("top");
  });
});
