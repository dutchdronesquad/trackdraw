// @vitest-environment happy-dom

import type React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import DashboardAppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

let currentPath = "/dashboard/metrics/planning";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // oxlint-disable-next-line nextjs/no-img-element
    <img {...props} alt={props.alt ?? ""} />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => "light",
}));

vi.mock("@/components/dashboard/NavUser", () => ({
  default: () => null,
}));

describe("DashboardAppSidebar", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })
    );
  });

  afterEach(cleanup);

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("shows plans and limits as a distinct insights destination", () => {
    currentPath = "/dashboard/metrics/planning";
    render(
      <SidebarProvider>
        <DashboardAppSidebar
          currentUser={{
            name: "Admin",
            email: "admin@example.com",
            role: "admin",
          }}
          visibleModules={["metrics"]}
        />
      </SidebarProvider>
    );

    const metricsLink = screen.getByRole("link", { name: "Metrics" });
    const planningLink = screen.getByRole("link", {
      name: "Plans & limits",
    });

    expect(metricsLink.getAttribute("href")).toBe("/dashboard/metrics");
    expect(metricsLink.getAttribute("aria-current")).toBeNull();
    expect(planningLink.getAttribute("href")).toBe(
      "/dashboard/metrics/planning"
    );
    expect(planningLink.getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Insights")).toBeTruthy();
  });
});
