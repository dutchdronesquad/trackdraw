import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await rm(path.join(here, ".smoke-profile"), { recursive: true, force: true });
await rm(path.join(here, "artifacts"), { recursive: true, force: true });
await mkdir(path.join(here, "artifacts"), { recursive: true });
const env = { ...process.env, TRACKDRAW_POC_SMOKE: "1" };
delete env.ELECTRON_RUN_AS_NODE;
let app;
const errors = [];
async function launch() {
  app = await electron.launch({ args: [here], env });
  const page = await app.firstWindow();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() === 404)
      console.log("Missing asset:", response.url());
  });
  await page
    .getByRole("button", { name: "Load sample", exact: true })
    .waitFor();
  await page.waitForFunction(() =>
    document.querySelector(".konvajs-content canvas")
  );
  return page;
}
async function saved(page, count) {
  await page.waitForFunction(
    (count) =>
      JSON.parse(localStorage.getItem("trackdraw-design") || "null")?.shapes
        .length === count,
    count
  );
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("trackdraw-design"))
  );
}
async function readDownload(filename) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const bytes = await readFile(filename);
      const ending = bytes.subarray(-100).toString();
      if (
        filename.endsWith(".svg")
          ? ending.includes("</svg>")
          : ending.includes("%%EOF")
      )
        return bytes;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Download did not complete: ${filename}`);
}
try {
  let page = await launch();
  await page.evaluate(() =>
    localStorage.setItem(
      "trackdraw.locale",
      JSON.stringify({ state: { locale: "en" }, version: 0 })
    )
  );
  await page.reload();
  await page.getByRole("button", { name: "Load sample", exact: true }).click();
  const sample = await saved(page, 6);
  console.log("PASS: sample track and local autosave");

  await page.keyboard.press("g");
  const canvas = await page.locator(".konvajs-content").first().boundingBox();
  const point = {
    x: canvas.x + canvas.width * 0.45,
    y: canvas.y + canvas.height * 0.45,
  };
  await page.mouse.click(point.x, point.y);
  await saved(page, 7);
  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+z`);
  await saved(page, 6);
  await page.keyboard.press(`${modifier}+Shift+z`);
  let edited = await saved(page, 7);
  assert.equal(edited.id, sample.id);
  console.log("PASS: gate placement, undo and redo");

  await page.keyboard.press("v");
  await page.mouse.move(point.x - 24, point.y - 24);
  await page.mouse.down();
  await page.mouse.move(point.x + 24, point.y + 24, { steps: 10 });
  await page.mouse.up();
  const gate = edited.shapes.at(-1);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    ({ id, x }) =>
      JSON.parse(localStorage.getItem("trackdraw-design")).shapes.find(
        (shape) => shape.id === id
      )?.x !== x,
    { id: gate.id, x: gate.x }
  );
  edited = await saved(page, 7);
  assert.ok(edited.shapes.at(-1).x > gate.x);
  console.log("PASS: selection and nudge transform");
  await page.screenshot({ path: path.join(here, "artifacts/2d.png") });

  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.waitForFunction(() =>
    [...document.querySelectorAll("canvas")].some(
      (canvas) => canvas.getContext("webgl2") || canvas.getContext("webgl")
    )
  );
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(here, "artifacts/3d.png") });
  assert.equal(
    await page
      .getByText("Desktop POC could not start", { exact: true })
      .count(),
    0
  );
  console.log("PASS: 3D WebGL canvas");
  await page.getByRole("button", { name: "2D", exact: true }).click();

  const projectFile = path.join(here, "artifacts/roundtrip.json");
  await app.evaluate(({ dialog }, projectFile) => {
    dialog.showSaveDialog = async () => ({
      canceled: false,
      filePath: projectFile,
    });
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [projectFile],
    });
  }, projectFile);
  await page
    .getByRole("button", { name: "Save project copy as…", exact: true })
    .click();
  await page.getByText("Saved roundtrip.json", { exact: true }).waitFor();
  const exported = JSON.parse(await readFile(projectFile, "utf8"));
  assert.deepEqual(exported.shapes, edited.shapes);
  exported.title = "Desktop native roundtrip";
  await writeFile(projectFile, JSON.stringify(exported));
  await page
    .getByRole("button", { name: "Open project copy…", exact: true })
    .click();
  await page.getByText("Opened roundtrip.json", { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("trackdraw-design")).title ===
      "Desktop native roundtrip"
  );
  console.log(
    "PASS: native IPC save and open roundtrip (dialog selection simulated)"
  );

  await page.evaluate(() =>
    window.history.pushState(null, "", "/studio?dialog=export")
  );
  await page.getByRole("button", { name: /Vector/ }).waitFor();
  await app.evaluate(
    ({ session }, destination) => {
      session.defaultSession.on("will-download", (_event, item) => {
        const extension = item.getFilename().split(".").pop();
        item.setSavePath(`${destination}/export.${extension}`);
      });
    },
    path.join(here, "artifacts")
  );
  await page.getByRole("button", { name: /^Vector/ }).click();
  await page
    .getByRole("button", { name: "Export Vector", exact: true })
    .click();
  assert.match(
    (await readDownload(path.join(here, "artifacts/export.svg"))).toString(),
    /<svg/
  );
  await page.evaluate(() =>
    window.history.pushState(null, "", "/studio?dialog=export")
  );
  await page.getByRole("button", { name: "Race Day", exact: true }).click();
  await page
    .getByRole("button", { name: "Export Race Pack", exact: true })
    .click();
  assert.equal(
    (await readDownload(path.join(here, "artifacts/export.pdf")))
      .subarray(0, 5)
      .toString(),
    "%PDF-"
  );
  console.log(
    "PASS: SVG and Race Pack PDF exports through the existing export UI"
  );

  assert.deepEqual(
    await page.evaluate(() => ({
      require: typeof window.require,
      process: typeof window.process,
      bridge: Object.keys(window.trackdrawDesktop).sort(),
    })),
    {
      require: "undefined",
      process: "undefined",
      bridge: ["onMenuAction", "openProject", "saveProject"],
    }
  );
  console.log(
    "PASS: renderer has no Node.js access and a restricted native bridge"
  );

  assert.deepEqual(errors, []);
  await app.close();
  page = await launch();
  await page.waitForFunction(
    () =>
      JSON.parse(localStorage.getItem("trackdraw-design") || "null")?.title ===
      "Desktop native roundtrip"
  );
  assert.equal((await saved(page, 7)).title, "Desktop native roundtrip");
  console.log("PASS: project survives a full desktop restart");
  // app.exit bypasses renderer beforeunload, modelling loss of the process after confirmed autosave.
  await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  page = await launch();
  assert.equal((await saved(page, 7)).title, "Desktop native roundtrip");
  assert.deepEqual(errors, []);
  console.log("PASS: project survives abrupt exit after confirmed autosave");
  console.log("POC smoke checks passed");
} finally {
  await app?.close().catch(() => {});
}
