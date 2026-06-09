import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultDesign } from "@/lib/track/design";
import { encodeDesign } from "@/lib/share";
import { createStoredShareFixture } from "../../helpers/api-routes";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/shares", () => ({
  resolveStoredShare: vi.fn(),
}));

import { resolveShareView } from "@/lib/server/share-resolution";
import { resolveStoredShare } from "@/lib/server/shares";

describe("share view resolution", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns stored share details and a studio seed token for active shares", async () => {
    const design = createDefaultDesign();
    design.title = "Published race layout";
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "available",
      share: createStoredShareFixture({
        design,
        title: "Public title",
        description: "Public description",
      }),
    });

    const result = await resolveShareView("stored-token");

    expect(result).toMatchObject({
      source: "stored",
      status: "available",
      design: expect.objectContaining({ title: "Published race layout" }),
      title: "Public title",
      description: "Public description",
    });
    expect(result.status === "available" && result.studioSeedToken).toBe(
      encodeDesign(design)
    );
  });

  it("preserves stored expired and revoked statuses", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "expired",
      share: createStoredShareFixture(),
    });

    await expect(resolveShareView("expired-token")).resolves.toEqual({
      source: "stored",
      status: "expired",
    });

    vi.mocked(resolveStoredShare).mockResolvedValue({
      status: "revoked",
      share: createStoredShareFixture(),
    });

    await expect(resolveShareView("revoked-token")).resolves.toEqual({
      source: "stored",
      status: "revoked",
    });
  });

  it("retires legacy encoded share tokens instead of rendering them directly", async () => {
    const design = createDefaultDesign();
    vi.mocked(resolveStoredShare).mockResolvedValue({ status: "missing" });

    await expect(resolveShareView(encodeDesign(design))).resolves.toEqual({
      source: "legacy",
      status: "retired",
    });
  });

  it("marks unknown tokens as invalid legacy shares", async () => {
    vi.mocked(resolveStoredShare).mockResolvedValue({ status: "missing" });

    await expect(resolveShareView("not-a-share-token")).resolves.toEqual({
      source: "legacy",
      status: "invalid",
    });
  });
});
