import { _electron as electron } from "playwright";
import assert from "node:assert/strict";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(path.join(here, "../../package.json"))("sharp");
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
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error("Renderer:", error.message);
  });
  page.on("response", (response) => {
    if (response.status() === 404)
      console.log("Missing asset:", response.url());
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".desktop-workbench") ||
      document.querySelector("h1")
  );
  if (
    await page.getByText("Desktop POC could not start", { exact: true }).count()
  )
    throw new Error(await page.locator("body").innerText());
  await page.getByRole("tab", { name: "Home", exact: true }).waitFor();
  return page;
}
async function waitForDraft(page, predicate) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const draft = await page.evaluate(
      async () => (await window.trackdrawDesktop.projects("state")).draft
    );
    if (predicate(draft)) return draft;
    await page.waitForTimeout(100);
  }
  throw new Error(
    "Timed out waiting for the desktop database to confirm the expected design."
  );
}
async function saved(page, count) {
  return waitForDraft(page, (draft) => draft?.shapes.length === count);
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
  await page.waitForFunction(() =>
    document.querySelector(".konvajs-content canvas")
  );
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
  edited = await waitForDraft(
    page,
    (draft) => draft?.shapes.find((shape) => shape.id === gate.id)?.x > gate.x
  );
  assert.ok(edited.shapes.find((shape) => shape.id === gate.id).x > gate.x);
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
  await app.evaluate(({ Menu }) =>
    Menu.getApplicationMenu()
      .items.find((item) => item.label === "File")
      .submenu.items.find((item) => item.label === "Save project copy as…")
      .click()
  );
  await page.getByText("Saved roundtrip.json", { exact: true }).waitFor();
  const exported = JSON.parse(await readFile(projectFile, "utf8"));
  assert.deepEqual(exported.shapes, edited.shapes);
  exported.title = "Desktop native roundtrip";
  await writeFile(projectFile, JSON.stringify(exported));
  await app.evaluate(({ Menu }) =>
    Menu.getApplicationMenu()
      .items.find((item) => item.label === "File")
      .submenu.items.find((item) => item.label === "Open project copy…")
      .click()
  );
  await page.getByText("Opened roundtrip.json", { exact: true }).waitFor();
  await waitForDraft(
    page,
    (draft) => draft?.title === "Desktop native roundtrip"
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
      bridge: [
        "finishClose",
        "onCloseRequested",
        "onMenuAction",
        "openProject",
        "projects",
        "saveProject",
      ],
    }
  );
  console.log(
    "PASS: renderer has no Node.js access and a restricted native bridge"
  );

  // Separate stores must retain their own history and viewport through tab switches.
  await page
    .getByRole("tab", { name: "Open Practice Layout", exact: true })
    .click();
  await page.getByRole("button", { name: "2D", exact: true }).click();
  await page.waitForFunction(() =>
    document.querySelector(".konvajs-content canvas")
  );
  const viewport = await page.locator(".konvajs-content").first().boundingBox();
  await page.mouse.move(
    viewport.x + viewport.width / 2,
    viewport.y + viewport.height / 2
  );
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(1500);
  const readViewport = () =>
    page.evaluate(() => {
      const stage = window.Konva.stages.find((stage) => stage.width() > 500);
      return { x: stage.x(), y: stage.y(), scale: stage.scaleX() };
    });
  const savedViewport = await readViewport();
  await page.getByRole("button", { name: "New track", exact: true }).click();
  await waitForDraft(page, (draft) => draft?.title === "Untitled track");
  await page.waitForFunction(() =>
    document.querySelector(".konvajs-content canvas")
  );
  const blank = await page.locator(".konvajs-content").first().boundingBox();
  await page.keyboard.press("g");
  await page.mouse.click(
    blank.x + blank.width * 0.4,
    blank.y + blank.height * 0.4
  );
  await saved(page, 1);
  await page
    .getByRole("tab", { name: "Open Practice Layout", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector(".konvajs-content canvas")
  );
  await page.waitForTimeout(200);
  const restoredViewport = await readViewport();
  await page.getByRole("button", { name: "Lock", exact: true }).waitFor();
  assert.ok(Math.abs(restoredViewport.scale - savedViewport.scale) < 0.001);
  assert.ok(Math.abs(restoredViewport.x - savedViewport.x) < 1);
  assert.ok(Math.abs(restoredViewport.y - savedViewport.y) < 1);
  await page.keyboard.press(`${modifier}+z`);
  await saved(page, 6);
  await page.keyboard.press(`${modifier}+Shift+z`);
  await saved(page, 7);
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await page.waitForTimeout(1000);
  const scene = page.locator("canvas:visible").last();
  const sceneBox = await scene.boundingBox();
  await page.mouse.move(
    sceneBox.x + sceneBox.width * 0.7,
    sceneBox.y + sceneBox.height * 0.25
  );
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(
    sceneBox.x + sceneBox.width * 0.6,
    sceneBox.y + sceneBox.height * 0.35,
    { steps: 15 }
  );
  await page.mouse.up({ button: "middle" });
  await page.waitForTimeout(1500);
  const cameraBefore = await scene.screenshot();
  await page.getByRole("tab", { name: "Untitled track", exact: true }).click();
  await page
    .getByRole("tab", { name: "Open Practice Layout", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "3D", exact: true })
      .getAttribute("aria-pressed"),
    "true"
  );
  await page.waitForTimeout(1500);
  const cameraAfter = await page.locator("canvas:visible").last().screenshot();
  const beforePixels = await sharp(cameraBefore).removeAlpha().raw().toBuffer();
  const afterPixels = await sharp(cameraAfter).removeAlpha().raw().toBuffer();
  assert.equal(beforePixels.length, afterPixels.length);
  let delta = 0;
  for (let index = 0; index < beforePixels.length; index++)
    delta += Math.abs(beforePixels[index] - afterPixels[index]);
  assert.ok(
    delta / beforePixels.length < 3,
    `3D camera changed across tabs: mean pixel difference ${delta / beforePixels.length}`
  );
  console.log(
    "PASS: 3D view mode, camera position and pan target survive a document switch"
  );
  await page.getByRole("tab", { name: "Untitled track", exact: true }).click();
  await page.keyboard.press(`${modifier}+z`);
  await saved(page, 0);
  await page.keyboard.press(`${modifier}+Shift+z`);
  await saved(page, 1);
  await page
    .getByRole("button", { name: "Close Untitled track", exact: true })
    .click();
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search projects", exact: true })
    .fill("Untitled track");
  await page
    .getByRole("button", { name: "Open Untitled track", exact: true })
    .click();
  await saved(page, 1);
  await page.getByRole("tab", { name: "Home", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search projects", exact: true })
    .fill("no-matching-track");
  await page.getByText("No projects found", { exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "Search projects", exact: true })
    .fill("");
  await page
    .getByRole("button", { name: "Actions for Untitled track", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rename project", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Rename project" })
    .getByLabel("Project name")
    .fill("Venue practice");
  await page
    .getByRole("dialog", { name: "Rename project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Venue practice", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Actions for Venue practice", exact: true })
    .click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await page
    .getByRole("button", { name: "Open Copy of Venue practice", exact: true })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Actions for Copy of Venue practice",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Delete project" })
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open Copy of Venue practice", exact: true })
    .waitFor({ state: "hidden" });
  await page.getByRole("dialog").waitFor({ state: "detached" });
  console.log("PASS: library rename, duplicate and confirmed deletion");
  await page
    .getByRole("heading", { name: "Your track library", exact: true })
    .waitFor();
  await page.waitForFunction(() => {
    const logo = document.querySelector(".library-brand img");
    return logo?.complete && logo.naturalWidth > 0;
  });
  await page.screenshot({
    path: path.join(here, "artifacts/library.png"),
    animations: "disabled",
  });
  const wasDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForFunction(
    () =>
      document
        .querySelector(".library-brand img")
        ?.src.endsWith("darkbg.svg") &&
      document.querySelector(".project-preview img")?.src.includes("%230b0f18")
  );
  await page.screenshot({
    path: path.join(here, "artifacts/library-dark.png"),
    animations: "disabled",
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(960, 640)
  );
  await page.waitForFunction(() => innerWidth === 960);
  assert.equal(
    await page.evaluate(() => {
      const content = document.querySelector(".library-content");
      return (
        content.scrollWidth <= content.clientWidth &&
        document.documentElement.scrollWidth <= innerWidth
      );
    }),
    true,
    "Library must fit the minimum desktop window width"
  );
  await page.screenshot({
    path: path.join(here, "artifacts/library-compact.png"),
    animations: "disabled",
  });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1440, 960)
  );
  await page.evaluate(
    (dark) => document.documentElement.classList.toggle("dark", dark),
    wasDark
  );
  await page.waitForFunction(() => innerWidth === 1440);
  console.log(
    "PASS: branded library assets, theme-aware previews and minimum desktop width"
  );
  await page
    .getByRole("tab", { name: "Desktop native roundtrip", exact: true })
    .click();
  await saved(page, 7);
  console.log(
    "PASS: independent document histories, selection/viewport stores, close/reopen and library search"
  );
  await page.screenshot({
    path: path.join(here, "artifacts/document-tabs.png"),
    animations: "disabled",
  });

  assert.deepEqual(errors, []);
  await page
    .locator('input[value="Desktop native roundtrip"]')
    .first()
    .fill("Desktop close flush");
  // Close immediately, before the 350 ms autosave debounce can complete.
  await app.close();
  page = await launch();
  await page
    .getByRole("tab", { name: "Desktop close flush", exact: true })
    .waitFor();
  await page
    .getByRole("tab", { name: "Venue practice", exact: true })
    .waitFor();
  await waitForDraft(page, (draft) => draft?.title === "Desktop close flush");
  assert.equal((await saved(page, 7)).title, "Desktop close flush");
  console.log(
    "PASS: close flushes pending edits before a full desktop restart"
  );
  // app.exit bypasses renderer beforeunload, modelling loss of the process after confirmed autosave.
  await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  page = await launch();
  assert.equal((await saved(page, 7)).title, "Desktop close flush");
  assert.deepEqual(errors, []);
  console.log("PASS: project survives abrupt exit after confirmed autosave");
  console.log("POC smoke checks passed");
} finally {
  const force = setTimeout(() => app?.process().kill("SIGKILL"), 5000);
  await app?.close().catch(() => {});
  clearTimeout(force);
}
