import * as THREE from "three";
import { getCornerFlagLayout } from "@/lib/track/render3d-layout";
import { getFlagVisualSpec } from "@/lib/track/elements/visual";
import type { FlagVisualSpec } from "@/lib/track/elements/catalog";
import type { FlagShape } from "@/lib/types";
import { loadTexture } from "./shared";

async function loadFlagTextures(visual: FlagVisualSpec | null) {
  if (!visual?.textures) return null;
  const [front, back] = await Promise.all([
    loadTexture(visual.textures.front),
    loadTexture(visual.textures.back),
  ]);
  return { front, back };
}

export async function addFlagSceneShapes(
  shape: FlagShape,
  scene: THREE.Scene
): Promise<void> {
  const color = shape.color ?? "#a855f7";
  const yaw = (-shape.rotation * Math.PI) / 180;
  const flagVisual = getFlagVisualSpec(shape);
  const flagTextures = await loadFlagTextures(flagVisual);
  const {
    bannerCenterY,
    bannerHeight,
    bannerTextureWidth,
    bannerTextureX,
    panelDepth,
    ph,
    poleCapRadius,
    polePoints,
    poleRadius,
    poleTipX,
    poleTipY,
  } = getCornerFlagLayout(shape, Boolean(flagTextures));

  const mastCurve = new THREE.CatmullRomCurve3(
    polePoints.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    false,
    "centripetal",
    0.5
  );

  const mastMat = new THREE.MeshStandardMaterial({
    color: "#d7dde8",
    metalness: 0.3,
    roughness: 0.42,
  });
  const bannerMat = new THREE.MeshStandardMaterial(
    flagTextures
      ? {
          color: "#ffffff",
          transparent: true,
          roughness: 0.78,
          side: THREE.DoubleSide,
          map: flagTextures.front,
        }
      : {
          color,
          emissive: color,
          emissiveIntensity: 0.08,
          roughness: 0.68,
          side: THREE.DoubleSide,
        }
  );

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = yaw;

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
    new THREE.TubeGeometry(mastCurve, 40, poleRadius, 10, false),
    mastMat
  );
  group.add(mast);
  const mastCap = new THREE.Mesh(
    new THREE.SphereGeometry(poleCapRadius, 18, 12),
    mastMat
  );
  mastCap.position.set(poleTipX, poleTipY, 0);
  mastCap.castShadow = true;
  mastCap.receiveShadow = true;
  group.add(mastCap);

  const bannerTop = ph * 0.96;
  const bannerBottom = ph * 0.18;
  const bannerWidth = Math.max(ph * 0.18, 0.62);
  const bannerShape = new THREE.Shape();
  bannerShape.moveTo(0.03, bannerBottom);
  bannerShape.bezierCurveTo(0.02, ph * 0.34, 0.01, ph * 0.72, 0.08, bannerTop);
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
  if (flagTextures) {
    const frontPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(bannerTextureWidth, bannerHeight),
      new THREE.MeshStandardMaterial({
        map: flagTextures.front,
        transparent: true,
        roughness: 0.78,
        side: THREE.FrontSide,
      })
    );
    frontPanel.position.set(bannerTextureX, bannerCenterY, panelDepth * 0.65);
    group.add(frontPanel);

    const backPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(bannerTextureWidth, bannerHeight),
      new THREE.MeshStandardMaterial({
        map: flagTextures.back,
        transparent: true,
        roughness: 0.78,
        side: THREE.FrontSide,
      })
    );
    backPanel.position.set(bannerTextureX, bannerCenterY, -panelDepth * 0.35);
    backPanel.rotation.y = Math.PI;
    group.add(backPanel);
  } else {
    group.add(banner);
  }

  scene.add(group);
}
