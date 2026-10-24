const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { tmpdir } = require("node:os");
const { writeProjectBackup } = require("./project-backup.cjs");

async function setup(t) {
  const directory = await fs.mkdtemp(path.join(tmpdir(), "trackdraw-backup-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "track.json");
  await fs.writeFile(filename, "previous backup");
  return { directory, filename };
}

test("a complete backup atomically replaces the previous file", async (t) => {
  const { directory, filename } = await setup(t);
  await writeProjectBackup(filename, "new track");
  assert.equal(await fs.readFile(filename, "utf8"), "new track");
  assert.deepEqual(await fs.readdir(directory), ["track.json"]);
});

for (const failure of ["write", "sync", "rename"]) {
  test(`a failed ${failure} keeps the previous backup and cleans temporary files`, async (t) => {
    const { directory, filename } = await setup(t);
    const files = {
      ...fs,
      async open(...args) {
        const handle = await fs.open(...args);
        return {
          writeFile: async (...values) => {
            await handle.writeFile(...values);
            if (failure === "write") throw new Error("Disk full");
          },
          sync: () =>
            failure === "sync"
              ? Promise.reject(new Error("Sync failed"))
              : handle.sync(),
          close: () => handle.close(),
        };
      },
      rename: (...args) =>
        failure === "rename"
          ? Promise.reject(new Error("Access denied"))
          : fs.rename(...args),
    };
    await assert.rejects(writeProjectBackup(filename, "unfinished", files));
    assert.equal(await fs.readFile(filename, "utf8"), "previous backup");
    assert.deepEqual(await fs.readdir(directory), ["track.json"]);
  });
}
