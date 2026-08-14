// @vitest-environment happy-dom

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import common from "@lang/en-US/common.json";

const productEvents = vi.hoisted(() => ({
  disabled: true,
  getProductAnalyticsDisabled: vi.fn(),
  getProductEventSessionId: vi.fn(),
  setProductAnalyticsDisabled: vi.fn(),
}));

vi.mock("@/lib/product-events", () => ({
  getProductAnalyticsDisabled: productEvents.getProductAnalyticsDisabled,
  getProductEventSessionId: productEvents.getProductEventSessionId,
  setProductAnalyticsDisabled: productEvents.setProductAnalyticsDisabled,
}));

import { ProductAnalyticsControl } from "@/components/ProductAnalyticsControl";

describe("ProductAnalyticsControl", () => {
  beforeEach(() => {
    productEvents.disabled = true;
    productEvents.getProductAnalyticsDisabled.mockImplementation(
      () => productEvents.disabled
    );
    productEvents.getProductEventSessionId.mockReturnValue(null);
    productEvents.setProductAnalyticsDisabled.mockImplementation((disabled) => {
      productEvents.disabled = disabled;
    });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("keeps analytics disabled when re-enabling fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true, enabled: false }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    render(
      <NextIntlClientProvider locale="en-US" messages={{ common }}>
        <ProductAnalyticsControl embedded />
      </NextIntlClientProvider>
    );

    const toggle = screen.getByRole("switch", {
      name: "Share privacy-safe product analytics",
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.click(toggle);

    await waitFor(() =>
      expect(toggle.getAttribute("aria-checked")).toBe("false")
    );
    expect(productEvents.setProductAnalyticsDisabled).toHaveBeenNthCalledWith(
      1,
      false
    );
    expect(productEvents.setProductAnalyticsDisabled).toHaveBeenLastCalledWith(
      true
    );
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
