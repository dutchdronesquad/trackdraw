import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

// TrackDraw budgets, independent of Cloudflare's platform upload limits.
const budgets = { raw: 9 * 1024 * 1024, gzip: 2200 * 1024 };
const file =
  process.argv[2] ?? ".open-next/server-functions/default/handler.mjs";
const source = readFileSync(file);
const sizes = { raw: source.byteLength, gzip: gzipSync(source).byteLength };
for (const kind of ["raw", "gzip"]) {
  console.log(
    `Worker handler ${kind}: ${sizes[kind]} bytes (budget ${budgets[kind]} bytes)`
  );
  if (sizes[kind] > budgets[kind]) {
    console.error(
      `::error::Worker handler exceeds TrackDraw's ${kind} budget. Check the bundle before deploying.`
    );
    process.exitCode = 1;
  }
}
