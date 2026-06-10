import * as THREE from "three";
import {
  getMultiGpDiveGateArchLayout,
  getMultiGpLaunchGateLayout,
  resolveLaunchGateBannerTextureMapping,
} from "@/lib/track/render3d-layout";
import { getDiveGateVisualSpec } from "@/lib/track/elements/visual";
import type {
  ArchDiveGateVisualSpec,
  LaunchGateVisualSpec,
} from "@/lib/track/elements/catalog";
import type { DiveGateShape } from "@/lib/types";
import {
  addBox,
  addCylinder,
  addPipeBetween,
  cloneTextureForPanel,
  loadTexture,
  makeMat,
} from "./shared";

async function createArchDiveGateGroup(
  shape: DiveGateShape,
  visual: ArchDiveGateVisualSpec
): Promise<THREE.Group> {
  const [sideTexture, topTexture] = await Promise.all([
    loadTexture(visual.banner.sideTexture),
    loadTexture(visual.banner.topTexture),
  ]);
  const tube = visual.frame.diameterMeters;
  const pipeRadius = tube / 2;
  const layout = getMultiGpDiveGateArchLayout(shape);

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = (-shape.rotation * Math.PI) / 180;

  const frameMat = makeMat(visual.frame.color);
  const sideMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: sideTexture,
    roughness: 0.72,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: topTexture,
    roughness: 0.68,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const couplerMat = new THREE.MeshStandardMaterial({
    color: "#d6d9de",
    roughness: 0.54,
    metalness: 0.08,
  });

  for (const { end, start } of layout.pipeSegments) {
    addPipeBetween(group, start, end, pipeRadius, frameMat);
  }
  for (const { x, z, topY } of layout.legPoints) {
    if (topY > 0.02) {
      addCylinder(
        group,
        pipeRadius,
        topY,
        [x, topY / 2, z],
        [0, 0, 0],
        frameMat
      );
    }
  }
  for (const { height, postH, x, z } of layout.couplerPoints) {
    if (height < postH) {
      addCylinder(
        group,
        tube * 0.75,
        tube * 1.8,
        [x, height, z],
        [0, 0, 0],
        couplerMat
      );
    }
  }

  const panel = new THREE.Group();
  panel.position.set(0, layout.centerY, 0);
  panel.rotation.x = layout.tiltRad;

  addBox(
    panel,
    [layout.outerW, tube, tube],
    [0, layout.halfOuterH, 0],
    frameMat
  );
  addBox(
    panel,
    [layout.outerW, tube, tube],
    [0, -layout.halfOuterH, 0],
    frameMat
  );
  addBox(
    panel,
    [tube, layout.outerH, tube],
    [-layout.halfOuterW, 0, 0],
    frameMat
  );
  addBox(
    panel,
    [tube, layout.outerH, tube],
    [layout.halfOuterW, 0, 0],
    frameMat
  );

  for (const x of [
    -layout.halfOpening - layout.sidePanelW / 2,
    layout.halfOpening + layout.sidePanelW / 2,
  ]) {
    const side = new THREE.Mesh(
      new THREE.PlaneGeometry(layout.sidePanelW, layout.openingH),
      sideMat
    );
    side.position.set(x, 0, 0);
    if (x > 0) side.rotation.z = Math.PI;
    panel.add(side);
  }

  for (const y of [
    layout.openingH / 2 + layout.bannerH / 2,
    -layout.openingH / 2 - layout.bannerH / 2,
  ]) {
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(layout.outerW, layout.bannerH),
      topMat
    );
    banner.position.set(0, y, 0);
    panel.add(banner);
  }

  group.add(panel);

  return group;
}

async function createLaunchGateGroup(
  shape: DiveGateShape,
  visual: LaunchGateVisualSpec
): Promise<THREE.Group> {
  const [sideTexture, topTexture] = await Promise.all([
    loadTexture(visual.banner.sideTexture),
    loadTexture(visual.banner.topTexture),
  ]);
  const tube = visual.frame.diameterMeters;
  const pipeRadius = tube / 2;
  const layout = getMultiGpLaunchGateLayout(shape);

  const group = new THREE.Group();
  group.position.set(shape.x, 0, shape.y);
  group.rotation.y = (-shape.rotation * Math.PI) / 180;

  const frameMat = makeMat(visual.frame.color);
  const makeBannerMat = (texture: THREE.Texture) =>
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      map: texture,
      roughness: 0.68,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  const textureMapping = resolveLaunchGateBannerTextureMapping(visual.banner, {
    side: sideTexture,
    top: topTexture,
  });
  const bannerMats = {
    front: makeBannerMat(
      cloneTextureForPanel(textureMapping.front.texture, textureMapping.front)
    ),
    rear: makeBannerMat(
      cloneTextureForPanel(textureMapping.rear.texture, textureMapping.rear)
    ),
    left: makeBannerMat(
      cloneTextureForPanel(textureMapping.left.texture, textureMapping.left)
    ),
    right: makeBannerMat(
      cloneTextureForPanel(textureMapping.right.texture, textureMapping.right)
    ),
  };
  const couplerMat = new THREE.MeshStandardMaterial({
    color: "#d6d9de",
    roughness: 0.54,
    metalness: 0.08,
  });

  for (const { end, start } of layout.pipeSegments) {
    addPipeBetween(group, start, end, pipeRadius, frameMat);
  }
  for (const { x, z, topY } of layout.legPoints) {
    if (topY > 0.02) {
      addCylinder(
        group,
        pipeRadius,
        topY,
        [x, topY / 2, z],
        [0, 0, 0],
        frameMat
      );
    }
  }
  for (const { height, postH, x, z } of layout.couplerPoints) {
    if (height < postH) {
      addCylinder(
        group,
        tube * 0.75,
        tube * 1.8,
        [x, height, z],
        [0, 0, 0],
        couplerMat
      );
    }
  }

  const panel = new THREE.Group();
  panel.position.y = layout.topY - tube * 0.12;
  const banners: Array<{
    depth: number;
    material: THREE.Material;
    rotZ: number;
    width: number;
    x: number;
    z: number;
  }> = [
    {
      x: 0,
      z: -layout.halfOpeningD - layout.endPanelD / 2,
      width: layout.outerW,
      depth: layout.endPanelD,
      rotZ: 0,
      material: bannerMats.front,
    },
    {
      x: 0,
      z: layout.halfOpeningD + layout.endPanelD / 2,
      width: layout.outerW,
      depth: layout.endPanelD,
      rotZ: Math.PI,
      material: bannerMats.rear,
    },
    {
      x: -layout.halfOpeningW - layout.sidePanelW / 2,
      z: 0,
      width: layout.sidePanelW,
      depth: layout.openingD,
      rotZ: 0,
      material: bannerMats.left,
    },
    {
      x: layout.halfOpeningW + layout.sidePanelW / 2,
      z: 0,
      width: layout.sidePanelW,
      depth: layout.openingD,
      rotZ: 0,
      material: bannerMats.right,
    },
  ];
  for (const { depth, material, rotZ, width, x, z } of banners) {
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      material
    );
    banner.position.set(x, 0, z);
    banner.rotation.set(Math.PI / 2, 0, rotZ);
    panel.add(banner);
  }
  group.add(panel);

  return group;
}

export async function addDiveGateSceneShapes(
  shape: DiveGateShape,
  scene: THREE.Scene
): Promise<void> {
  const diveGateVisual = getDiveGateVisualSpec(shape);
  if (diveGateVisual?.variant === "arch") {
    scene.add(await createArchDiveGateGroup(shape, diveGateVisual));
    return;
  }
  if (diveGateVisual?.variant === "launch") {
    scene.add(await createLaunchGateGroup(shape, diveGateVisual));
    return;
  }

  const color = shape.color ?? "#f97316";
  const sz = shape.width ?? 2.8;
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

  const topBar = new THREE.Mesh(new THREE.BoxGeometry(sz, thick, thick), mat);
  topBar.position.set(0, sz / 2, 0);
  frame.add(topBar);

  const botBar = new THREE.Mesh(new THREE.BoxGeometry(sz, thick, thick), mat);
  botBar.position.set(0, -sz / 2, 0);
  frame.add(botBar);

  const leftBar = new THREE.Mesh(new THREE.BoxGeometry(thick, sz, thick), mat);
  leftBar.position.set(-sz / 2, 0, 0);
  frame.add(leftBar);

  const rightBar = new THREE.Mesh(new THREE.BoxGeometry(thick, sz, thick), mat);
  rightBar.position.set(sz / 2, 0, 0);
  frame.add(rightBar);

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(sz - thick * 2, sz - thick * 2),
    fillMat
  );
  frame.add(fill);

  outer.add(frame);

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
      const post = new THREE.Mesh(new THREE.BoxGeometry(postW, 1, postW), mat);
      post.position.set(x, py / 2, pz);
      post.scale.y = py;
      outer.add(post);
    }
  }

  scene.add(outer);
}
