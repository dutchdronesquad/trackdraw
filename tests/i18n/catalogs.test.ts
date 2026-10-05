import { readFile } from "node:fs/promises";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let fixtureRoot = "";

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

describe("Spanish catalogs", () => {
  beforeEach(() => {
    vi.resetModules();
    getCloudflareContext.mockReset();
  });

  afterEach(() => {
    if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
    fixtureRoot = "";
  });

  it("uses English for every untranslated server-side namespace", async () => {
    getCloudflareContext.mockRejectedValue(new Error("No Worker context"));
    const { getCatalogForLocale } = await import("@/i18n/catalogs");
    const [spanish, english] = await Promise.all([
      getCatalogForLocale("es"),
      getCatalogForLocale("en"),
    ]);
    expect(spanish).toEqual(english);
    expect(Object.keys(spanish)).toHaveLength(12);
  });

  it("reads generated Spanish assets from the Worker binding", async () => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "trackdraw-spanish-assets-"));
    cpSync(join(process.cwd(), "lang"), join(fixtureRoot, "lang"), {
      recursive: true,
    });
    const sync = spawnSync(process.execPath, ["scripts/i18n_sync_assets.mjs"], {
      env: { ...process.env, TRACKDRAW_I18N_ROOT: fixtureRoot },
      encoding: "utf8",
    });
    expect(sync.status, sync.stderr).toBe(0);
    const fetchAsset = vi.fn(async (request: Request) => {
      const path = new URL(request.url).pathname;
      const contents = await readFile(
        join(fixtureRoot, "public", path),
        "utf8"
      );
      return new Response(contents, {
        headers: { "Content-Type": "application/json" },
      });
    });
    getCloudflareContext.mockResolvedValue({
      env: { ASSETS: { fetch: fetchAsset } },
    });
    const { pickCatalogNamespaces } = await import("@/i18n/catalogs");
    const spanish = await pickCatalogNamespaces("es", ["common", "legal"]);
    const english = await pickCatalogNamespaces("en", ["common", "legal"]);
    expect(spanish).toEqual(english);
    expect(
      fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
    ).toContain("/locales/es-ES/common.json");
    expect(
      fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
    ).not.toContain("/locales/es-ES/legal.json");
  });
});
