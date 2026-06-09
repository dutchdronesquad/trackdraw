import * as THREE from "three";
import {
  getPanelFrameLadderLayout,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import { getLadderVisualSpec } from "@/lib/track/elements/visual";
import type { PanelFrameLadderVisualSpec } from "@/lib/track/elements/catalog";
import type { LadderShape } from "@/lib/types";
import {
  addBox,
  addCylinder,
  addPanelTexturePlane,
  cloneTextureForPanel,
  getGateLadderYawRadians,
  loadPanelTextures,
  makeMat,
} from "./shared";

async function createPanelFrameLadderGroup(
  shape: LadderShape,
  visual: PanelFrameLadderVisualSpec
): Promise<THREE.Group> {
  const { frame, panels } = visual;
  const topPanel = panels.top;
  const panelTextures = await loadPanelTextures(visual.textures);
  const {
    bannerH,
    baseY,
    frameTube,
    frameZ,
    frontZ,
    leftPanelWidth,
    openingH,
    outerLeftX,
    outerRightX,
    outerW,
    panelDepth,
    rightPanelWidth,
    sections,
    totalH,
    w,
  } = getPanelFrameLadderLayout(shape, visual);
  const yaw = getGateLadderYawRadians(shape.rotation);
  const textureMapping = resolvePanelFrameTextureMapping(visual.textures, {
    left: panelTextures.left,
    right: panelTextures.right,
    top: panelTextures.top,
  });

  const group = new THREE.Group();
  group.position.set(shape.x, baseY, shape.y);
  group.rotation.y = yaw;

  const frameMat = new THREE.MeshStandardMaterial({
    color: "#e5e7eb",
    roughness: 0.82,
    metalness: 0.02,
  });
  const leftPanelMat = new THREE.MeshStandardMaterial({
    color: panels.left.color,
    emissive: panels.left.color,
    emissiveIntensity: 0.02,
    roughness: 0.7,
    metalness: 0.01,
  });
  const rightPanelMat = new THREE.MeshStandardMaterial({
    color: panels.right.color,
    emissive: panels.right.color,
    emissiveIntensity: 0.02,
    roughness: 0.7,
    metalness: 0.01,
  });
  const topPanelMat = topPanel
    ? new THREE.MeshStandardMaterial({
        color: topPanel.color,
        emissive: topPanel.color,
        emissiveIntensity: 0.04,
        roughness: 0.64,
        metalness: 0.03,
      })
    : null;
  const fillMat = new THREE.MeshBasicMaterial({
    color: frame.color,
    transparent: true,
    opacity: 0.045,
    side: THREE.DoubleSide,
  });

  addCylinder(
    group,
    frameTube / 2,
    totalH,
    [outerLeftX, totalH / 2, frameZ],
    [0, 0, 0],
    frameMat
  );
  addCylinder(
    group,
    frameTube / 2,
    totalH,
    [outerRightX, totalH / 2, frameZ],
    [0, 0, 0],
    frameMat
  );
  if (baseY > 0) {
    addCylinder(
      group,
      frameTube / 2,
      outerW,
      [0, 0, frameZ],
      [0, 0, Math.PI / 2],
      frameMat
    );
  }

  if (sections.at(-1)?.hasTopPanel ?? true) {
    for (const x of [outerLeftX, outerRightX]) {
      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(frameTube * 0.66, 16, 12),
        frameMat
      );
      elbow.position.set(x, totalH, frameZ);
      elbow.castShadow = true;
      group.add(elbow);
    }
  }

  for (const section of sections) {
    if (section.hasTopPanel) {
      addCylinder(
        group,
        frameTube / 2,
        outerW,
        [0, section.barY, frameZ],
        [0, 0, Math.PI / 2],
        frameMat
      );
    }
    if (section.hasTopPanel && topPanelMat && bannerH > 0) {
      addBox(
        group,
        [outerW, bannerH, panelDepth],
        [0, section.bannerMidY, 0],
        topPanelMat
      );
    }
    addBox(
      group,
      [leftPanelWidth, openingH, panelDepth],
      [-w / 2 - leftPanelWidth / 2, section.openingMidY, 0],
      leftPanelMat
    );
    addBox(
      group,
      [rightPanelWidth, openingH, panelDepth],
      [w / 2 + rightPanelWidth / 2, section.openingMidY, 0],
      rightPanelMat
    );
    addPanelTexturePlane(
      group,
      cloneTextureForPanel(textureMapping.left.texture, textureMapping.left),
      [leftPanelWidth, openingH],
      [-w / 2 - leftPanelWidth / 2, section.openingMidY, frontZ]
    );
    addPanelTexturePlane(
      group,
      cloneTextureForPanel(textureMapping.right.texture, textureMapping.right),
      [rightPanelWidth, openingH],
      [w / 2 + rightPanelWidth / 2, section.openingMidY, frontZ]
    );
    if (section.hasTopPanel && textureMapping.top && bannerH > 0) {
      addPanelTexturePlane(
        group,
        cloneTextureForPanel(textureMapping.top.texture, textureMapping.top),
        [outerW, bannerH],
        [0, section.bannerMidY, frontZ]
      );
    }

    const fill = new THREE.Mesh(new THREE.PlaneGeometry(w, openingH), fillMat);
    fill.position.set(0, section.openingMidY, -panelDepth / 2 - 0.004);
    group.add(fill);
  }

  return group;
}

export async function addLadderSceneShapes(
  shape: LadderShape,
  scene: THREE.Scene
): Promise<void> {
  const ladderVisual = getLadderVisualSpec(shape);
  if (ladderVisual?.variant === "panel-frame") {
    scene.add(await createPanelFrameLadderGroup(shape, ladderVisual));
    return;
  }

  const color = shape.color ?? "#3b82f6";
  const w = shape.width ?? 1.5;
  const totalH = shape.height ?? 4.5;
  const rungs = Math.max(1, shape.rungs ?? 3);
  const baseY = Math.max(shape.elevation ?? 0, 0);
  const thick = 0.2;
  const gateH = totalH / rungs;
  const yaw = getGateLadderYawRadians(shape.rotation);
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

    const lp = new THREE.Mesh(new THREE.BoxGeometry(thick, gateH, thick), mat);
    lp.position.set(-(w / 2), gateH / 2, 0);
    rungGroup.add(lp);

    const rp = new THREE.Mesh(new THREE.BoxGeometry(thick, gateH, thick), mat);
    rp.position.set(w / 2, gateH / 2, 0);
    rungGroup.add(rp);

    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(w + thick, thick, thick),
      mat
    );
    topBar.position.set(0, gateH, 0);
    rungGroup.add(topBar);

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
}
