import { loadAppearance } from "@trackdraw/schema/appearance/registry";
import * as THREE from "three";
import {
  PVC_SET_MARKER_OPACITY,
  PVC_SET_METALNESS,
  PVC_SET_ROUGHNESS,
  getPanelFrameGateLayout,
  getPvcSetGate3DParts,
  getPvcSetGateCylinderTransform,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import { getGateVisualSpec } from "@/lib/track/elements/visual";
import type {
  PanelFrameGateVisualSpec,
  PvcSetGateVisualSpec,
} from "@/lib/track/elements/catalog";
import { getShapeTimingMarker, getTimingMarkerColor } from "@/lib/track/timing";
import type { GateShape } from "@/lib/types";
import {
  addBox,
  addCylinder,
  addPanelTexturePlane,
  cloneTextureForPanel,
  getGateLadderYawRadians,
  loadPanelTextures,
  makeMat,
} from "./shared";

async function createOfficialGateGroup(
  shape: GateShape,
  visual: PanelFrameGateVisualSpec
): Promise<THREE.Group> {
  const { panels } = visual;
  const panelTextures = await loadPanelTextures(visual.textures).catch(
    () => null
  );
  const {
    frameTube,
    frameZ,
    frontZ,
    h,
    leftPanelWidth,
    leftPanelX,
    outerLeftX,
    outerRightX,
    outerTopY,
    panelDepth,
    rightPanelWidth,
    rightPanelX,
    topPanelHeight,
    topPanelW,
    topPanelY,
  } = getPanelFrameGateLayout(shape, visual);
  const yaw = getGateLadderYawRadians(shape.rotation);
  const textureMapping = panelTextures
    ? resolvePanelFrameTextureMapping(visual.textures, {
        left: panelTextures.left,
        right: panelTextures.right,
        top: panelTextures.top,
      })
    : null;

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
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
  const topMat = new THREE.MeshStandardMaterial({
    color: panels.top.color,
    emissive: panels.top.color,
    emissiveIntensity: 0.04,
    roughness: 0.64,
    metalness: 0.03,
  });
  addCylinder(
    group,
    frameTube / 2,
    outerTopY,
    [outerLeftX, outerTopY / 2, frameZ],
    [0, 0, 0],
    frameMat
  );
  addCylinder(
    group,
    frameTube / 2,
    outerTopY,
    [outerRightX, outerTopY / 2, frameZ],
    [0, 0, 0],
    frameMat
  );
  addCylinder(
    group,
    frameTube / 2,
    outerRightX - outerLeftX,
    [0, outerTopY, frameZ],
    [0, 0, Math.PI / 2],
    frameMat
  );
  for (const x of [outerLeftX, outerRightX]) {
    const elbow = new THREE.Mesh(
      new THREE.SphereGeometry(frameTube * 0.66, 16, 12),
      frameMat
    );
    elbow.position.set(x, outerTopY, frameZ);
    elbow.castShadow = true;
    group.add(elbow);
  }
  addBox(
    group,
    [leftPanelWidth, h, panelDepth],
    [leftPanelX, h / 2, 0],
    leftPanelMat
  );
  addBox(
    group,
    [rightPanelWidth, h, panelDepth],
    [rightPanelX, h / 2, 0],
    rightPanelMat
  );
  addBox(
    group,
    [topPanelW, topPanelHeight, panelDepth],
    [0, topPanelY, 0],
    topMat
  );

  if (textureMapping) {
    addPanelTexturePlane(
      group,
      cloneTextureForPanel(textureMapping.right.texture, textureMapping.right),
      [leftPanelWidth, h],
      [leftPanelX, h / 2, frontZ]
    );
    addPanelTexturePlane(
      group,
      cloneTextureForPanel(textureMapping.left.texture, textureMapping.left),
      [rightPanelWidth, h],
      [rightPanelX, h / 2, frontZ]
    );
    if (textureMapping.top) {
      addPanelTexturePlane(
        group,
        cloneTextureForPanel(textureMapping.top.texture, textureMapping.top),
        [topPanelW, topPanelHeight],
        [0, topPanelY, frontZ]
      );
    }
  }

  return group;
}

/** Fixed PVC arch gate with the same construction as the 3D preview. */
function createPvcSetGateGroup(
  shape: GateShape,
  visual: PvcSetGateVisualSpec
): THREE.Group {
  const parts = getPvcSetGate3DParts(shape, visual);
  const tubeMaterial = new THREE.MeshStandardMaterial({
    color: shape.color ?? visual.frame.color,
    roughness: PVC_SET_ROUGHNESS,
    metalness: PVC_SET_METALNESS,
  });
  const fittingMaterial = new THREE.MeshStandardMaterial({
    color: visual.fittings.color,
    roughness: PVC_SET_ROUGHNESS + 0.05,
    metalness: PVC_SET_METALNESS,
  });
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const sphereGeometry = new THREE.SphereGeometry(1, 16, 12);

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = getGateLadderYawRadians(shape.rotation);

  const addCylinders = (
    cylinders: typeof parts.tubes,
    material: THREE.Material
  ) => {
    for (const cylinder of cylinders) {
      const { rotation, scale } = getPvcSetGateCylinderTransform(cylinder);
      const mesh = new THREE.Mesh(cylinderGeometry, material);
      mesh.position.set(...cylinder.center);
      mesh.rotation.set(...rotation);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  };
  addCylinders(parts.tubes, tubeMaterial);
  addCylinders(parts.sleeves, fittingMaterial);

  for (const hub of parts.hubs) {
    const mesh = new THREE.Mesh(sphereGeometry, fittingMaterial);
    mesh.position.set(...hub.center);
    mesh.scale.set(hub.radius, hub.radius * hub.flatten, hub.radius);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const marker = getShapeTimingMarker(shape);
  if (marker) {
    const markerColor = getTimingMarkerColor(marker);
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(parts.opening.width, parts.opening.height),
      new THREE.MeshStandardMaterial({
        color: markerColor,
        emissive: markerColor,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: PVC_SET_MARKER_OPACITY,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.6,
        metalness: 0,
      })
    );
    panel.position.set(...parts.opening.center);
    panel.renderOrder = 2;
    group.add(panel);
  }

  return group;
}

export async function addGateSceneShapes(
  shape: GateShape,
  scene: THREE.Scene
): Promise<void> {
  if (shape.appearance)
    await loadAppearance(shape.appearance).catch(() => undefined);
  const visual = getGateVisualSpec(shape);
  if (visual.variant === "panel-frame") {
    scene.add(await createOfficialGateGroup(shape, visual));
    return;
  }
  if (visual.variant === "pvc-set") {
    scene.add(createPvcSetGateGroup(shape, visual));
    return;
  }

  const color = shape.color ?? "#3b82f6";
  const thick = shape.thick ?? 0.2;
  const h = shape.height ?? 2;
  const w = shape.width ?? 3;
  const yaw = getGateLadderYawRadians(shape.rotation);
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
}
