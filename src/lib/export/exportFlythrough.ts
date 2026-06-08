"use client";

import * as THREE from "three";
import {
  BufferTarget,
  CanvasSource,
  Output,
  WebMOutputFormat,
} from "mediabunny";
import { addFlythroughShapes } from "@/lib/export/flythroughSceneShapes";
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

const THEME = {
  dark: {
    bg: "#0b1018",
    fog: "#0b1018",
    ambientIntensity: 0.7,
    dirIntensity: 1.4,
    groundColor: "#0f1824",
    gridCell: 0x1e293b,
    gridSection: 0x3d5068,
  },
  light: {
    bg: "#e8edf3",
    fog: "#e8edf3",
    ambientIntensity: 1.2,
    dirIntensity: 1.8,
    groundColor: "#d0d8e4",
    gridCell: 0xb0bcc8,
    gridSection: 0x7a96b0,
  },
} as const;

function getOrderedShapes(design: TrackDesign): Shape[] {
  return design.shapeOrder
    .map((id) => design.shapeById[id])
    .filter((shape): shape is Shape => Boolean(shape));
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
      ctx.globalAlpha = 0.05;
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
    scene.fog = new THREE.Fog(t.fog, 80, 260);

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

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(fw * 3, fh * 3),
      new THREE.MeshStandardMaterial({
        color: t.groundColor,
        roughness: 0.98,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, -0.01, cz);
    scene.add(ground);

    const tubeSegments = Math.min(curveResult.segmentCount * 3, 800);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubeSegments, 0.06, 6, closed),
      new THREE.MeshStandardMaterial({
        color: "#93c5fd",
        emissive: "#3b82f6",
        emissiveIntensity: 0.5,
      })
    );
    scene.add(tube);

    const gridStep = design.field.gridStep;
    const gridSize = Math.max(fw, fh) * 1.5;
    const gridDivisions = Math.round(gridSize / gridStep);
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      t.gridSection,
      t.gridCell
    );
    gridHelper.position.set(cx, 0.001, cz);
    scene.add(gridHelper);

    const cleanup = () => {
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
