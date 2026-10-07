import { readFile } from "node:fs/promises";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repositoryRoot = process.cwd();
const englishCommon = { actions: { save: "Save", cancel: "Cancel" } };
const spanishCommon = { actions: { save: "Guardar", cancel: "Cancel" } };
let fixtureRoot = "";

function writeNamespace(
  directory: string,
  namespace: string,
  messages: Record<string, unknown>
) {
  const destination = join(fixtureRoot, "lang", directory);
  mkdirSync(destination, { recursive: true });
  writeFileSync(
    join(destination, `${namespace}.json`),
    JSON.stringify(messages)
  );
}

function addSpanishTranslations() {
  // Missing and blank messages must still use the English fallback.
  writeNamespace("es-ES", "common", {
    actions: { save: "Guardar", cancel: "" },
  });
  writeNamespace("es-ES", "legal", { title: "Aviso legal" });
  writeNamespace("es-ES", "dashboard", { title: "Panel" });
}

const { getCloudflareContext } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

describe("Spanish catalogs", () => {
  beforeEach(() => {
    vi.resetModules();
    getCloudflareContext.mockReset();
    fixtureRoot = mkdtempSync(join(tmpdir(), "trackdraw-spanish-catalogs-"));
    mkdirSync(join(fixtureRoot, "lang"));
    copyFileSync(
      join(repositoryRoot, "lang", "i18n-policy.json"),
      join(fixtureRoot, "lang", "i18n-policy.json")
    );
    const namespaces = readdirSync(join(repositoryRoot, "lang", "en-US"))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.replace(/\.json$/, ""));
    for (const namespace of namespaces) {
      writeNamespace("en-US", namespace, { title: `English ${namespace}` });
    }
    writeNamespace("en-US", "common", englishCommon);
    vi.spyOn(process, "cwd").mockReturnValue(fixtureRoot);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
    fixtureRoot = "";
  });

  it("uses current English fallback copy in development despite stale Worker assets and earlier reads", async () => {
    vi.stubEnv("NODE_ENV", "development");
    writeNamespace("nl-NL", "inspector", {
      appearance: { title: "Uiterlijk" },
    });
    writeNamespace("en-US", "inspector", {
      appearance: { title: "Appearance" },
    });
    const fetchAsset = vi.fn(async (_request: Request) =>
      Response.json({ appearance: { title: "Old artwork" } })
    );
    getCloudflareContext.mockResolvedValue({
      env: { ASSETS: { fetch: fetchAsset } },
    });
    const { getCatalogForLocale, pickCatalogNamespaces } = await import(
      "@/i18n/catalogs"
    );
    await getCatalogForLocale("nl");
    writeNamespace("en-US", "inspector", {
      appearance: {
        title: "Appearance",
        unavailableTitle: "Artwork unavailable",
      },
    });
    const expected = {
      appearance: {
        title: "Uiterlijk",
        unavailableTitle: "Artwork unavailable",
      },
    };
    expect((await getCatalogForLocale("nl")).inspector).toEqual(expected);
    expect(await pickCatalogNamespaces("nl", ["inspector"])).toEqual({
      inspector: expected,
    });
    expect(
      fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
    ).not.toContain("/locales/nl-NL/inspector.json");
  });

  it.each([
    { scenario: "missing", translated: false },
    { scenario: "partial", translated: true },
  ])(
    "loads $scenario Spanish server-side catalogs with English fallback",
    async ({ translated }) => {
      if (translated) addSpanishTranslations();
      getCloudflareContext.mockRejectedValue(new Error("No Worker context"));
      const { getCatalogForLocale } = await import("@/i18n/catalogs");
      const [spanish, english] = await Promise.all([
        getCatalogForLocale("es"),
        getCatalogForLocale("en"),
      ]);
      expect(spanish).toEqual({
        ...english,
        common: translated ? spanishCommon : englishCommon,
      });
      expect(Object.keys(spanish)).toHaveLength(12);
    }
  );

  it.each([
    { scenario: "missing", translated: false },
    { scenario: "partial", translated: true },
  ])(
    "reads generated assets for $scenario Spanish translations from the Worker binding",
    async ({ translated }) => {
      if (translated) addSpanishTranslations();
      const sync = spawnSync(
        process.execPath,
        [join(repositoryRoot, "scripts/i18n_sync_assets.mjs")],
        {
          env: { ...process.env, TRACKDRAW_I18N_ROOT: fixtureRoot },
          encoding: "utf8",
        }
      );
      expect(sync.status, sync.stderr).toBe(0);
      // Worker reads must succeed without local source or generated catalogs.
      vi.mocked(process.cwd).mockReturnValue(join(fixtureRoot, "worker"));
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
      const namespaces = ["common", "legal", "dashboard"] as const;
      const spanish = await pickCatalogNamespaces("es", namespaces);
      const english = await pickCatalogNamespaces("en", namespaces);
      expect(spanish).toEqual({
        ...english,
        common: translated ? spanishCommon : englishCommon,
      });
      expect(
        fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
      ).toContain("/locales/es-ES/common.json");
      expect(
        fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
      ).not.toContain("/locales/es-ES/legal.json");
      expect(
        fetchAsset.mock.calls.map(([request]) => new URL(request.url).pathname)
      ).not.toContain("/locales/es-ES/dashboard.json");
    }
  );
});
