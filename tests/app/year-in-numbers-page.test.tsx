import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), load: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found");
  },
}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: mocks.user,
}));
vi.mock("@/lib/server/year-in-numbers", () => ({
  loadYearInNumbers: mocks.load,
}));
import Page from "@/app/dashboard/metrics/year-in-numbers/page";
describe("Year in numbers access", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([null, { role: "user" }, { role: "moderator" }])(
    "rejects unauthorized readers (%s)",
    async (user) => {
      mocks.user.mockResolvedValue(user);
      await expect(
        Page({ searchParams: Promise.resolve({ year: "2026" }) })
      ).rejects.toThrow("Not found");
      expect(mocks.load).not.toHaveBeenCalled();
    }
  );
  it("rejects invalid years before loading totals", async () => {
    mocks.user.mockResolvedValue({ role: "admin" });
    await expect(
      Page({ searchParams: Promise.resolve({ year: "2026.5" }) })
    ).rejects.toThrow("Not found");
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
