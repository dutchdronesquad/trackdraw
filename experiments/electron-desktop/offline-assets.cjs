const fs = require("node:fs");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestName = "offline-manifest.json";

function buildManifest(directory) {
  const entries = [];
  function visit(relative) {
    for (const item of fs.readdirSync(path.join(directory, relative), {
      withFileTypes: true,
    })) {
      const name = path.posix.join(relative, item.name);
      if (name === manifestName) continue;
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
function validManifest(manifest) {
  return (
    manifest?.version === 1 &&
    Array.isArray(manifest.entries) &&
    manifest.entries.length > 0 &&
    manifest.entries.length < 10000 &&
    manifest.entries.every(
      (entry) =>
        entry &&
        typeof entry.path === "string" &&
        /^\/[a-zA-Z0-9_./@ -]+$/.test(entry.path) &&
        !entry.path.startsWith("//") &&
        !entry.path.split("/").some((part) => part === ".." || part === ".") &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        Number.isSafeInteger(entry.size) &&
        entry.size >= 0 &&
        entry.size <= 32 * 1024 * 1024
    ) &&
    new Set(manifest.entries.map((entry) => entry.path)).size ===
      manifest.entries.length &&
    manifest.entries.reduce((total, entry) => total + entry.size, 0) <=
      128 * 1024 * 1024 &&
    digest(JSON.stringify(manifest.entries)) === manifest.revision
  );
}
function openOfflineAssets(bundle, directory) {
  let manifest = null;
  try {
    const value = JSON.parse(
      fs.readFileSync(path.join(bundle, manifestName), "utf8")
    );
    if (validManifest(value)) manifest = value;
  } catch {
    /* Local editing still starts when preparation is unavailable. */
  }
  const checks = new Map();
  const blobPath = (entry) =>
    path.join(directory, `${entry.sha256}${path.posix.extname(entry.path)}`);
  function verified(entry) {
    try {
      const filename = blobPath(entry);
      const stat = fs.statSync(filename);
      if (!stat.isFile() || stat.size !== entry.size) return false;
      const stamp = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${stat.ino}`;
      const previous = checks.get(filename);
      if (previous?.stamp === stamp) return previous.valid;
      const valid = digest(fs.readFileSync(filename)) === entry.sha256;
      checks.set(filename, { stamp, valid });
      return valid;
    } catch {
      return false;
    }
  }
  function prepareFiles() {
    if (!manifest)
      throw new Error(
        "Offline preparation is unavailable. Rebuild or reinstall Desktop Alpha."
      );
    fs.mkdirSync(directory, { recursive: true });
    for (const entry of manifest.entries) {
      if (verified(entry)) continue;
      const bytes = fs.readFileSync(path.join(bundle, entry.path.slice(1)));
      if (bytes.length !== entry.size || digest(bytes) !== entry.sha256)
        throw new Error(
          "A bundled file is missing or damaged. Rebuild or reinstall Desktop Alpha."
        );
      const temporary = path.join(directory, `.pending-${randomUUID()}`);
      try {
        fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 0o600 });
        const fd = fs.openSync(temporary, "r");
        try {
          fs.fsyncSync(fd);
        } finally {
          fs.closeSync(fd);
        }
        fs.renameSync(temporary, blobPath(entry));
      } finally {
        fs.rmSync(temporary, { force: true });
      }
      if (!verified(entry))
        throw new Error("Offline file verification failed.");
    }
    // Commit the directory entries before SQLite acknowledges a prepared revision.
    if (process.platform !== "win32") {
      const fd = fs.openSync(directory, "r");
      try {
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    }
    return manifest;
  }
  function check(record) {
    if (!validManifest(record)) return "missing";
    if (record.entries.some((entry) => !verified(entry))) return "missing";
    if (!manifest || manifest.revision !== record.revision) return "update";
    return "verified";
  }
  return {
    prepare() {
      try {
        return prepareFiles();
      } catch (error) {
        if (error.code)
          throw new Error(
            "Offline preparation failed. Check the installation and available disk space, then retry."
          );
        throw error;
      }
    },
    check,
    fileFor(pathname) {
      const entry = manifest?.entries.find((entry) => entry.path === pathname);
      return entry && verified(entry) ? blobPath(entry) : null;
    },
  };
}
module.exports = { buildManifest, openOfflineAssets, manifestName, digest };
