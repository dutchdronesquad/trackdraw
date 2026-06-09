"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Ref } from "react";

export function assignGroupRef(
  ref: Ref<THREE.Group> | undefined,
  node: THREE.Group | null
) {
  if (!ref) return;
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  ref.current = node;
}

export function cloneTextureForPanel(
  texture: THREE.Texture,
  {
    flipX = false,
    flipY = false,
    rotation = 0,
  }: { flipX?: boolean; flipY?: boolean; rotation?: number }
) {
  const clone = texture.clone();
  clone.center.set(0.5, 0.5);
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.rotation = rotation;
  clone.repeat.set(flipX ? -1 : 1, flipY ? -1 : 1);
  clone.offset.set(0, 0);
  clone.needsUpdate = true;
  return clone;
}

interface TextTextureOptions {
  fontFamily?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?: number;
  letterSpacing?: number;
}

interface TextTextureCacheEntry {
  refs: number;
  texture: THREE.CanvasTexture;
}

const textTextureCache = new Map<string, TextTextureCacheEntry>();

function getTextTextureCacheKey(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
) {
  return [
    text,
    color,
    fontSize,
    options.fontFamily,
    options.fontStyle,
    options.fontWeight,
    options.letterSpacing,
  ].join("");
}

function createTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
): THREE.CanvasTexture {
  const scale = 4;
  const measW = Math.max(256, text.length * fontSize * scale * 0.62 + 40);
  const measH = fontSize * scale * 2;
  const canvas = document.createElement("canvas");
  canvas.width = measW;
  canvas.height = measH;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, measW, measH);
  ctx.fillStyle = color;
  ctx.font = `${options.fontStyle} ${options.fontWeight} ${
    fontSize * scale
  }px ${options.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (options.letterSpacing) {
    const spacing = options.letterSpacing * scale;
    const chars = [...text];
    const totalWidth =
      chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) +
      spacing * Math.max(chars.length - 1, 0);
    let x = measW / 2 - totalWidth / 2;
    for (const char of chars) {
      const charWidth = ctx.measureText(char).width;
      ctx.fillText(char, x + charWidth / 2, measH / 2);
      x += charWidth + spacing;
    }
  } else {
    ctx.fillText(text, measW / 2, measH / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function getSharedTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options: Required<TextTextureOptions>
) {
  const key = getTextTextureCacheKey(text, color, fontSize, options);
  const existing = textTextureCache.get(key);
  if (existing) {
    existing.refs += 1;
    return { key, texture: existing.texture };
  }

  const texture = createTextTexture(text, color, fontSize, options);
  textTextureCache.set(key, { refs: 1, texture });
  return { key, texture };
}

function releaseSharedTextTexture(
  key: string,
  fallbackTexture: THREE.CanvasTexture
) {
  const entry = textTextureCache.get(key);
  if (!entry) {
    // Cache was cleared (e.g. HMR module replacement) — dispose directly.
    fallbackTexture.dispose();
    return;
  }

  entry.refs -= 1;
  if (entry.refs > 0) return;

  textTextureCache.delete(key);
  entry.texture.dispose();
}

export function useTextTexture(
  text: string,
  color: string,
  fontSize: number,
  options?: TextTextureOptions
): THREE.CanvasTexture {
  const fontFamily = options?.fontFamily ?? "ui-monospace,monospace,Arial";
  const fontStyle = options?.fontStyle ?? "normal";
  const fontWeight = options?.fontWeight ?? 600;
  const letterSpacing = options?.letterSpacing ?? 0;
  const shared = useMemo(
    () =>
      getSharedTextTexture(text, color, fontSize, {
        fontFamily,
        fontStyle,
        fontWeight,
        letterSpacing,
      }),
    [color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, text]
  );

  useEffect(() => {
    const { key, texture } = shared;
    return () => releaseSharedTextTexture(key, texture);
  }, [shared]);

  return shared.texture;
}
