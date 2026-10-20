import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Read definitions only; validate in disposable SQLite, never against live user data.
const environment = process.argv[2];
if (!["dev", "production"].includes(environment) || process.argv.length !== 3) {
  throw new Error("Usage: node scripts/check_auth_schema.mjs dev|production");
}
const root = fileURLToPath(new URL("../", import.meta.url));
const folder = mkdtempSync(join(tmpdir(), "trackdraw-auth-schema-"));
try {
  const schema = execFileSync(
    process.execPath,
    [
      join(root, "node_modules/wrangler/bin/wrangler.js"),
      "d1",
      "execute",
      "DB",
      "--remote",
      ...(environment === "dev" ? ["--env", "dev"] : []),
      "--command",
      "SELECT sql FROM sqlite_master WHERE type IN ('table', 'index') AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type DESC, name",
      "--json",
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  const file = join(folder, "schema.json");
  writeFileSync(file, schema, { mode: 0o600 });
  execFileSync(
    process.execPath,
    [
      join(root, "node_modules/vitest/vitest.mjs"),
      "run",
      "tests/lib/server/auth-schema.test.ts",
    ],
    {
      cwd: root,
      env: { ...process.env, TRACKDRAW_AUTH_SCHEMA_JSON: file },
      stdio: "inherit",
    }
  );
} finally {
  rmSync(folder, { recursive: true, force: true });
}
