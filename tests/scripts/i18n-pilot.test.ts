import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

let fixtureRoot = "";

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function runScript(name: "i18n_check.mjs" | "i18n_sync_assets.mjs") {
  return spawnSync(process.execPath, [join(process.cwd(), "scripts", name)], {
    encoding: "utf8",
    env: { ...process.env, TRACKDRAW_I18N_ROOT: fixtureRoot },
  });
}

describe("Crowdin pilot catalog scripts", () => {
  beforeEach(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "trackdraw-i18n-pilot-"));
    mkdirSync(join(fixtureRoot, "lang", "en-US"), { recursive: true });
    mkdirSync(join(fixtureRoot, "lang", "nl-NL"), { recursive: true });
    mkdirSync(join(fixtureRoot, "src"), { recursive: true });
    writeJson(join(fixtureRoot, "lang", "i18n-policy.json"), {
      localeDirectories: {
        en: "en-US",
        nl: "nl-NL",
      },
      englishOnlyNamespaces: [],
    });
    writeJson(join(fixtureRoot, "lang", "en-US", "common.json"), {
      nested: { translated: "Source", missing: "Fallback" },
      bullets: ["One", "Two"],
      greeting: "Hello {name}",
    });
    writeJson(join(fixtureRoot, "lang", "nl-NL", "common.json"), {
      nested: { translated: "Vertaald" },
      bullets: ["Eén"],
      greeting: "Hallo {name}",
    });
  });

  afterEach(() => {
    const rootToRemove = fixtureRoot;
    fixtureRoot = "";

    if (rootToRemove) {
      rmSync(rootToRemove, { recursive: true, force: true });
    }
  });

  it("generates complete assets by merging target messages over English", () => {
    const result = runScript("i18n_sync_assets.mjs");
    expect(result.status, result.stderr).toBe(0);

    const generated = JSON.parse(
      readFileSync(
        join(fixtureRoot, "public", "locales", "nl-NL", "common.json"),
        "utf8"
      )
    );
    expect(generated).toEqual({
      nested: { translated: "Vertaald", missing: "Fallback" },
      bullets: ["Eén", "Two"],
      greeting: "Hallo {name}",
    });
  });

  it("allows missing target keys while reporting their English fallbacks", () => {
    const result = runScript("i18n_check.mjs");

    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain("2 English fallback(s)");
  });

  it("still rejects placeholder mismatches", () => {
    writeJson(join(fixtureRoot, "lang", "nl-NL", "common.json"), {
      greeting: "Hallo",
    });

    const result = runScript("i18n_check.mjs");
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("greeting has different placeholders");
  });
});
