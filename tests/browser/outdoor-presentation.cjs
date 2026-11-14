const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium, devices } = require("playwright");
const esbuild = require("esbuild");
const sharp = require("sharp");

const repo = path.resolve(__dirname, "../..");
const artifacts =
  process.env.PRESENTATION_ARTIFACTS ||
  fs.mkdtempSync(path.join(os.tmpdir(), "trackdraw-outdoor-"));
fs.mkdirSync(artifacts, { recursive: true });

const {
  outputFiles: [bundle],
} = esbuild.buildSync({
  stdin: {
    contents: `
import {createRoot} from "react-dom/client";
import {NextIntlClientProvider} from "next-intl";
import {_roots, addEffect, addAfterEffect} from "@react-three/fiber";
import Editor from "./src/components/canvas/editor/TrackPreview3D";
import Viewer from "./src/components/canvas/viewer/TrackPreview3D";
import {toViewerDesignSnapshot} from "./src/lib/track/viewer-snapshot";
import {useEditor} from "./src/store/editor";
import {usePresentationStore} from "./src/store/presentation";
import {createPresentationCourse,presentationViews} from "./tests/fixtures/presentation-course";
import {renderTrack3dPng} from "./src/lib/export/export3dPng";
import {exportFlythrough} from "./src/lib/export/exportFlythrough";
import {createOutdoorPresentation} from "./src/lib/track/outdoor-presentation";
import * as messages from "./lang/en-US";

const host = document.getElementById("host");
const root = createRoot(host);
let camera, renderer, scene, lastFrame, frameStart;
const frames = [], renders = [];
let activeCamera;
const view = (name, large) => {
  const preset = presentationViews[name];
  return large ? {position:[5,258,408],target:[200,0,97]} : preset;
};
const update = () => {
  if (!camera || !activeCamera) return;
  camera.position.set(...activeCamera.position);
  camera.lookAt(...activeCamera.target);
  camera.updateMatrixWorld();
};

// Run before each real Fiber frame, independent of orbit-control damping.
addEffect(() => {
  frameStart = performance.now();
  if (lastFrame) frames.push(frameStart - lastFrame);
  lastFrame = frameStart;
});
addAfterEffect(() => {
  // Capture the real render, after Fiber has submitted the scene to WebGL.
  renders.push(performance.now() - frameStart);
  if (frames.length > 600) frames.shift();
  if (renders.length > 600) renders.shift();
});

// Attach a probe to the same Canvas used by Studio and Viewer without
// requiring a production debug hook.
const canvasNode = () => host.querySelector("canvas");
const fiber = () => _roots.get(canvasNode())?.store;

async function mount(surface, large) {
  renderer = scene = camera = null;
  const Preview = surface === "studio" ? Editor : Viewer;
  const design = createPresentationCourse(large);
  useEditor.getState().replaceDesign(design);
  useEditor.getState().setSelection(large ? [] : ["entry"]);
  activeCamera = view("overview", large);
  root.render(<NextIntlClientProvider locale="en" messages={messages}>
    <Preview key={surface + large} showGizmo={false} />
  </NextIntlClientProvider>);
}

function setCamera(name, large) {
  activeCamera = view(name, large);
  update();
}
function ready() {
  const state = fiber()?.getState();
  if (!state?.gl || !state.controls) return false;
  renderer = state.gl;
  scene = state.scene;
  camera = state.camera;
  state.controls.target.set(...activeCamera.target);
  update();
  return true;
}
const waitFrames = async (count) => {
  for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame);
};
const median = (xs) => [...xs].sort((a,b)=>a-b)[Math.floor(xs.length / 2)];
async function sample() {
  await waitFrames(5);
  frames.length = renders.length = 0;
  await waitFrames(40);
  const {calls,triangles} = renderer.info.render;
  const {textures,geometries} = renderer.info.memory;
  return {ms:median(frames), renderMs:median(renders), calls,triangles,textures,geometries,
    fog:scene.fog?.color.getHexString(), pixelRatio:renderer.getPixelRatio()};
}
const screenshot = () => canvasNode().toDataURL("image/png");
async function png(quality) {
  const design = createPresentationCourse();
  return renderTrack3dPng(design, "dark", camera, false, quality);
}
function movie(quality) {
  const design = createPresentationCourse();
  // Shorten playback for the encoder check without changing the fixed scene.
  design.shapeById["race-line"].closed = false;
  design.shapeById["race-line"].points = [
    {x:23,y:44,z:0.65},{x:23,y:33,z:0.65},{x:26,y:26,z:1.25},
  ];
  return exportFlythrough(design, "outdoor-preview.webm", "dark", undefined, quality);
}
function snapshotId() {
  return toViewerDesignSnapshot(useEditor.getState().track.design).snapshotId;
}
function setupCosts() {
  return Object.fromEntries(["full","low"].map(quality => [
    quality, Array.from({length: 20}, () => {
      const start = performance.now();
      const outdoor = createOutdoorPresentation({width:80,height:65}, quality);
      const ms = performance.now() - start;
      outdoor.dispose();
      return ms;
    })
  ]).map(([quality, samples]) => [quality, median(samples)]));
}
Object.assign(window,{mount, ready, sample, setCamera, screenshot, png, movie, setupCosts, waitFrames,
  snapshotId,
  cameraPose:()=>[...camera.position.toArray(),...camera.quaternion.toArray()],
  mode:()=>usePresentationStore.getState().mode});
`,
    resolveDir: repo,
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  tsconfig: path.join(repo, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
});

async function savePng(page, name, method = "screenshot", quality) {
  const data = await page.evaluate(
    ([method, quality]) => window[method](quality),
    [method, quality]
  );
  fs.writeFileSync(
    path.join(artifacts, name + ".png"),
    Buffer.from(data.split(",")[1], "base64")
  );
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    args: [
      "--enable-webgl",
      ...(process.env.SOFTWARE_GL
        ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
        : []),
    ],
  });
  try {
    const results = {};
    // Synthetic panel artwork keeps the comparison independent of live catalog assets.
    const panelArtwork = await sharp(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><path fill="#fbf4dc" d="M0 0h96v96H0z"/><path fill="#f13938" d="M0 36h96v24H0z"/><path fill="#28384a" d="M0 12h96v8H0zm0 64h96v8H0z"/></svg>'
      )
    )
      .webp()
      .toBuffer();
    for (const device of ["desktop", "mobile-emulated"]) {
      const page = await browser.newPage(
        device === "desktop"
          ? { viewport: { width: 1100, height: 700 } }
          : devices["Pixel 7"]
      );
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (
          message.type() === "error" &&
          /THREE\.WebGL|Shader Error/.test(message.text())
        )
          errors.push(message.text());
      });
      await page.route("https://presentation.test/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === "/")
          return route.fulfill({
            contentType: "text/html",
            body: '<meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0}#host{width:100vw;height:100vh;position:relative}#host > div{width:100%;height:100%;position:relative}select{position:absolute;top:12px;left:12px}</style><div id="host"></div><script src="/preview.js"></script>',
          });
        if (url.pathname === "/preview.js")
          return route.fulfill({
            contentType: "application/javascript",
            body: bundle.text,
          });
        const asset = path.join(repo, "public", url.pathname);
        if (fs.existsSync(asset)) return route.fulfill({ path: asset });
        return route.abort();
      });
      await page.route("https://assets.trackdraw.app/**", (route) => {
        const { pathname } = new URL(route.request().url());
        const headers = { "access-control-allow-origin": "*" };
        if (pathname === "/multigp/manifest.json") {
          return route.fulfill({
            contentType: "application/json",
            headers,
            json: {
              schemaVersion: 1,
              id: "multigp",
              name: "Fixture collection",
              status: "published",
              author: "TrackDraw fixture",
              attribution: "TrackDraw fixture",
              usage: { terms: "Fixture use", portable: "allowed" },
              textures: [
                {
                  id: "standard-gate",
                  name: "Fixture gate",
                  template: "gate-standard-v1",
                  panels: {
                    left: "/multigp/fixture.webp",
                    right: "/multigp/fixture.webp",
                    top: "/multigp/fixture.webp",
                  },
                },
              ],
            },
          });
        }
        return pathname === "/multigp/fixture.webp" ||
          /MultiGP-2017-Airgate-.*-regular-50-percent\.webp$/.test(pathname)
          ? route.fulfill({
              contentType: "image/webp",
              headers,
              body: panelArtwork,
            })
          : route.abort();
      });
      await page.goto("https://presentation.test/");
      const selector = page.getByRole("combobox", { name: "3D environment" });
      for (const [surface, large] of [
        ["studio", false],
        ["viewer", false],
        ["viewer", true],
      ]) {
        await page.evaluate(
          ([surface, large]) => {
            void window.mount(surface, large);
          },
          [surface, large]
        );
        await page.waitForFunction(() => window.ready(), undefined, {
          timeout: 10000,
        });
        const prefix = [device, surface, large ? "large" : "standard"].join(
          "-"
        );
        const expected = await page.evaluate(() => window.cameraPose());
        const snapshotId = await page.evaluate(() => window.snapshotId());
        results[prefix] = {};
        for (const mode of ["design", "outdoor", "outdoor-low"]) {
          await selector.selectOption(mode);
          const metrics = await page.evaluate(() => window.sample());
          results[prefix][mode] = metrics;
          if (mode !== "design") assert.equal(metrics.fog, "c2d7e0");
          if (
            mode === "outdoor-low" ||
            (mode === "outdoor" && (large || device !== "desktop"))
          ) {
            assert.equal(metrics.pixelRatio, 1);
            assert.ok(metrics.textures < results[prefix].design.textures);
          }
          const pose = await page.evaluate(() => window.cameraPose());
          assert.ok(
            pose.every(
              (value, index) => Math.abs(value - expected[index]) < 1e-8
            )
          );
          await savePng(page, prefix + "-" + mode);
        }
        if (!large && device === "desktop") {
          await page.evaluate(() => window.setCamera("low", false));
          // Set the fixed camera and the orbit target together before each comparison.
          await page.waitForFunction(() => window.ready(), undefined, {
            timeout: 10000,
          });
          await selector.selectOption("design");
          await page.evaluate(() => window.waitFrames(3));
          await savePng(page, prefix + "-design-low-angle");
          await selector.selectOption("outdoor");
          await page.evaluate(() => window.waitFrames(3));
          await savePng(page, prefix + "-outdoor-low-angle");
          if (surface === "viewer") {
            await savePng(page, "outdoor-export", "png", "full");
            if (process.env.RECORD_FLYTHROUGH) {
              const download = page.waitForEvent("download");
              await page.evaluate(() => window.movie("full"));
              await (
                await download
              ).saveAs(path.join(artifacts, "outdoor-preview.webm"));
            }
          }
        }
        // Repeated toggles must release the old environment instead of growing GPU allocations.
        for (let i = 0; i < 3; i++) {
          await selector.selectOption("outdoor");
          await page.evaluate(() => window.waitFrames(3));
          await selector.selectOption("design");
          await page.evaluate(() => window.waitFrames(3));
        }
        assert.equal(
          await page.evaluate(() => window.snapshotId()),
          snapshotId
        );
        const end = await page.evaluate(() => window.sample());
        assert.ok(
          end.textures <= results[prefix].design.textures + 1,
          JSON.stringify({ end, prefix })
        );
        assert.ok(
          end.geometries <= results[prefix].design.geometries + 1,
          JSON.stringify({ end, prefix })
        );
      }
      await selector.selectOption("outdoor-low");
      await page.reload();
      await page.evaluate(() => {
        void window.mount("viewer", false);
      });
      await page.waitForFunction(() => window.ready(), undefined, {
        timeout: 10000,
      });
      assert.equal(await selector.inputValue(), "outdoor-low");
      results[device + "-setup-ms"] = await page.evaluate(() =>
        window.setupCosts()
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(
      path.join(artifacts, "metrics.json"),
      JSON.stringify(results, null, 2)
    );
    console.log(artifacts);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
