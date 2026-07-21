"use client";

import * as THREE from "three";
import {
  BufferTarget,
  CanvasSource,
  Output,
  WebMOutputFormat,
} from "mediabunny";
import { addFlythroughShapes } from "@/lib/export/flythroughSceneShapes";
import { isSharedFlythroughTexture } from "@/lib/export/flythrough/shared";
import type { FlythroughProgress, FlythroughTheme } from "@/lib/export/shared";
import {
  createCurveSampler,
  FPV_CAMERA_FOV,
  getFpvCameraPose,
  getInitialFpvCameraPose,
} from "@/lib/track/fpvCamera";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import type { PolylineShape, Shape, TrackDesign } from "@/lib/types";

const FPS = 60;
const BITRATE = 8_000_000;
const WIDTH = 1280;
const HEIGHT = 720;
// Target drone speed in m/s: determines video duration from track length.
const TARGET_SPEED_MS = 7;
const MAX_GRID_CELLS_PER_AXIS = 4096;
const TRACK_BORDER_WIDTH = 0.45;
const TRACK_BORDER_HEIGHT = 0.08;

const THEME = {
  dark: {
    bg: "#0b1018",
    skyTop: "#182848",
    skyHorizon: "#2e4870",
    ambientIntensity: 0.7,
    dirIntensity: 1.4,
    terrainColor: "#080e15",
    groundColor: "#142234",
    groundChecker: "#192b40",
    groundBorder: "#2b435a",
    gridCell: 0x425a70,
    gridSection: 0x6f8498,
    gridCellThickness: 0.45,
    gridSectionThickness: 0.9,
    routeColor: "#93c5fd",
    routeEmissive: "#60a5fa",
    routeEmissiveIntensity: 0.8,
  },
  light: {
    bg: "#e4f0fa",
    skyTop: "#68a8de",
    skyHorizon: "#e4f0fa",
    ambientIntensity: 1.2,
    dirIntensity: 1.8,
    terrainColor: "#b7c4cf",
    groundColor: "#d0d8e4",
    groundChecker: "#c2ccd7",
    groundBorder: "#8da3b8",
    gridCell: 0x7890a6,
    gridSection: 0x526f8b,
    gridCellThickness: 0.75,
    gridSectionThickness: 1.15,
    routeColor: "#1d4ed8",
    routeEmissive: "#1e40af",
    routeEmissiveIntensity: 0.15,
  },
} as const;

const GRID_VERT = `
  out vec2 vWorldXZ;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldXZ = worldPosition.xz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;
const GRID_FRAG = `
  uniform vec3 cellColor;
  uniform vec3 sectionColor;
  uniform float cellSize;
  uniform float sectionSize;
  uniform float cellThickness;
  uniform float sectionThickness;
  in vec2 vWorldXZ;
  out vec4 gridColor;

  float gridLine(vec2 position, float size, float thickness) {
    vec2 coordinate = position / size;
    vec2 derivative = max(fwidth(coordinate), vec2(0.000001));
    vec2 distanceToLine = abs(fract(coordinate - 0.5) - 0.5);
    vec2 line = 1.0 - smoothstep(
      derivative * thickness * 0.35,
      derivative * thickness * 0.85,
      distanceToLine
    );
    return max(line.x, line.y);
  }

  void main() {
    float minor = gridLine(vWorldXZ, cellSize, cellThickness);
    float major = gridLine(vWorldXZ, sectionSize, sectionThickness);
    float alpha = max(minor * 0.72, major * 0.96);
    if (alpha < 0.01) discard;
    gridColor = vec4(mix(cellColor, sectionColor, major), alpha);
  }
`;

const SKY_VERT = `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = `
  uniform vec3 topColor;
  uniform vec3 horizonColor;
  varying vec3 vWorldPos;
  void main() {
    float h = normalize(vWorldPos).y;
    float t = pow(max(0.0, h), 0.6);
    gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
  }
`;

function getOrderedShapes(design: TrackDesign): Shape[] {
  return design.shapeOrder
    .map((id) => design.shapeById[id])
    .filter((shape): shape is Shape => Boolean(shape));
}

type FlythroughSurfaceField = Pick<
  TrackDesign["field"],
  "width" | "height" | "gridStep"
>;

export function resolveFlythroughGridStep({
  width,
  height,
  gridStep,
}: FlythroughSurfaceField) {
  const longest = Math.max(width, height);
  const safeGridStep = Number.isFinite(gridStep) && gridStep > 0 ? gridStep : 1;
  return Math.max(safeGridStep, longest / MAX_GRID_CELLS_PER_AXIS);
}

function hexToRgba(hex: string): [number, number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255];
}

function createFlythroughCheckerTexture({
  baseColor,
  checkerColor,
  width,
  height,
  gridStep,
}: {
  baseColor: string;
  checkerColor: string;
  width: number;
  height: number;
  gridStep: number;
}) {
  const base = hexToRgba(baseColor);
  const checker = hexToRgba(checkerColor);
  const size = 64;
  const checkerPixelSize = size / 2;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color =
        x < checkerPixelSize === y < checkerPixelSize ? base : checker;
      data.set(color, (y * size + x) * 4);
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  const textureSizeMeters = gridStep * 10;
  texture.repeat.set(width / textureSizeMeters, height / textureSizeMeters);
  texture.needsUpdate = true;
  return texture;
}

function createRectangularRingShape({
  innerHeight,
  innerWidth,
  outerHeight,
  outerWidth,
}: {
  innerHeight: number;
  innerWidth: number;
  outerHeight: number;
  outerWidth: number;
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-outerWidth / 2, -outerHeight / 2);
  shape.lineTo(outerWidth / 2, -outerHeight / 2);
  shape.lineTo(outerWidth / 2, outerHeight / 2);
  shape.lineTo(-outerWidth / 2, outerHeight / 2);
  shape.closePath();

  const hole = new THREE.Path();
  hole.moveTo(-innerWidth / 2, -innerHeight / 2);
  hole.lineTo(-innerWidth / 2, innerHeight / 2);
  hole.lineTo(innerWidth / 2, innerHeight / 2);
  hole.lineTo(innerWidth / 2, -innerHeight / 2);
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

export function createFlythroughSurface(
  field: FlythroughSurfaceField,
  themeName: FlythroughTheme
) {
  const { width, height } = field;
  const cx = width / 2;
  const cz = height / 2;
  const longest = Math.max(width, height);
  const terrainSize = Math.max(longest * 3, longest + 80);
  const gridStep = resolveFlythroughGridStep(field);
  const sectionSize = gridStep * 5;
  const theme = THEME[themeName];
  const group = new THREE.Group();
  group.name = "flythrough-track-surface";
  const borderOuterWidth = width + TRACK_BORDER_WIDTH * 2;
  const borderOuterHeight = height + TRACK_BORDER_WIDTH * 2;

  const terrain = new THREE.Mesh(
    new THREE.ShapeGeometry(
      createRectangularRingShape({
        innerHeight: borderOuterHeight,
        innerWidth: borderOuterWidth,
        outerHeight: terrainSize,
        outerWidth: terrainSize,
      })
    ),
    new THREE.MeshBasicMaterial({ color: theme.terrainColor })
  );
  terrain.name = "flythrough-terrain";
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(cx, -0.075, cz);
  group.add(terrain);

  const border = new THREE.Mesh(
    new THREE.ExtrudeGeometry(
      createRectangularRingShape({
        innerHeight: height,
        innerWidth: width,
        outerHeight: borderOuterHeight,
        outerWidth: borderOuterWidth,
      }),
      { bevelEnabled: false, depth: TRACK_BORDER_HEIGHT, steps: 1 }
    ),
    new THREE.MeshStandardMaterial({
      color: theme.groundBorder,
      roughness: 0.98,
      metalness: 0,
    })
  );
  border.name = "flythrough-track-border";
  border.position.set(cx, -TRACK_BORDER_HEIGHT - 0.01, cz);
  border.rotation.x = -Math.PI / 2;
  group.add(border);

  const checkerTexture = createFlythroughCheckerTexture({
    baseColor: theme.groundColor,
    checkerColor: theme.groundChecker,
    width,
    height,
    gridStep,
  });
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      map: checkerTexture,
      roughness: 0.98,
      metalness: 0,
    })
  );
  mat.name = "flythrough-track-mat";
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(cx, -0.009, cz);
  group.add(mat);

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.ShaderMaterial({
      uniforms: {
        cellColor: { value: new THREE.Color(theme.gridCell) },
        sectionColor: { value: new THREE.Color(theme.gridSection) },
        cellSize: { value: gridStep },
        sectionSize: { value: sectionSize },
        cellThickness: { value: theme.gridCellThickness },
        sectionThickness: { value: theme.gridSectionThickness },
      },
      vertexShader: GRID_VERT,
      fragmentShader: GRID_FRAG,
      glslVersion: THREE.GLSL3,
      transparent: true,
      depthWrite: false,
    })
  );
  grid.name = "flythrough-track-grid";
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(cx, 0.006, cz);
  grid.renderOrder = 1;
  group.add(grid);

  return {
    group,
    ownedTextures: [checkerTexture] as THREE.Texture[],
    gridStep,
    sectionSize,
    terrainSize,
  };
}

export function disposeFlythroughSceneResources(
  root: THREE.Object3D,
  ownedTextures: Iterable<THREE.Texture>
) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set(ownedTextures);

  root.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.LineSegments
    ) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of objectMaterials) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (
            value instanceof THREE.Texture &&
            !isSharedFlythroughTexture(value)
          ) {
            textures.add(value);
          }
        }
      }
    }
  });

  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

function loadWatermarkTexture(
  isDark: boolean
): Promise<THREE.CanvasTexture | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = 3;
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = isDark ? 0.12 : 0.06;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(new THREE.CanvasTexture(c));
    };
    img.onerror = () => resolve(null);
    img.src = `/assets/brand/trackdraw-logo-mono-${
      isDark ? "darkbg" : "lightbg"
    }.svg`;
  });
}

export function exportFlythrough(
  design: TrackDesign,
  filename: string,
  themeName: FlythroughTheme,
  onProgress?: (progress: FlythroughProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const shapes = getOrderedShapes(design);
    const polyline = shapes.find(
      (shape): shape is PolylineShape =>
        shape.kind === "polyline" && shape.points.length >= 2
    );
    if (!polyline) {
      return reject(new Error("No track path to fly through"));
    }

    const curveResult = getPolylineCurve3Derived(polyline, {
      heightOffset: 0.6,
      samplesPerSegment: 18,
      density: 12,
    });
    if (!curveResult) {
      return reject(new Error("Could not compute flight path"));
    }

    const { curve } = curveResult;
    const closed = Boolean(polyline.closed);
    const { width: fw, height: fh } = design.field;
    const cx = fw / 2;
    const cz = fh / 2;

    const t = THEME[themeName];
    const isDark = themeName === "dark";

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;pointer-events:none;opacity:0;";
    document.body.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setSize(WIDTH, HEIGHT, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(t.bg);
    scene.fog = new THREE.Fog(t.skyHorizon, 80, 260);

    const skySphere = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: {
          topColor: { value: new THREE.Color(t.skyTop) },
          horizonColor: { value: new THREE.Color(t.skyHorizon) },
        },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      })
    );
    skySphere.renderOrder = -1;
    scene.add(skySphere);

    const camera = new THREE.PerspectiveCamera(46, WIDTH / HEIGHT, 0.1, 500);
    camera.fov = FPV_CAMERA_FOV;
    camera.updateProjectionMatrix();

    scene.add(new THREE.AmbientLight(0xffffff, t.ambientIntensity));
    const dirLight = new THREE.DirectionalLight(0xffffff, t.dirIntensity);
    dirLight.position.set(cx + 12, 28, cz + 8);
    scene.add(dirLight);
    if (isDark) {
      const tealLight = new THREE.PointLight(0x2dd4bf, 0.3);
      tealLight.position.set(cx - 10, 8, cz - 5);
      scene.add(tealLight);
      const blueLight = new THREE.PointLight(0x60a5fa, 0.25);
      blueLight.position.set(cx + 15, 6, cz + 12);
      scene.add(blueLight);
    }

    const surface = createFlythroughSurface(design.field, themeName);
    scene.add(surface.group);
    const ownedTextures = new Set<THREE.Texture>(surface.ownedTextures);

    const tubeSegments = Math.min(curveResult.segmentCount * 3, 800);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubeSegments, 0.06, 6, closed),
      new THREE.MeshStandardMaterial({
        color: t.routeColor,
        emissive: t.routeEmissive,
        emissiveIntensity: t.routeEmissiveIntensity,
      })
    );
    scene.add(tube);

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      disposeFlythroughSceneResources(scene, ownedTextures);
      renderer.dispose();
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
    };

    const trackLengthM = curve.getLength();
    const loopDurationS = trackLengthM / TARGET_SPEED_MS;
    const totalFrames = Math.max(1, Math.round(loopDurationS * FPS));
    const tPerFrame = 1 / totalFrames;
    const reportProgress = (encodedFrames: number) => {
      onProgress?.({
        progress: encodedFrames / totalFrames,
        encodedFrames,
        totalFrames,
        videoDurationSeconds: loopDurationS,
      });
    };

    let bankAngle = 0;
    const samplePoint = createCurveSampler(curve, closed, "pointAt");
    const tickCamera = (frame: number) => {
      const pose = getFpvCameraPose(samplePoint, frame * tPerFrame, bankAngle);
      bankAngle = pose.bankAngle;
      camera.position.copy(pose.position);
      skySphere.position.copy(pose.position);
      camera.up.set(0, 1, 0);
      camera.lookAt(pose.lookTarget);
      camera.rotateZ(bankAngle);
    };

    const downloadBlob = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    void (async () => {
      try {
        await addFlythroughShapes(scene, shapes);

        const wmTex = await loadWatermarkTexture(isDark);
        if (wmTex) {
          ownedTextures.add(wmTex);
          const aspect = wmTex.image.width / wmTex.image.height;
          const planeW = Math.min(fw * 0.55, fh * 0.55 * aspect);
          const planeH = planeW / aspect;
          const wm = new THREE.Mesh(
            new THREE.PlaneGeometry(planeW, planeH),
            new THREE.MeshBasicMaterial({
              map: wmTex,
              transparent: true,
              depthWrite: false,
            })
          );
          wm.rotation.x = -Math.PI / 2;
          wm.position.set(cx, 0.015, cz);
          scene.add(wm);
        }

        const initialPose = getInitialFpvCameraPose(samplePoint);
        camera.position.copy(initialPose.position);
        skySphere.position.copy(initialPose.position);
        camera.lookAt(initialPose.lookTarget);
        renderer.render(scene, camera);

        const target = new BufferTarget();
        const output = new Output({
          format: new WebMOutputFormat(),
          target,
        });

        const videoSource = new CanvasSource(canvas, {
          codec: "vp9",
          bitrate: BITRATE,
          keyFrameInterval: 1,
        });
        output.addVideoTrack(videoSource);

        await output.start();
        reportProgress(0);

        const frameDuration = 1 / FPS;
        for (let i = 1; i <= totalFrames; i++) {
          tickCamera(i);
          renderer.render(scene, camera);

          await videoSource.add((i - 1) * frameDuration, frameDuration);

          if (i % 10 === 0) {
            reportProgress(i);
            await new Promise<void>((r) => setTimeout(r, 0));
          }
        }

        await output.finalize();
        reportProgress(totalFrames);
        cleanup();
        downloadBlob(new Blob([target.buffer!], { type: "video/webm" }));
        resolve();
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}
