import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TEXTURE_DIR = path.join(
  process.cwd(),
  "public/assets/models/textures/multigp-obstacles"
);

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

function formatBytes(bytes) {
  return `${Math.round(bytes / 1024)}KB`;
}

async function optimizeTexture(fileName, target) {
  const sourcePath = path.join(TEXTURE_DIR, fileName);
  const webpPath = path.join(TEXTURE_DIR, fileName.replace(/\.png$/, ".webp"));
  const tempPath = `${sourcePath}.tmp`;
  const before = await fs.stat(sourcePath);
  const beforeMeta = await sharp(sourcePath).metadata();

  const optimized = await sharp(sourcePath)
    .resize({
      width: target.width,
      withoutEnlargement: true,
      fit: "inside",
    })
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10,
      palette: true,
      quality: 95,
    })
    .toBuffer();

  await fs.writeFile(tempPath, optimized);
  await fs.rename(tempPath, sourcePath);
  await sharp(optimized).webp({ lossless: true, effort: 6 }).toFile(webpPath);

  const after = await fs.stat(sourcePath);
  const afterMeta = await sharp(sourcePath).metadata();
  const webp = await fs.stat(webpPath);
  console.log(
    `${fileName}: ${beforeMeta.width}x${beforeMeta.height} ${formatBytes(
      before.size
    )} -> ${afterMeta.width}x${afterMeta.height} ${formatBytes(
      after.size
    )}; webp ${formatBytes(webp.size)}`
  );
}

for (const [fileName, target] of Object.entries(textureTargets)) {
  await optimizeTexture(fileName, target);
}
