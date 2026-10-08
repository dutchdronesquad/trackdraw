const { chromium } = require("playwright");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const repo = path.resolve(__dirname, "../..");
const artifacts = fs.mkdtempSync(
  path.join(os.tmpdir(), "trackdraw-presentation-")
);
const bundle = path.join(artifacts, "render.js");
esbuild.buildSync({
  stdin: {
    contents: `import {renderTrack3dPng} from './src/lib/export/export3dPng';
import {normalizeDesign,createDefaultDesign} from './src/lib/track/design';
import * as THREE from 'three';
import {createCatalogShapeDraft,MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID} from './src/lib/track/elements/catalog';
Object.assign(window,{renderTrack3dPng,normalizeDesign,createDefaultDesign,THREE,createCatalogShapeDraft,MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID});`,
    resolveDir: repo,
    loader: "ts",
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: bundle,
  tsconfig: path.join(repo, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
});
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-webgl",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  const texture = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(0, 0, 8, 8);
    return canvas.toDataURL("image/webp").split(",")[1];
  });
  await page.route("https://assets.trackdraw.app/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (new URL(route.request().url()).pathname.endsWith("/manifest.json")) {
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          schemaVersion: 1,
          id: "multigp",
          name: "Fixture collection",
          status: "published",
          author: "Test fixture",
          attribution: "Test fixture",
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
        }),
      });
    } else
      await route.fulfill({
        contentType: "image/webp",
        headers: { "access-control-allow-origin": "*" },
        body: Buffer.from(texture, "base64"),
      });
  });
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ path: bundle });
  for (const [name, width, height] of [
    ["small", 8, 6],
    ["large", 500, 350],
    ["long", 250, 8],
    ["rotated", 30, 20],
  ]) {
    for (const theme of ["light", "dark"]) {
      const result = await page.evaluate(
        async ({ width, height, name, theme }) => {
          const base = createDefaultDesign();
          const shapes = [
            {
              id: "gate",
              kind: "gate",
              x: width / 2,
              y: height / 2,
              rotation: name === "rotated" ? 45 : 0,
              width: 5,
              height: 4,
              color: "#ff0000",
            },
            {
              id: "path",
              kind: "polyline",
              x: 0,
              y: 0,
              rotation: 0,
              points: [
                { x: 2, y: 2, z: 0 },
                { x: width - 2, y: height - 2, z: 3 },
              ],
            },
          ];
          const design = normalizeDesign({
            ...base,
            field: { ...base.field, width, height },
            shapeOrder: shapes.map((s) => s.id),
            shapeById: Object.fromEntries(shapes.map((s) => [s.id, s])),
          });
          if (name === "small") {
            const gate = {
              ...createCatalogShapeDraft(MULTIGP_STANDARD_GATE_5X5_ELEMENT_ID, {
                x: 2,
                y: 2,
                includeCatalogMetadata: true,
              }),
              id: "textured",
            };
            design.shapeOrder.push(gate.id);
            design.shapeById[gate.id] = gate;
          }
          const before = JSON.stringify(design);
          const url = await renderTrack3dPng(design, theme);
          if (name === "rotated" && theme === "light") {
            const repeat = await renderTrack3dPng(design, theme);
            if (repeat !== url) throw new Error("Default render changed");
          }
          const img = new Image();
          img.src = url;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let clear = 0,
            opaque = 0,
            edge = 0,
            red = 0,
            green = 0,
            minX = c.width,
            maxX = 0,
            minY = c.height,
            maxY = 0,
            partial = -1;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (
              a > 0 &&
              data[i + 1] > data[i] * 1.5 &&
              data[i + 1] > data[i + 2] * 1.5
            )
              green++;
            if (
              a > 0 &&
              data[i] > data[i + 1] * 1.5 &&
              data[i] > data[i + 2] * 1.5
            )
              red++;
            if (a === 0) clear++;
            else {
              const pixel = i / 4;
              minX = Math.min(minX, pixel % c.width);
              maxX = Math.max(maxX, pixel % c.width);
              minY = Math.min(minY, Math.floor(pixel / c.width));
              maxY = Math.max(maxY, Math.floor(pixel / c.width));
              if (a === 255) opaque++;
              else {
                edge++;
                if (partial < 0) partial = i;
              }
            }
          }
          // Source-over compositing must preserve the page outside the plate and
          // blend partially transparent boundary pixels on both host backgrounds.
          for (const background of [0, 255]) {
            ctx.fillStyle = background === 0 ? "#000" : "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(img, 0, 0);
            const composite = ctx.getImageData(0, 0, c.width, c.height).data;
            for (let channel = 0; channel < 3; channel++) {
              if (composite[channel] !== background)
                throw new Error("Opaque surrounding rectangle");
              const expected =
                (data[partial + channel] * data[partial + 3]) / 255 +
                background * (1 - data[partial + 3] / 255);
              if (Math.abs(composite[partial + channel] - expected) > 2)
                throw new Error("Incorrect alpha edge compositing");
            }
          }
          return {
            url,
            clear,
            opaque,
            edge,
            red,
            green,
            bounds: [minX, maxX, minY, maxY],
            width: c.width,
            height: c.height,
            unchanged: before === JSON.stringify(design),
            remaining: document.querySelectorAll("[aria-hidden=true]").length,
          };
        },
        { name, width, height, theme }
      );
      fs.writeFileSync(
        path.join(artifacts, `${name}-${theme}.png`),
        Buffer.from(result.url.split(",")[1], "base64")
      );
      delete result.url;
      if (
        result.width !== 3200 ||
        result.height !== 2400 ||
        !result.clear ||
        !result.opaque ||
        !result.edge ||
        !result.red ||
        (name === "small" && !result.green) ||
        !result.unchanged ||
        result.remaining ||
        result.bounds[0] === 0 ||
        result.bounds[1] >= result.width - 1 ||
        result.bounds[2] === 0 ||
        result.bounds[3] >= result.height - 1
      )
        throw new Error(JSON.stringify(result));
      console.log(name, theme, result);
    }
  }
  const custom = await page.evaluate(async () => {
    const design = createDefaultDesign();
    const camera = new THREE.PerspectiveCamera(46, 2, 0.1, 1000);
    camera.position.set(20, 60, 90);
    camera.lookAt(30, 0, 20);
    camera.updateMatrixWorld();
    const before = JSON.stringify(camera.toJSON());
    const a = await renderTrack3dPng(design, "light", camera);
    const b = await renderTrack3dPng(design, "light");
    const image = new Image();
    image.src = a;
    await image.decode();
    return {
      unchanged: before === JSON.stringify(camera.toJSON()),
      different: a !== b,
      width: image.width,
      height: image.height,
    };
  });
  assert.equal(custom.unchanged, true);
  assert.equal(custom.different, true);
  assert.equal(custom.width, 3200);
  assert.equal(custom.height, 1600);
  assert.equal(custom.width / custom.height, 2);
  for (const theme of ["light", "dark"]) {
    const opaque = await page.evaluate(async (theme) => {
      const url = await renderTrack3dPng(
        createDefaultDesign(),
        theme,
        undefined,
        false
      );
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      let opaque = true;
      for (let i = 3; i < pixels.length; i += 4)
        if (pixels[i] !== 255) opaque = false;
      return { opaque, width: image.width, height: image.height };
    }, theme);
    assert.deepEqual(opaque, { opaque: true, width: 3200, height: 2400 });
  }
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "webgl2" || type === "webgl") return null;
      return original.call(this, type, ...args);
    };
  });
  const failed = await page.evaluate(async () => {
    try {
      await renderTrack3dPng(createDefaultDesign(), "light");
      return false;
    } catch {
      return document.querySelectorAll("[aria-hidden=true]").length === 0;
    }
  });
  assert.equal(failed, true, "WebGL failure must reject and clean up");
  console.log(
    "Current camera, compositing, deterministic output and WebGL failure passed. PNGs:",
    artifacts
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
