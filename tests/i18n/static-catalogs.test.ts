import { beforeEach, describe, expect, it, vi } from "vitest";
import common from "@lang/en-US/common.json";
import landing from "@lang/en-US/landing.json";
import legal from "@lang/en-US/legal.json";

const { readFile, fetchAsset, getCloudflareContext } = vi.hoisted(() => ({
  readFile: vi.fn(),
  fetchAsset: vi.fn(),
  getCloudflareContext: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("node:fs/promises", () => ({
  readFile,
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext,
}));

describe("static English catalogs in a Worker", () => {
  beforeEach(() => {
    vi.resetModules();
    readFile.mockReset().mockRejectedValue(new Error("ENOENT"));
    getCloudflareContext.mockReset().mockReturnValue({
      env: { ASSETS: { fetch: fetchAsset } },
    });
    const catalogs: Record<string, unknown> = { common, landing, legal };
    fetchAsset.mockReset().mockImplementation((request: Request) => {
      const namespace = new URL(request.url).pathname
        .split("/")
        .pop()
        ?.replace(".json", "");
      return Response.json(catalogs[namespace ?? ""]);
    });
  });

  it("loads common from ASSETS when local files are unavailable", async () => {
    const { pickStaticEnglishNamespaces } =
      await import("@/i18n/static-catalogs");
    await expect(pickStaticEnglishNamespaces(["common"])).resolves.toEqual({
      common,
    });
    expect(new URL(fetchAsset.mock.calls[0][0].url).pathname).toBe(
      "/locales/en-US/common.json"
    );
  });

  it("loads landing and legal metadata from ASSETS without local files", async () => {
    const { getStaticLandingMetadata, getStaticLegalMetadata } =
      await import("@/i18n/static-catalogs");
    await expect(getStaticLandingMetadata()).resolves.toEqual(landing.metadata);
    await expect(getStaticLegalMetadata("privacy")).resolves.toEqual(
      legal.privacy
    );
    await expect(getStaticLegalMetadata("terms")).resolves.toEqual(legal.terms);
  });

  it("uses generated files during prerender without requesting Worker context", async () => {
    readFile.mockResolvedValue(JSON.stringify(common));
    const { pickStaticEnglishNamespaces } =
      await import("@/i18n/static-catalogs");
    await expect(pickStaticEnglishNamespaces(["common"])).resolves.toEqual({
      common,
    });
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("uses source catalogs when generated files are unavailable during prerender", async () => {
    readFile
      .mockRejectedValueOnce(new Error("ENOENT"))
      .mockResolvedValueOnce(JSON.stringify(common));
    const { pickStaticEnglishNamespaces } =
      await import("@/i18n/static-catalogs");
    await expect(pickStaticEnglishNamespaces(["common"])).resolves.toEqual({
      common,
    });
    expect(getCloudflareContext).not.toHaveBeenCalled();
  });

  it("reports a missing namespace when neither files nor ASSETS contain it", async () => {
    fetchAsset.mockResolvedValue(new Response(null, { status: 404 }));
    const { pickStaticEnglishNamespaces } =
      await import("@/i18n/static-catalogs");
    await expect(pickStaticEnglishNamespaces(["common"])).rejects.toThrow(
      'Missing i18n namespace "common"'
    );
  });
});
