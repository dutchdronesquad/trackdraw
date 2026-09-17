import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve relative to this file, not process.cwd() - this script also runs
// from packages/viewer's own `build` script, whose cwd is packages/viewer/.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const TEXTURE_ROOT = path.join(PUBLIC_DIR, "assets/models/textures");
const OUT_FILE = path.join(
  ROOT,
  "packages/viewer/src/assets/generated/texture-manifest.json"
);

const CONTENT_TYPES = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function walk(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, results);
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function toRootRelativePath(file) {
  return `/${path.relative(PUBLIC_DIR, file).split(path.sep).join("/")}`;
}

function buildManifest() {
  const manifest = {};

  for (const file of walk(TEXTURE_ROOT)) {
    const ext = path.extname(file).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) continue;

    const bytes = readFileSync(file);
    const stats = statSync(file);

    manifest[toRootRelativePath(file)] = {
      contentType,
      sizeBytes: stats.size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  return manifest;
}

function main() {
  const manifest = buildManifest();
  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(manifest).length} asset manifest entries to ${path.relative(ROOT, OUT_FILE)}`
  );
}

main();
