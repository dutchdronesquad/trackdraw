import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET } from "@/app/studio/open/[projectId]/route";
import { getCurrentUserFromHeaders } from "@/lib/server/auth-session";
import { getProjectForUser } from "@/lib/server/projects";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/auth-session", () => ({
  getCurrentUserFromHeaders: vi.fn(),
}));
vi.mock("@/lib/server/projects", () => ({ getProjectForUser: vi.fn() }));
import { createDefaultDesign } from "@/lib/track/design";
afterEach(() => vi.unstubAllEnvs());
const request = new Request("https://internal.invalid/studio/open/draft", {
  headers: { cookie: "test" },
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://trackdraw.app");
});
it("preserves the exact opening link across sign-in", async () => {
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValue(null);
  const response = await GET(request, {
    params: Promise.resolve({ projectId: "draft" }),
  });
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe(
    "https://trackdraw.app/login?callbackURL=%2Fstudio%2Fopen%2Fdraft"
  );
  expect(getCurrentUserFromHeaders).toHaveBeenCalledWith(request.headers);
  expect(getProjectForUser).not.toHaveBeenCalled();
});
it("does not redirect other users, archived or missing projects into the editor", async () => {
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValue({
    id: "owner",
    email: "test@example.invalid",
    name: "test",
    image: null,
    role: "user",
  });
  vi.mocked(getProjectForUser).mockResolvedValue(null);
  const response = await GET(request, {
    params: Promise.resolve({ projectId: "other" }),
  });
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(getProjectForUser).toHaveBeenCalledWith("other", "owner");
});

it("opens an owned active draft on the canonical host without caching", async () => {
  vi.mocked(getCurrentUserFromHeaders).mockResolvedValue({
    id: "owner",
    email: null,
    name: null,
    image: null,
    role: "user",
  });
  const design = createDefaultDesign();
  vi.mocked(getProjectForUser).mockResolvedValue({
    id: "draft",
    revision: 1,
    ownerUserId: "owner",
    title: design.title,
    description: "",
    design,
    designUpdatedAt: design.updatedAt,
    fieldWidth: 30,
    fieldHeight: 20,
    shapeCount: 0,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
    archivedAt: null,
  });
  const response = await GET(request, {
    params: Promise.resolve({ projectId: "draft" }),
  });
  expect(response.headers.get("location")).toBe(
    "https://trackdraw.app/studio?project=draft"
  );
  expect(response.headers.get("cache-control")).toBe("no-store");
});
