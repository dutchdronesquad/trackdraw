import { describe, expect, it } from "vitest";
import {
  createAssetResolver,
  IDENTITY_ASSET_RESOLVER,
} from "@trackdraw/viewer/assets/asset-url";

describe("createAssetResolver", () => {
  it("returns the path unchanged with an empty base", () => {
    const resolve = createAssetResolver();
    expect(resolve("/assets/models/textures/gate.webp")).toBe(
      "/assets/models/textures/gate.webp"
    );
  });

  it("prefixes the path with the base URL", () => {
    const resolve = createAssetResolver("https://cdn.example.com/viewer");
    expect(resolve("/assets/models/textures/gate.webp")).toBe(
      "https://cdn.example.com/viewer/assets/models/textures/gate.webp"
    );
  });

  it("normalizes a trailing slash on the base URL without double-prefixing", () => {
    const resolve = createAssetResolver("https://cdn.example.com/viewer/");
    expect(resolve("/assets/models/textures/gate.webp")).toBe(
      "https://cdn.example.com/viewer/assets/models/textures/gate.webp"
    );
  });
});

describe("IDENTITY_ASSET_RESOLVER", () => {
  it("returns the path unchanged", () => {
    expect(IDENTITY_ASSET_RESOLVER("/assets/foo.webp")).toBe(
      "/assets/foo.webp"
    );
  });
});
