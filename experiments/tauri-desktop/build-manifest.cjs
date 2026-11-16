const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestName = "offline-manifest.json";

function buildManifest(directory) {
  const entries = [];
  function visit(relative) {
    for (const item of fs.readdirSync(path.join(directory, relative), {
      withFileTypes: true,
    })) {
      const name = path.posix.join(relative, item.name);
      // Tauri rewrites the HTML entry point to inject its IPC bootstrap and CSP.
      // Hash the immutable renderer/catalog assets, not that generated HTML.
      if (name === manifestName || name === "index.html") continue;
      if (item.isDirectory()) visit(name);
      else if (item.isFile()) {
        const bytes = fs.readFileSync(path.join(directory, name));
        entries.push({
          path: `/${name}`,
          sha256: digest(bytes),
          size: bytes.length,
        });
      } else throw new Error("Desktop assets must be regular files.");
    }
  }
  visit("");
  entries.sort((a, b) => a.path.localeCompare(b.path, "en"));
  return { version: 1, revision: digest(JSON.stringify(entries)), entries };
}
module.exports = { buildManifest, manifestName, digest };
