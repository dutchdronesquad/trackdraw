"""Extract embedded textures from GLB files.

Usage:
  python3 scripts/extract_glb_textures.py

By default this extracts:
  assets/multigp/multigp-obstacles.glb

to:
  public/assets/models/textures/multigp-obstacles/
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import struct
from pathlib import Path
from typing import Any


DEFAULT_GLB_PATH = Path("assets/multigp/multigp-obstacles.glb")
DEFAULT_OUT_DIR = Path("public/assets/models/textures/multigp-obstacles")
JSON_CHUNK_TYPE = 0x4E4F534A
BIN_CHUNK_TYPE = 0x004E4942
GLB_MAGIC = 0x46546C67

EXTENSIONS_BY_MIME = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
}


def slugify(value: str, fallback: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-._")
    return slug or fallback


def parse_glb(path: Path) -> tuple[dict[str, Any], bytes]:
    data = path.read_bytes()
    if len(data) < 12:
        raise ValueError(f"{path} is too small to be a GLB")

    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != GLB_MAGIC:
        raise ValueError(f"{path} is not a GLB file")
    if version != 2:
        raise ValueError(f"{path} uses GLB version {version}; only version 2 is supported")
    if length > len(data):
        raise ValueError(f"{path} declares length {length}, but file has {len(data)} bytes")

    gltf_json: dict[str, Any] | None = None
    bin_chunk = b""
    offset = 12
    while offset < length:
        if offset + 8 > length:
            raise ValueError(f"{path} has a truncated chunk header at byte {offset}")
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk_end = offset + chunk_length
        if chunk_end > length:
            raise ValueError(
                f"{path} chunk at byte {offset - 8} declares length "
                f"{chunk_length}, which exceeds GLB length {length}"
            )
        chunk = data[offset:chunk_end]
        offset = chunk_end

        if chunk_type == JSON_CHUNK_TYPE:
            gltf_json = json.loads(chunk.decode("utf-8").rstrip("\x00 "))
        elif chunk_type == BIN_CHUNK_TYPE:
            bin_chunk = chunk

    if gltf_json is None:
        raise ValueError(f"{path} has no JSON chunk")
    return gltf_json, bin_chunk


def buffer_view_bytes(
    gltf_json: dict[str, Any], bin_chunk: bytes, buffer_view_index: int
) -> bytes:
    buffer_views = gltf_json.get("bufferViews", [])
    if not isinstance(buffer_views, list) or buffer_view_index >= len(buffer_views):
        raise ValueError(f"Missing bufferView {buffer_view_index}")

    view = buffer_views[buffer_view_index]
    if not isinstance(view, dict):
        raise ValueError(f"Invalid bufferView {buffer_view_index}")
    if view.get("buffer", 0) != 0:
        raise ValueError("Only GLB binary chunk buffer 0 is supported")

    byte_offset = int(view.get("byteOffset", 0))
    byte_length = int(view["byteLength"])
    byte_end = byte_offset + byte_length
    if byte_offset < 0 or byte_length < 0 or byte_end > len(bin_chunk):
        raise ValueError(
            f"bufferView {buffer_view_index} range "
            f"{byte_offset}:{byte_end} exceeds BIN chunk length {len(bin_chunk)}"
        )
    return bin_chunk[byte_offset:byte_end]


def decode_data_uri(uri: str) -> tuple[bytes, str]:
    if not uri.startswith("data:"):
        raise ValueError("URI is not a data URI")
    header, payload = uri.split(",", 1)
    mime = header[5:].split(";", 1)[0]
    if ";base64" in header:
        return base64.b64decode(payload), mime
    return payload.encode("utf-8"), mime


def image_name(image: dict[str, Any], index: int, extension: str) -> str:
    raw_name = image.get("name") or image.get("uri") or f"image-{index}"
    return slugify(Path(str(raw_name)).stem, f"image-{index}") + extension


def extract_textures(path: Path, out_dir: Path) -> list[Path]:
    gltf_json, bin_chunk = parse_glb(path)
    images = gltf_json.get("images", [])
    if not isinstance(images, list):
        raise ValueError("GLB images field is not a list")

    out_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for index, image in enumerate(images):
        if not isinstance(image, dict):
            continue

        mime = str(image.get("mimeType") or "")
        content: bytes | None = None
        if "bufferView" in image:
            content = buffer_view_bytes(gltf_json, bin_chunk, int(image["bufferView"]))
        elif "uri" in image:
            uri = str(image["uri"])
            if uri.startswith("data:"):
                content, uri_mime = decode_data_uri(uri)
                mime = mime or uri_mime
            else:
                source = path.parent / uri
                content = source.read_bytes()
                mime = mime or {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".webp": "image/webp",
                }.get(source.suffix.lower(), "")

        if content is None:
            print(f"SKIP image {index}: no bufferView or supported URI")
            continue

        extension = EXTENSIONS_BY_MIME.get(mime, f".image-{index}.bin")
        output = out_dir / image_name(image, index, extension)
        output.write_bytes(content)
        written.append(output)

    return written


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("glb", nargs="?", type=Path, default=DEFAULT_GLB_PATH)
    parser.add_argument("--out-dir", type=Path)
    args = parser.parse_args()

    glb_path = args.glb.resolve()
    out_dir = args.out_dir or (
        DEFAULT_OUT_DIR if args.glb == DEFAULT_GLB_PATH else glb_path.with_suffix("")
    )
    written = extract_textures(glb_path, out_dir.resolve())

    print(f"Extracted {len(written)} texture(s) from {glb_path}")
    for path in written:
        print(path)


if __name__ == "__main__":
    main()
