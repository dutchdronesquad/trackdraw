import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TEXTURE_DIR = path.join(
  process.cwd(),
  "public/assets/models/textures/multigp-obstacles"
);

const PNG_OPTIONS = {
  adaptiveFiltering: true,
  compressionLevel: 9,
  effort: 10,
  palette: true,
  quality: 95,
};

const textureTargets = {
  "5x10-hurdle-multigp.png": { width: 2048 },
  "MultiGP-2017-Airgate-left-panel-regular-50-percent.png": { width: 512 },
  "MultiGP-2017-Airgate-right-panel-regular-50-percent.png": { width: 512 },
  "MultiGP-2017-Airgate-top-regular-50-percent.png": { width: 2048 },
  "feather-banners-cobranded-multigp-back.png": { width: 512 },
  "feather-banners-cobranded-multigp.png": { width: 512 },
  "large-side-panel-multigp.png": { width: 512 },
  "large-top-multigp.png": { width: 2048 },
};

const redVariants = [
  {
    source: "MultiGP-2017-Airgate-top-regular-50-percent.png",
    output: "MultiGP-2017-Airgate-top-red-50-percent.png",
  },
  {
    source: "large-top-multigp.png",
    output: "large-top-red-multigp.png",
  },
];

const tex = (fileName) => path.join(TEXTURE_DIR, fileName);
const toWebpName = (fileName) => fileName.replace(/\.png$/, ".webp");
const formatBytes = (bytes) => `${Math.round(bytes / 1024)}KB`;

// PNG color type byte sits at offset 25. Type 3 = indexed/palette.
const isPalettized = (buffer) => buffer.length > 25 && buffer[25] === 3;

async function toPng(rawBuffer, info) {
  return sharp(rawBuffer, { raw: info }).png(PNG_OPTIONS).toBuffer();
}

async function toRaw(filePath) {
  const image = sharp(filePath);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

async function saveWithWebp(filePath, pngBuffer) {
  await fs.writeFile(filePath, pngBuffer);
  await sharp(pngBuffer)
    .webp({ lossless: true, effort: 6 })
    .toFile(tex(toWebpName(path.basename(filePath))));
}

// Replace blue background (~rgb(32,45,93)) with #8A181B
function applyBlueToRed(data, channels) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    if (b > r + 30 && b > g + 10 && r < 80 && g < 100) {
      const scale = (r + g + b) / 3 / 56.7;
      out[i] = Math.min(255, Math.round(0x8a * scale));
      out[i + 1] = Math.min(255, Math.round(0x18 * scale));
      out[i + 2] = Math.min(255, Math.round(0x1b * scale));
    } else {
      out[i] = r;
      out[i + 1] = g;
      out[i + 2] = b;
    }
    if (channels === 4) out[i + 3] = data[i + 3];
  }
  return out;
}

async function optimizeTexture(fileName, target) {
  const source = await fs.readFile(tex(fileName));
  const { width: srcWidth, height: srcHeight } = await sharp(source).metadata();

  // Already palettized means already optimized. Re-quantizing palettized images
  // produces slightly different bytes each run, so we stop after the first pass
  // only when the image already satisfies the target dimensions.
  if (isPalettized(source) && srcWidth != null && srcWidth <= target.width) {
    console.log(`${fileName}: up to date, skipping`);
    return;
  }

  const optimized = await sharp(source)
    .resize({ width: target.width, withoutEnlargement: true, fit: "inside" })
    .png(PNG_OPTIONS)
    .toBuffer();

  await saveWithWebp(tex(fileName), optimized);

  const { width, height } = await sharp(optimized).metadata();
  const webpSize = formatBytes((await fs.stat(tex(toWebpName(fileName)))).size);
  console.log(
    `${fileName}: ${srcWidth}x${srcHeight} -> ${width}x${height} ${formatBytes(optimized.length)}; webp ${webpSize}`
  );
}

async function generateRedVariant(sourceFileName, outputFileName) {
  const { data, info } = await toRaw(tex(sourceFileName));
  const redPixels = applyBlueToRed(data, info.channels);

  const png = await toPng(redPixels, info);

  const existing = await fs.readFile(tex(outputFileName)).catch(() => null);
  if (existing?.equals(png)) {
    console.log(`${outputFileName}: up to date, skipping`);
    return;
  }

  await saveWithWebp(tex(outputFileName), png);

  const webpSize = formatBytes(
    (await fs.stat(tex(toWebpName(outputFileName)))).size
  );
  console.log(
    `${outputFileName}: ${info.width}x${info.height} ${formatBytes(png.length)}; webp ${webpSize}`
  );
}

for (const [fileName, target] of Object.entries(textureTargets)) {
  await optimizeTexture(fileName, target);
}

for (const { source, output } of redVariants) {
  await generateRedVariant(source, output);
}
