// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AccountDialog from "@/components/dialogs/AccountDialog";

const state = vi.hoisted(() => ({
  user: null as { id: string; name: string; email: string } | null,
  mobile: false,
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: state.user ? { user: state.user } : null,
      isPending: false,
    }),
  },
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => state.mobile }));
vi.mock("@/components/ProductAnalyticsControl", () => ({
  ProductAnalyticsControl: () => null,
}));
vi.mock("@/components/SidebarDialog", () => ({
  SidebarDialog: ({
    open,
    contentTitle,
    children,
  }: {
    open: boolean;
    contentTitle: string;
    children: ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={contentTitle}>
        {children}
      </div>
    ) : null,
}));

beforeEach(() => {
  state.user = null;
  window.history.replaceState(
    null,
    "",
    "/studio?dialog=account&section=api-keys"
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("account deep-link session boundary", () => {
  it.each([false, true])(
    "retains API keys through sign-in without creating keys (mobile=%s)",
    async (mobile) => {
      state.mobile = mobile;
      const fetchMock = vi.fn(
        async () => new Response(JSON.stringify({ ok: true, apiKeys: [] }))
      );
      vi.stubGlobal("fetch", fetchMock);
      const props = {
        open: true,
        onOpenChange: vi.fn(),
        view: "apiKeys" as const,
      };
      const { rerender } = render(<AccountDialog {...props} />);
      expect(screen.getByRole("dialog", { name: "API keys" })).toBeTruthy();
      const link = screen.getByRole("link", { name: "Sign in" });
      expect(
        new URL(
          link.getAttribute("href")!,
          "https://trackdraw.app"
        ).searchParams.get("callbackURL")
      ).toBe("/studio?dialog=account&section=api-keys");
      expect(fetchMock).not.toHaveBeenCalled();
      state.user = {
        id: "test-user",
        name: "Test User",
        email: "test@example.test",
      };
      rerender(<AccountDialog {...props} />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(screen.getByRole("dialog", { name: "API keys" })).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
      for (const call of fetchMock.mock.calls) {
        expect(call).toEqual([
          "/api/account/api-keys",
          { credentials: "same-origin" },
        ]);
      }
    }
  );
});
