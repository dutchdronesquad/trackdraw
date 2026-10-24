const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  buildManifest,
  openOfflineAssets,
  manifestName,
} = require("./offline-assets.cjs");
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "trackdraw-offline-"));
  const bundle = path.join(root, "bundle");
  const cache = path.join(root, "retained");
  fs.mkdirSync(path.join(bundle, "assets"), { recursive: true });
  fs.writeFileSync(path.join(bundle, "index.html"), "<html>TrackDraw</html>");
  fs.writeFileSync(path.join(bundle, "assets", "gate.webp"), "catalog texture");
  const manifest = buildManifest(bundle);
  fs.writeFileSync(path.join(bundle, manifestName), JSON.stringify(manifest));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { bundle, cache, manifest, service: openOfflineAssets(bundle, cache) };
}
test("retained files survive restart and removal of their original bundled resources", (t) => {
  const { bundle, cache, service, manifest } = setup(t);
  assert.equal(service.check(manifest), "missing");
  assert.deepEqual(service.prepare(), manifest);
  fs.rmSync(path.join(bundle, "assets"), { recursive: true });
  const reopened = openOfflineAssets(bundle, cache);
  assert.equal(reopened.check(manifest), "verified");
  assert.equal(
    fs.readFileSync(reopened.fileFor("/assets/gate.webp"), "utf8"),
    "catalog texture"
  );
  assert.equal(reopened.fileFor("/../../secret"), null);
});
test("missing and tampered retained bytes are detected and can be repaired from the bundle", (t) => {
  const { service, manifest } = setup(t);
  service.prepare();
  const filename = service.fileFor("/assets/gate.webp");
  fs.writeFileSync(filename, "damaged texture");
  assert.equal(service.check(manifest), "missing");
  assert.equal(service.fileFor("/assets/gate.webp"), null);
  service.prepare();
  assert.equal(service.check(manifest), "verified");
  fs.rmSync(filename);
  assert.equal(service.check(manifest), "missing");
});
test("a changed app requires preparation again while retaining older pinned files", (t) => {
  const { service, bundle, cache, manifest } = setup(t);
  service.prepare();
  const previous = service.fileFor("/assets/gate.webp");
  fs.writeFileSync(
    path.join(bundle, "assets", "gate.webp"),
    "new catalog texture"
  );
  fs.writeFileSync(
    path.join(bundle, manifestName),
    JSON.stringify(buildManifest(bundle))
  );
  const updated = openOfflineAssets(bundle, cache);
  assert.equal(updated.check(manifest), "update");
  updated.prepare();
  assert.equal(fs.existsSync(previous), true);
});
test("unavailable or malformed manifests never report offline readiness", (t) => {
  const { bundle, cache, manifest } = setup(t);
  fs.writeFileSync(
    path.join(bundle, manifestName),
    JSON.stringify({
      ...manifest,
      entries: [{ path: "/../secret", sha256: "bad", size: 1 }],
    })
  );
  const service = openOfflineAssets(bundle, cache);
  assert.throws(() => service.prepare(), /unavailable/);
  assert.equal(service.check({}), "missing");
  assert.equal(service.check({ version: 1, entries: [null] }), "missing");
});
test("missing or corrupt source files fail preparation and hide native filesystem paths", (t) => {
  const { bundle, service } = setup(t);
  fs.rmSync(path.join(bundle, "assets", "gate.webp"));
  assert.throws(() => service.prepare(), {
    message:
      "Offline preparation failed. Check the installation and available disk space, then retry.",
  });
  fs.writeFileSync(path.join(bundle, "assets", "gate.webp"), "wrong bytes");
  assert.throws(() => service.prepare(), /missing or damaged/);
});
