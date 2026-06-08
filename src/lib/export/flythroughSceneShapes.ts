import * as THREE from "three";
import {
  getDiveGateVisualSpec,
  getFlagVisualSpec,
  getGateVisualSpec,
  getLadderVisualSpec,
} from "@/lib/track/elements/visual";
import {
  getCornerFlagLayout,
  getMultiGpDiveGateArchLayout,
  getMultiGpLaunchGateLayout,
  getPanelFrameGateLayout,
  getPanelFrameLadderLayout,
  resolveLaunchGateBannerTextureMapping,
  resolvePanelFrameTextureMapping,
} from "@/lib/track/render3d-layout";
import type {
  ArchDiveGateVisualSpec,
  FlagVisualSpec,
  GatePanelTextureVisualSpec,
  LaunchGateVisualSpec,
  PanelFrameGateVisualSpec,
  PanelFrameLadderVisualSpec,
} from "@/lib/track/elements/catalog";
import type { DiveGateShape, GateShape, LadderShape, Shape } from "@/lib/types";

function makeMat(color: string, emissiveIntensity = 0.08) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness: 0.4,
    metalness: 0.05,
  });
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addCylinder(
  group: THREE.Group,
  radius: number,
  length: number,
  position: [number, number, number],
  rotation: [number, number, number],
  material: THREE.Material
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 16),
    material
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addPipeBetween(
  group: THREE.Group,
  start: [number, number, number],
  end: [number, number, number],
  radius: number,
  material: THREE.Material
) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 16),
    material
  );
  mesh.position.copy(from.add(to).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function getGateLadderYawRadians(rotation: number) {
  return (-(rotation + 180) * Math.PI) / 180;
}

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, Promise<THREE.Texture>>();

function loadTexture(path: string): Promise<THREE.Texture> {
  const cached = textureCache.get(path);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        resolve(texture);
      },
      undefined,
      (error) => {
        textureCache.delete(path);
        reject(error);
      }
    );
  });
  textureCache.set(path, promise);
  return promise;
}

function cloneTextureForPanel(
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

async function loadFlagTextures(visual: FlagVisualSpec | null) {
  if (!visual?.textures) return null;
  const [front, back] = await Promise.all([
    loadTexture(visual.textures.front),
    loadTexture(visual.textures.back),
  ]);
  return { front, back };
}

async function loadPanelTextures(textures: GatePanelTextureVisualSpec) {
  const [left, right, top] = await Promise.all([
    loadTexture(textures.left),
    loadTexture(textures.right),
    textures.top ? loadTexture(textures.top) : Promise.resolve(null),
  ]);
  return { left, right, top };
}

function addPanelTexturePlane(
  group: THREE.Group,
  texture: THREE.Texture,
  size: [number, number],
  position: [number, number, number]
) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(...size),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.72,
      metalness: 0.01,
      side: THREE.FrontSide,
    })
  );
  mesh.position.set(...position);
  mesh.rotation.y = Math.PI;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
}

async function createOfficialGateGroup(
  shape: GateShape,
  visual: PanelFrameGateVisualSpec
): Promise<THREE.Group> {
  const { panels } = visual;
  const panelTextures = await loadPanelTextures(visual.textures);
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
  const textureMapping = resolvePanelFrameTextureMapping(visual.textures, {
    left: panelTextures.left,
    right: panelTextures.right,
    top: panelTextures.top,
  });

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

  addPanelTexturePlane(
    group,
    cloneTextureForPanel(textureMapping.left.texture, textureMapping.left),
    [leftPanelWidth, h],
    [leftPanelX, h / 2, frontZ]
  );
  addPanelTexturePlane(
    group,
    cloneTextureForPanel(textureMapping.right.texture, textureMapping.right),
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

  return group;
}

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

export async function addFlythroughShapes(
  scene: THREE.Scene,
  shapes: Shape[]
): Promise<void> {
  for (const shape of shapes) {
    if (shape.kind === "gate") {
      const visual = getGateVisualSpec(shape);
      if (visual.variant === "panel-frame") {
        scene.add(await createOfficialGateGroup(shape, visual));
        continue;
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
    } else if (shape.kind === "ladder") {
      const ladderVisual = getLadderVisualSpec(shape);
      if (ladderVisual?.variant === "panel-frame") {
        scene.add(await createPanelFrameLadderGroup(shape, ladderVisual));
        continue;
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
      const diveGateVisual = getDiveGateVisualSpec(shape);
      if (diveGateVisual?.variant === "arch") {
        scene.add(await createArchDiveGateGroup(shape, diveGateVisual));
        continue;
      }
      if (diveGateVisual?.variant === "launch") {
        scene.add(await createLaunchGateGroup(shape, diveGateVisual));
        continue;
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
        frontPanel.position.set(
          bannerTextureX,
          bannerCenterY,
          panelDepth * 0.65
        );
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
        backPanel.position.set(
          bannerTextureX,
          bannerCenterY,
          -panelDepth * 0.35
        );
        backPanel.rotation.y = Math.PI;
        group.add(backPanel);
      } else {
        group.add(banner);
      }

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
