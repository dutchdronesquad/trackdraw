"use client";

import * as THREE from "three";
import {
  Output,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
} from "mediabunny";
import {
  createCurveSampler,
  FPV_CAMERA_FOV,
  getFpvCameraPose,
  getInitialFpvCameraPose,
} from "@/lib/track/fpvCamera";
import { getPolylineCurve3Derived } from "@/lib/track/polyline-derived-3d";
import type { TrackDesign, Shape, PolylineShape } from "@/lib/types";

const FPS = 60;
const BITRATE = 8_000_000;
const WIDTH = 1280;
const HEIGHT = 720;
// Target drone speed in m/s — determines video duration from track length
const TARGET_SPEED_MS = 7;

export interface FlythroughProgress {
  progress: number;
  encodedFrames: number;
  totalFrames: number;
  videoDurationSeconds: number;
}

export type FlythroughTheme = "dark" | "light";

function getOrderedShapes(design: TrackDesign): Shape[] {
  return design.shapeOrder
    .map((id) => design.shapeById[id])
    .filter((s): s is Shape => Boolean(s));
}

function makeMat(color: string, emissiveIntensity = 0.08) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness: 0.4,
    metalness: 0.05,
  });
}

function addShapes(scene: THREE.Scene, shapes: Shape[]): void {
  for (const shape of shapes) {
    if (shape.kind === "gate") {
      const color = shape.color ?? "#3b82f6";
      const thick = shape.thick ?? 0.2;
      const h = shape.height ?? 2;
      const w = shape.width ?? 3;
      const yaw = (-shape.rotation * Math.PI) / 180;
      const mat = makeMat(color);

      const group = new THREE.Group();
      group.position.set(shape.x, 0, shape.y);
      group.rotation.y = yaw;

      const lp = new THREE.Mesh(new THREE.BoxGeometry(thick, h, thick), mat);
      lp.position.set(-(w / 2), h / 2, 0);
      group.add(lp);

      const rp = new THREE.Mesh(new THREE.BoxGeometry(thick, h, thick), mat);
      rp.position.set(w / 2, h / 2, 0);
      group.add(rp);

      const top = new THREE.Mesh(
        new THREE.BoxGeometry(w + thick, thick, thick),
        mat
      );
      top.position.set(0, h, 0);
      group.add(top);

      scene.add(group);
    } else if (shape.kind === "ladder") {
      const color = shape.color ?? "#3b82f6";
      const w = shape.width ?? 1.5;
      const totalH = shape.height ?? 4.5;
      const rungs = Math.max(1, shape.rungs ?? 3);
      const baseY = Math.max(shape.elevation ?? 0, 0);
      const thick = 0.2;
      const gateH = totalH / rungs;
      const yaw = (-shape.rotation * Math.PI) / 180;
      const mat = makeMat(color);
      const fillMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.06,
        side: THREE.DoubleSide,
      });

      const group = new THREE.Group();
      group.position.set(shape.x, baseY, shape.y);
      group.rotation.y = yaw;

      for (let i = 0; i < rungs; i++) {
        const rungGroup = new THREE.Group();
        rungGroup.position.y = i * gateH;

        const lp = new THREE.Mesh(
          new THREE.BoxGeometry(thick, gateH, thick),
          mat
        );
        lp.position.set(-(w / 2), gateH / 2, 0);
        rungGroup.add(lp);

        const rp = new THREE.Mesh(
          new THREE.BoxGeometry(thick, gateH, thick),
          mat
        );
        rp.position.set(w / 2, gateH / 2, 0);
        rungGroup.add(rp);

        const topBar = new THREE.Mesh(
          new THREE.BoxGeometry(w + thick, thick, thick),
          mat
        );
        topBar.position.set(0, gateH, 0);
        rungGroup.add(topBar);

        // Lower bar (only on first rung, visible only when elevated)
        if (i === 0 && baseY > 0) {
          const lowerBar = new THREE.Mesh(
            new THREE.BoxGeometry(w + thick, thick, thick),
            mat
          );
          lowerBar.position.set(0, 0, 0);
          rungGroup.add(lowerBar);
        }

        const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, gateH), fillMat);
        fill.position.set(0, gateH / 2, 0);
        rungGroup.add(fill);

        group.add(rungGroup);
      }

      scene.add(group);
    } else if (shape.kind === "startfinish") {
      // Match StartFinish3D exactly (minus RoundedBox rounding which is minor)
      const color = shape.color ?? "#f59e0b";
      const totalW = shape.width ?? 3.0;
      const spacing = totalW / 4;
      const podW = spacing * 0.72;
      const podD = podW * 1.5;
      const podH = 0.08;
      const topInset = 0.08;
      const stripeW = 0.1;
      const gap = spacing - podW;
      const yaw = (-shape.rotation * Math.PI) / 180;

      const baseMat = new THREE.MeshStandardMaterial({
        color: "#111a26",
        roughness: 0.88,
        metalness: 0.08,
      });

      const group = new THREE.Group();
      group.position.set(shape.x, 0, shape.y);
      group.rotation.y = yaw;

      for (let i = 0; i < 4; i++) {
        const px = -totalW / 2 + spacing * i + spacing / 2;
        const emissiveIntensity = 0.08 + i * 0.025;

        const podGroup = new THREE.Group();
        podGroup.position.x = px;

        const base = new THREE.Mesh(
          new THREE.BoxGeometry(podW, podH, podD),
          baseMat
        );
        base.position.set(0, podH / 2, 0);
        podGroup.add(base);

        const topMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity,
          roughness: 0.34,
          metalness: 0.18,
        });
        const top = new THREE.Mesh(
          new THREE.BoxGeometry(podW - topInset, 0.018, podD - topInset),
          topMat
        );
        top.position.set(0, podH + 0.012, 0);
        podGroup.add(top);

        // Stripe
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(podW - topInset * 1.2, stripeW),
          new THREE.MeshBasicMaterial({
            color: "#ffffff",
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide,
          })
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, podH + 0.022, -(podD / 2) + 0.16);
        podGroup.add(stripe);

        // Glow plane
        const glow = new THREE.Mesh(
          new THREE.PlaneGeometry(podW + 0.08, podD + 0.08),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide,
          })
        );
        glow.rotation.x = -Math.PI / 2;
        glow.position.set(0, 0.004, 0);
        podGroup.add(glow);

        group.add(podGroup);
      }

      // Bridge connectors between pod pairs
      for (const dir of [-1, 1]) {
        const bridge = new THREE.Mesh(
          new THREE.BoxGeometry(gap + 0.02, 0.015, 0.1),
          new THREE.MeshStandardMaterial({
            color: "#1c2634",
            roughness: 0.9,
            metalness: 0.04,
          })
        );
        bridge.position.set(dir * spacing, 0.01, 0);
        group.add(bridge);
      }

      scene.add(group);
    } else if (shape.kind === "divegate") {
      const color = shape.color ?? "#f97316";
      const sz = shape.size ?? 2.8;
      const thick = shape.thick ?? 0.2;
      const tilt = shape.tilt ?? 0;
      const tiltRad = (tilt * Math.PI) / 180;
      const yawRad = (-shape.rotation * Math.PI) / 180;
      const centerY = shape.elevation ?? 3.0;
      const mat = makeMat(color);
      const fillMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
      });

      const outer = new THREE.Group();
      outer.position.set(shape.x, 0, shape.y);
      outer.rotation.y = yawRad;

      const frame = new THREE.Group();
      frame.position.set(0, centerY, 0);
      frame.rotation.x = -Math.PI / 2 + tiltRad;

      const topBar = new THREE.Mesh(
        new THREE.BoxGeometry(sz, thick, thick),
        mat
      );
      topBar.position.set(0, sz / 2, 0);
      frame.add(topBar);

      const botBar = new THREE.Mesh(
        new THREE.BoxGeometry(sz, thick, thick),
        mat
      );
      botBar.position.set(0, -sz / 2, 0);
      frame.add(botBar);

      const leftBar = new THREE.Mesh(
        new THREE.BoxGeometry(thick, sz, thick),
        mat
      );
      leftBar.position.set(-sz / 2, 0, 0);
      frame.add(leftBar);

      const rightBar = new THREE.Mesh(
        new THREE.BoxGeometry(thick, sz, thick),
        mat
      );
      rightBar.position.set(sz / 2, 0, 0);
      frame.add(rightBar);

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(sz - thick * 2, sz - thick * 2),
        fillMat
      );
      frame.add(fill);

      outer.add(frame);

      // Ground posts — corners of the frame projected down to y=0
      const bottomY = centerY - (sz / 2) * Math.sin(tiltRad);
      const topY2 = centerY + (sz / 2) * Math.sin(tiltRad);
      const bottomZ = (sz / 2) * Math.cos(tiltRad);
      const topZ = -(sz / 2) * Math.cos(tiltRad);
      const postW = thick;

      const corners = [
        { x: -sz / 2, py: bottomY, pz: bottomZ },
        { x: sz / 2, py: bottomY, pz: bottomZ },
        { x: -sz / 2, py: topY2, pz: topZ },
        { x: sz / 2, py: topY2, pz: topZ },
      ];
      for (const { x, py, pz } of corners) {
        if (py > 0.05) {
          const post = new THREE.Mesh(
            new THREE.BoxGeometry(postW, 1, postW),
            mat
          );
          post.position.set(x, py / 2, pz);
          post.scale.y = py;
          outer.add(post);
        }
      }

      scene.add(outer);
    } else if (shape.kind === "flag") {
      const color = shape.color ?? "#a855f7";
      const ph = shape.poleHeight ?? 3.5;
      const yaw = (-shape.rotation * Math.PI) / 180;

      const mastCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, ph * 0.42, 0),
        new THREE.Vector3(0.01, ph * 0.74, 0),
        new THREE.Vector3(0.045, ph * 0.9, 0),
        new THREE.Vector3(0.11, ph * 0.985, 0),
        new THREE.Vector3(0.2, ph * 0.985, 0),
      ]);

      const mastMat = new THREE.MeshStandardMaterial({
        color: "#d7dde8",
        metalness: 0.3,
        roughness: 0.42,
      });
      const bannerMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.08,
        roughness: 0.68,
        side: THREE.DoubleSide,
      });

      const group = new THREE.Group();
      group.position.set(shape.x, 0, shape.y);
      group.rotation.y = yaw;

      // Base ring
      const ringGeo = new THREE.RingGeometry(0.06, 0.14, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.025, 0);
      group.add(ring);

      const mast = new THREE.Mesh(
        new THREE.TubeGeometry(mastCurve, 40, 0.024, 10, false),
        mastMat
      );
      group.add(mast);

      // Extruded bezier banner — matches Flag3D exactly
      const bannerTop = ph * 0.96;
      const bannerBottom = ph * 0.18;
      const bannerWidth = Math.max(ph * 0.18, 0.62);
      const bannerShape = new THREE.Shape();
      bannerShape.moveTo(0.03, bannerBottom);
      bannerShape.bezierCurveTo(
        0.02,
        ph * 0.34,
        0.01,
        ph * 0.72,
        0.08,
        bannerTop
      );
      bannerShape.bezierCurveTo(
        bannerWidth * 0.24,
        ph * 1.01,
        bannerWidth * 0.72,
        ph * 0.96,
        bannerWidth * 0.94,
        ph * 0.78
      );
      bannerShape.bezierCurveTo(
        bannerWidth * 1.02,
        ph * 0.6,
        bannerWidth * 0.82,
        ph * 0.34,
        bannerWidth * 0.22,
        bannerBottom + ph * 0.02
      );
      bannerShape.bezierCurveTo(
        bannerWidth * 0.1,
        bannerBottom - ph * 0.005,
        0.05,
        bannerBottom - ph * 0.002,
        0.03,
        bannerBottom
      );

      const banner = new THREE.Mesh(
        new THREE.ExtrudeGeometry(bannerShape, {
          depth: 0.018,
          bevelEnabled: false,
        }),
        bannerMat
      );
      banner.position.set(0.01, 0, 0);
      group.add(banner);

      scene.add(group);
    } else if (shape.kind === "cone") {
      const color = shape.color ?? "#f97316";
      const r = shape.radius ?? 0.2;
      const h = Math.max(r * 1.15, 0.11);
      const baseRadius = Math.max(r * 1.18, 0.12);
      const topRadius = Math.max(baseRadius * 0.6, 0.075);
      const mat = makeMat(color, 0.06);

      const coneGroup = new THREE.Group();
      coneGroup.position.set(shape.x, 0, shape.y);

      const cone = new THREE.Mesh(
        new THREE.CylinderGeometry(topRadius, baseRadius, h, 24),
        mat
      );
      cone.position.set(0, h / 2, 0);
      coneGroup.add(cone);

      // Ring on top — matches Cone3D
      const topRing = new THREE.Mesh(
        new THREE.RingGeometry(topRadius * 0.28, topRadius * 0.86, 24),
        new THREE.MeshBasicMaterial({
          color: "#fed7aa",
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        })
      );
      topRing.rotation.x = -Math.PI / 2;
      topRing.position.set(0, h + 0.004, 0);
      coneGroup.add(topRing);

      scene.add(coneGroup);
    }
  }
}

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
    img.src = `/assets/brand/trackdraw-logo-mono-${isDark ? "darkbg" : "lightbg"}.svg`;
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
      (s): s is PolylineShape => s.kind === "polyline" && s.points.length >= 2
    );
    if (!polyline) {
      return reject(new Error("No track path to fly through"));
    }

    const curveResult = getPolylineCurve3Derived(polyline, {
      heightOffset: 0.8,
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

    // Hidden canvas — off-screen but in the DOM for WebGL rendering
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

    // Grid matching the actual 3D view
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

    addShapes(scene, shapes);

    const cleanup = () => {
      renderer.dispose();
      if (document.body.contains(canvas)) document.body.removeChild(canvas);
    };

    // Duration from track length at realistic FPV speed
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

    // Prime camera at t=0
    const initialPose = getInitialFpvCameraPose(samplePoint);
    camera.position.copy(initialPose.position);
    camera.lookAt(initialPose.lookTarget);
    renderer.render(scene, camera);

    const downloadBlob = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    // mediabunny: frame-accurate WebM encoding via CanvasSource.
    // Timestamps are in seconds; frames are rendered off-screen and captured directly.
    void (async () => {
      try {
        // Watermark logo on the ground — same as FieldWatermark in the actual 3D view
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

        const target = new BufferTarget();
        const output = new Output({
          format: new WebMOutputFormat(),
          target,
        });

        const videoSource = new CanvasSource(canvas, {
          codec: "vp9",
          bitrate: BITRATE,
          keyFrameInterval: 1, // keyframe every second
        });
        output.addVideoTrack(videoSource);

        await output.start();
        reportProgress(0);

        const frameDuration = 1 / FPS;
        for (let i = 1; i <= totalFrames; i++) {
          tickCamera(i);
          renderer.render(scene, camera);

          await videoSource.add(
            (i - 1) * frameDuration, // timestamp in seconds
            frameDuration
          );

          // Yield periodically to report progress and keep the UI responsive
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
