import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  capability: vi.fn(),
  load: vi.fn(),
  insights: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.user,
}));
vi.mock("@/lib/server/authorization", () => ({
  hasCapability: mocks.capability,
}));
vi.mock("@/lib/server/localization-demand", () => ({
  getLocalizationDemandMetrics: mocks.load,
}));
vi.mock("@/lib/server/metrics", () => ({ getProductInsights: mocks.insights }));
import {
  loadLocalizationDemand,
  loadProductInsights,
} from "@/app/dashboard/metrics/actions";

describe("localization demand dashboard action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ role: "admin" });
    mocks.capability.mockReturnValue(true);
  });
  it.each([loadLocalizationDemand, loadProductInsights])(
    "checks metrics access on every request (%s)",
    async (load) => {
      mocks.user.mockResolvedValueOnce(null);
      await expect(
        load({ from: "2026-01-01", to: "2026-02-01" })
      ).rejects.toThrow("Forbidden");
      mocks.capability.mockReturnValue(false);
      await expect(
        load({ from: "2026-01-01", to: "2026-02-01" })
      ).rejects.toThrow("Forbidden");
      expect(mocks.load).not.toHaveBeenCalled();
      expect(mocks.insights).not.toHaveBeenCalled();
    }
  );
  it("passes only the selected dates to the authorized loader", async () => {
    const range = { from: "2026-01-01", to: "2026-02-01" };
    await loadLocalizationDemand(range);
    await loadProductInsights(range);
    expect(mocks.insights).toHaveBeenCalledWith(range);
    expect(mocks.capability).toHaveBeenCalledWith(
      "admin",
      "admin.metrics.read"
    );
    expect(mocks.load).toHaveBeenCalledWith(expect.any(Date), range);
  });
  it("rejects malformed arguments before reading aggregates", async () => {
    await expect(loadLocalizationDemand(null as never)).rejects.toThrow();
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.insights).not.toHaveBeenCalled();
  });
});
