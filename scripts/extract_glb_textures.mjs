import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_GLB_PATH = "assets/multigp/multigp-obstacles.glb";
const DEFAULT_OUT_DIR = "public/assets/models/textures/multigp-obstacles";
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;
const BIN_CHUNK_TYPE = 0x004e4942;

const EXTENSIONS_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
};

function parseArgs(argv) {
  const args = { glb: DEFAULT_GLB_PATH, outDir: null };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--out-dir") {
      args.outDir = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    args.glb = value;
  }

  const defaultOutDir =
    args.glb === DEFAULT_GLB_PATH
      ? DEFAULT_OUT_DIR
      : args.glb.replace(/\.[^.]+$/, "");

  return {
    glbPath: path.resolve(process.cwd(), args.glb),
    outDir: path.resolve(process.cwd(), args.outDir ?? defaultOutDir),
  };
}

function slugify(value, fallback) {
  return (
    value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-._]+|[-._]+$/g, "") ||
    fallback
  );
}

function parseGlb(buffer, filePath) {
  if (buffer.byteLength < 12) {
    throw new Error(`${filePath} is too small to be a GLB`);
  }

  const magic = buffer.readUInt32LE(0);
  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);

  if (magic !== GLB_MAGIC) {
    throw new Error(`${filePath} is not a GLB file`);
  }
  if (version !== 2) {
    throw new Error(
      `${filePath} uses GLB version ${version}; only version 2 is supported`
    );
  }
  if (declaredLength > buffer.byteLength) {
    throw new Error(
      `${filePath} declares length ${declaredLength}, but file has ${buffer.byteLength} bytes`
    );
  }

  let gltfJson = null;
  let binChunk = Buffer.alloc(0);
  let offset = 12;

  while (offset < declaredLength) {
    if (offset + 8 > declaredLength) {
      throw new Error(
        `${filePath} has a truncated chunk header at byte ${offset}`
      );
    }

    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    offset += 8;
    const chunkEnd = offset + chunkLength;

    if (chunkEnd > declaredLength) {
      throw new Error(
        `${filePath} chunk at byte ${offset - 8} exceeds GLB length ${declaredLength}`
      );
    }

    const chunk = buffer.subarray(offset, chunkEnd);
    offset = chunkEnd;

    if (chunkType === JSON_CHUNK_TYPE) {
      gltfJson = JSON.parse(
        chunk.toString("utf8").replaceAll("\u0000", "").trimEnd()
      );
    } else if (chunkType === BIN_CHUNK_TYPE) {
      binChunk = chunk;
    }
  }

  if (!gltfJson) {
    throw new Error(`${filePath} has no JSON chunk`);
  }

  return { gltfJson, binChunk };
}

function getBufferViewBytes(gltfJson, binChunk, bufferViewIndex) {
  const view = gltfJson.bufferViews?.[bufferViewIndex];
  if (!view) {
    throw new Error(`Missing bufferView ${bufferViewIndex}`);
  }
  if ((view.buffer ?? 0) !== 0) {
    throw new Error("Only GLB binary chunk buffer 0 is supported");
  }

  const byteOffset = view.byteOffset ?? 0;
  const byteLength = view.byteLength;
  const byteEnd = byteOffset + byteLength;
  if (byteOffset < 0 || byteLength < 0 || byteEnd > binChunk.byteLength) {
    throw new Error(
      `bufferView ${bufferViewIndex} range ${byteOffset}:${byteEnd} ` +
        `exceeds BIN chunk length ${binChunk.byteLength}`
    );
  }

  return binChunk.subarray(byteOffset, byteEnd);
}

function decodeDataUri(uri) {
  const [header, payload] = uri.split(",", 2);
  const mime = header.slice(5).split(";", 1)[0];
  const content = header.includes(";base64")
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { content, mime };
}

function getImageName(image, index, extension) {
  const rawName = image.name ?? image.uri ?? `image-${index}`;
  return `${slugify(path.parse(String(rawName)).name, `image-${index}`)}${extension}`;
}

async function extractTextures(glbPath, outDir) {
  const buffer = await fs.readFile(glbPath);
  const { gltfJson, binChunk } = parseGlb(buffer, glbPath);
  const images = Array.isArray(gltfJson.images) ? gltfJson.images : [];

  await fs.mkdir(outDir, { recursive: true });

  const written = [];
  for (const [index, image] of images.entries()) {
    if (!image || typeof image !== "object") continue;

    let mime = image.mimeType ?? "";
    let content = null;

    if ("bufferView" in image) {
      content = getBufferViewBytes(
        gltfJson,
        binChunk,
        Number(image.bufferView)
      );
    } else if (typeof image.uri === "string") {
      if (image.uri.startsWith("data:")) {
        const decoded = decodeDataUri(image.uri);
        content = decoded.content;
        mime ||= decoded.mime;
      } else {
        const sourcePath = path.resolve(path.dirname(glbPath), image.uri);
        content = await fs.readFile(sourcePath);
        mime ||= {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
        }[path.extname(sourcePath).toLowerCase()];
      }
    }

    if (!content) {
      console.warn(`SKIP image ${index}: no bufferView or supported URI`);
      continue;
    }

    const extension = EXTENSIONS_BY_MIME[mime] ?? `.image-${index}.bin`;
    const outputPath = path.join(outDir, getImageName(image, index, extension));
    await fs.writeFile(outputPath, content);
    written.push(outputPath);
  }

  return written;
}

const { glbPath, outDir } = parseArgs(process.argv.slice(2));
const written = await extractTextures(glbPath, outDir);

console.log(`Extracted ${written.length} texture(s) from ${glbPath}`);
for (const filePath of written) {
  console.log(filePath);
}
