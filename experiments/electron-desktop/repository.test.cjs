const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");
const { openRepository } = require("./repository.cjs");
const design = (id, title = id) => ({
  version: 2,
  id,
  title,
  createdAt: "2026-10-24T10:00:00Z",
  updatedAt: "2026-10-24T10:00:00Z",
  field: { width: 60, height: 40, gridStep: 1 },
  shapes: [],
});
function setup(t) {
  const directory = mkdtempSync(path.join(tmpdir(), "trackdraw-desktop-"));
  const filename = path.join(directory, "projects.sqlite");
  const repo = openRepository(filename);
  t.after(() => {
    try {
      repo.close();
    } catch {}
    rmSync(directory, { recursive: true, force: true });
  });
  return { repo, filename };
}

test("desktop draft and project survive closing and reopening SQLite", (t) => {
  const { repo, filename } = setup(t);
  repo.command("save", { design: design("one"), restore: true });
  repo.close();
  const reopened = openRepository(filename);
  const state = reopened.command("state");
  assert.equal(state.draft.id, "one");
  assert.equal(state.designs[0].id, "one");
  assert.equal(state.restorePoints.length, 1);
  reopened.close();
});
test("a failed project write rolls back the working draft and metadata together", (t) => {
  const { repo, filename } = setup(t);
  repo.command("save", { design: design("safe") });
  const other = new DatabaseSync(filename);
  other.exec(
    "CREATE TRIGGER fail_write BEFORE INSERT ON projects BEGIN SELECT RAISE(ABORT,'write failed'); END;"
  );
  other.close();
  assert.throws(
    () => repo.command("save", { design: design("unsaved") }),
    /write failed/
  );
  assert.equal(repo.command("state").draft.id, "safe");
  assert.deepEqual(
    repo.command("state").designs.map((d) => d.id),
    ["safe"]
  );
});
test("an interrupted transaction cannot leave a different working draft", (t) => {
  const { repo, filename } = setup(t);
  repo.command("save", { design: design("safe") });
  repo.close();
  const child = spawnSync(process.execPath, [
    "-e",
    `const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.argv[1]);db.exec('BEGIN IMMEDIATE');db.prepare('UPDATE workspace SET design=? WHERE id=1').run(JSON.stringify({id:'partial'}));process.kill(process.pid,'SIGKILL');`,
    filename,
  ]);
  assert.equal(child.signal, "SIGKILL");
  const reopened = openRepository(filename);
  assert.equal(reopened.command("state").draft.id, "safe");
  reopened.close();
});
test("a future database version is rejected without rebuilding or downgrading it", (t) => {
  const { repo, filename } = setup(t);
  repo.command("save", { design: design("safe") });
  repo.close();
  let other = new DatabaseSync(filename);
  other.exec("PRAGMA user_version=99");
  other.close();
  assert.throws(() => openRepository(filename), /newer TrackDraw/);
  other = new DatabaseSync(filename);
  assert.equal(other.prepare("PRAGMA user_version").get().user_version, 99);
  assert.equal(
    other.prepare("SELECT count(*) AS count FROM projects").get().count,
    1
  );
  other.close();
});
test("duplicating and renaming an inactive project do not change the active draft", (t) => {
  const { repo } = setup(t);
  repo.command("save", { design: design("active") });
  repo.command("save-copy", { design: design("copy") });
  repo.command("rename", { id: "copy", title: "Copy title" });
  const state = repo.command("state");
  assert.equal(state.draft.id, "active");
  assert.equal(state.designs.find((d) => d.id === "copy").title, "Copy title");
});
test("restore points are retained per project and the oldest selectable point can still restore", (t) => {
  const { repo } = setup(t);
  for (let i = 0; i < 12; i++)
    repo.command("save", {
      design: design("one", `Version ${i}`),
      restore: true,
    });
  repo.command("save-copy", { design: design("other") });
  const state = repo.command("state");
  assert.equal(state.restorePoints.length, 10);
  const oldest = state.restorePoints.at(-1);
  repo.command("restore", { id: oldest.id });
  assert.equal(repo.command("state").draft.title, oldest.designTitle);
  assert.equal(repo.command("state").restorePoints.length, 10);
});
test("project deletion removes its restore points and does not delete another project", (t) => {
  const { repo } = setup(t);
  repo.command("save", { design: design("one"), restore: true });
  repo.command("save", { design: design("two"), restore: true });
  repo.command("delete", { ids: ["one"] });
  const state = repo.command("state");
  assert.equal(state.draft.id, "two");
  assert.equal(state.designs.length, 1);
  assert.equal(state.restorePoints.length, 1);
  assert.equal(state.restorePoints[0].designId, "two");
});
test("invalid input and unknown commands leave existing desktop data intact", (t) => {
  const { repo } = setup(t);
  repo.command("save", { design: design("safe") });
  assert.throws(
    () => repo.command("save", { design: { ...design("bad"), version: 99 } }),
    /Invalid/
  );
  assert.throws(
    () => repo.command("exec", { sql: "DELETE FROM projects" }),
    /Unsupported/
  );
  assert.equal(repo.command("state").draft.id, "safe");
});

test("failed restoration rolls back both the recovery snapshot and the target design", (t) => {
  const { repo, filename } = setup(t);
  repo.command("save", { design: design("one", "Old track"), restore: true });
  const point = repo.command("state").restorePoints[0];
  repo.command("save", { design: design("one", "Current track") });
  const other = new DatabaseSync(filename);
  other.exec(
    "CREATE TRIGGER fail_restore BEFORE UPDATE ON projects WHEN json_extract(NEW.design,'$.title')='Old track' BEGIN SELECT RAISE(ABORT,'restore failed'); END;"
  );
  other.close();
  assert.throws(
    () => repo.command("restore", { id: point.id }),
    /restore failed/
  );
  const state = repo.command("state");
  assert.equal(state.draft.title, "Current track");
  assert.equal(state.restorePoints.length, 1);
  assert.equal(state.restorePoints[0].id, point.id);
});
