import * as THREE from "three";

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const CLOTH_COLUMNS = 10;
const CLOTH_ROWS = 40;
const CATALOG_ASPECT = 1134 / 5811;
const CATALOG_BOTTOM = 0.08;
const ALPHA_CUTOFF = 0.5;

// Normalized leading edge of the MultiGP front artwork, from its top down.
const CATALOG_EDGE = [0.995, 0.477, 0.276, 0.155, 0.075, 0.022, 0.002, 0];
const TRAILING_EDGE = [0.04, 0.45, 0.78, 0.96, 1, 0.95, 0.72, 0.06];

type FlagTextures = { front: THREE.Texture; back: THREE.Texture };
type FlagOptions = {
  height: number;
  poleColor?: string;
  color: string;
  id: string;
};

function sampleProfile(profile: readonly number[], t: number) {
  const index = Math.min(profile.length - 2, Math.floor(t));
  const fraction = t - index;
  return THREE.MathUtils.lerp(profile[index], profile[index + 1], fraction);
}

function getFlagProfile(height: number, catalog: boolean) {
  const bottom = height * (catalog ? CATALOG_BOTTOM : 0.18);
  const width = catalog
    ? Math.max(height * 0.18, (height - bottom) * CATALOG_ASPECT)
    : Math.max(height * 0.18, 0.62);
  const radius = catalog ? 0.03 : 0.024;
  const tipRadius = Math.min(radius * 0.34, height * 0.05);
  const mastTop = height - tipRadius;
  const leadingEdge = (y: number) => {
    if (catalog) {
      const fromTop = THREE.MathUtils.clamp(
        (height - y) / (height - bottom),
        0,
        1
      );
      return width * sampleProfile(CATALOG_EDGE, Math.min(7, fromTop * 20));
    }
    const bend = THREE.MathUtils.clamp((y / mastTop - 0.64) / 0.36, 0, 1);
    return width * 0.7 * bend ** 3;
  };
  return { bottom, width, radius, tipRadius, mastTop, leadingEdge };
}

function createMast(
  height: number,
  profile: ReturnType<typeof getFlagProfile>
) {
  const { bottom, radius, tipRadius, mastTop, leadingEdge } = profile;
  const points = [
    ...Array.from({ length: 17 }, (_, i) => (i / 16) * mastTop * 0.65),
    ...Array.from(
      { length: 32 },
      (_, i) => (0.65 + ((i + 1) / 32) * 0.35) * mastTop
    ),
  ].map((y) => new THREE.Vector3(leadingEdge(y), y, 0));
  const curve = new THREE.CatmullRomCurve3(points);
  const mast = new THREE.TubeGeometry(curve, 40, radius, 8, false);
  const position = mast.getAttribute("position");
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const center = curve.getPointAt(t);
    const sleeve =
      1 +
      0.28 * Math.max(0, 1 - Math.abs(center.y - bottom) / (height * 0.045));
    const scale = THREE.MathUtils.lerp(1, tipRadius / radius, t) * sleeve;
    for (let j = 0; j <= 8; j++) {
      const vertex = i * 9 + j;
      position.setXYZ(
        vertex,
        center.x + (position.getX(vertex) - center.x) * scale,
        center.y + (position.getY(vertex) - center.y) * scale,
        position.getZ(vertex) * scale
      );
    }
  }
  mast.computeVertexNormals();
  return mast;
}

function createCloth(
  height: number,
  profile: ReturnType<typeof getFlagProfile>,
  catalog: boolean,
  back: boolean,
  textured = catalog
) {
  const { bottom, width, mastTop, leadingEdge } = profile;
  const top = catalog ? height : mastTop;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sway: [number[], number[]] = [[], []];

  for (let row = 0; row <= CLOTH_ROWS; row++) {
    const v = row / CLOTH_ROWS;
    const y = THREE.MathUtils.lerp(bottom, top, v);
    const leadingX = leadingEdge(y);
    const span = catalog
      ? textured
        ? width
        : Math.max(width * 0.01, width * Math.min(1, v * 19) - leadingX)
      : width * sampleProfile(TRAILING_EDGE, v * 7);
    for (let col = 0; col <= CLOTH_COLUMNS; col++) {
      const u = col / CLOTH_COLUMNS;
      const x = u * span + (textured ? 0 : leadingX);
      const free = THREE.MathUtils.clamp((x - leadingX) / width, 0, 1);
      const slack = free ** 1.65 * (0.48 + 0.52 * Math.sin(v * Math.PI * 0.86));
      const rest =
        width *
        free *
        (0.09 * Math.sin(Math.PI * u) + 0.045 * Math.sin(v * 8 - u * 3));
      positions.push(x, y, rest);
      uvs.push(back ? 1 - u : u, v);

      // At most 8% of cloth width or 8 cm. Only the free cloth moves in Z.
      const amplitude = Math.min(width * 0.08, 0.08) * slack;
      const phase = v * 4.4 - free * 3;
      sway[0].push(0, 0, amplitude * Math.sin(phase));
      sway[1].push(0, 0, amplitude * Math.cos(phase));

      if (row < CLOTH_ROWS && col < CLOTH_COLUMNS) {
        const a = row * (CLOTH_COLUMNS + 1) + col;
        const b = a + CLOTH_COLUMNS + 1;
        if (back) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const restNormals = geometry.getAttribute("normal");
  const morphNormals = sway.map((offset) => {
    const pose = new THREE.BufferGeometry();
    pose.setIndex(geometry.getIndex());
    pose.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        positions.map((p, i) => p + offset[i]),
        3
      )
    );
    pose.computeVertexNormals();
    const target = pose.getAttribute("normal");
    const delta = new Float32Array(target.count * 3);
    for (let i = 0; i < delta.length; i++)
      delta[i] = Number(target.array[i]) - Number(restNormals.array[i]);
    pose.dispose();
    return new THREE.BufferAttribute(delta, 3);
  });
  geometry.morphAttributes.position = sway.map(
    (offset) => new THREE.Float32BufferAttribute(offset, 3)
  );
  geometry.morphAttributes.normal = morphNormals;
  geometry.morphTargetsRelative = true;
  geometry.computeBoundingBox();
  // Conservative bounds for the combined targets, including raycasts.
  const maxSway = Math.min(width * 0.08, 0.08);
  geometry.boundingBox!.min.z -= maxSway;
  geometry.boundingBox!.max.z += maxSway;
  geometry.boundingSphere = geometry.boundingBox!.getBoundingSphere(
    new THREE.Sphere()
  );
  return geometry;
}

export function createBeachflag({
  height,
  poleColor,
  color,
  id,
}: FlagOptions): {
  group: THREE.Group;
  setSelected: (selected: boolean) => void;
  setTextures: (textures: FlagTextures | null) => void;
  setTime: (seconds: number | null) => void;
  dispose: () => void;
} {
  const group = new THREE.Group();
  if (height <= 0) {
    return {
      group,
      setSelected() {},
      setTextures() {},
      setTime() {},
      dispose() {},
    };
  }
  const catalog = poleColor !== undefined;
  const profile = getFlagProfile(height, catalog);
  const mastMaterial = new THREE.MeshStandardMaterial({
    color: poleColor ?? "#9ba5af",
    metalness: catalog ? 0.12 : 0.45,
    roughness: 0.48,
  });
  const finish = new THREE.MeshStandardMaterial({
    color: catalog ? "#25282b" : "#535a60",
    roughness: 0.68,
  });
  const frontMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  const backMaterial = catalog
    ? new THREE.MeshStandardMaterial({ roughness: 0.86 })
    : null;
  const front = new THREE.Mesh(
    createCloth(height, profile, catalog, false, false),
    frontMaterial
  );
  const texturedFront = catalog
    ? new THREE.Mesh(
        createCloth(height, profile, true, false),
        new THREE.MeshStandardMaterial({
          roughness: 0.86,
          shadowSide: THREE.DoubleSide,
        })
      )
    : null;
  const back =
    backMaterial &&
    new THREE.Mesh(createCloth(height, profile, true, true), backMaterial);
  const mast = new THREE.Mesh(createMast(height, profile), mastMaterial);
  const collarHeight = Math.min(height * 0.08, 0.14);
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(
      profile.radius,
      profile.radius * 1.65,
      collarHeight,
      10
    ),
    finish
  );
  collar.position.y = collarHeight / 2;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(profile.tipRadius, 8, 6),
    mastMaterial
  );
  cap.position.set(profile.leadingEdge(profile.mastTop), profile.mastTop, 0);
  const cloth = [front, texturedFront, back];
  const meshes = [mast, collar, cap, ...cloth];
  for (const mesh of meshes) {
    if (!mesh) continue;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  group.add(mast, collar, cap, front);
  if (back) back.castShadow = false;

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  }
  const mixed = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  const phase = ((mixed >>> 0) % 997) * ((2 * Math.PI) / 997);

  return {
    group,
    setSelected(selected: boolean) {
      const emissive = selected ? "#60a5fa" : "#000000";
      for (const mesh of cloth) {
        mesh?.material.emissive.set(emissive);
        if (mesh) mesh.material.emissiveIntensity = selected ? 0.18 : 0;
      }
      mastMaterial.emissive.set(emissive);
      mastMaterial.emissiveIntensity = selected ? 0.14 : 0;
    },
    setTextures(textures: FlagTextures | null) {
      if (texturedFront && back && backMaterial) {
        if (textures) {
          group.remove(front);
          group.add(texturedFront, back);
        } else {
          group.remove(texturedFront, back);
          group.add(front);
        }
        for (const [material, texture] of [
          [texturedFront.material, textures?.front],
          [backMaterial, textures?.back],
        ] as const) {
          const map = texture ?? null;
          if (material.map !== map) {
            material.map = map;
            material.alphaTest = map ? ALPHA_CUTOFF : 0;
            material.needsUpdate = true;
          }
        }
      }
    },
    setTime(seconds: number | null) {
      const angle =
        seconds === null
          ? 0
          : seconds * 2.1 + phase + 0.28 * Math.sin(seconds * 0.84 + phase);
      const cosine = seconds === null ? 0 : Math.cos(angle);
      const sine = seconds === null ? 0 : Math.sin(angle);
      for (const mesh of cloth) {
        if (!mesh?.morphTargetInfluences) continue;
        mesh.morphTargetInfluences[0] = cosine;
        mesh.morphTargetInfluences[1] = sine;
      }
    },
    dispose() {
      for (const mesh of meshes) {
        mesh?.geometry.dispose();
      }
      for (const material of [
        mastMaterial,
        finish,
        frontMaterial,
        texturedFront && texturedFront.material,
        backMaterial,
      ]) {
        if (material) material.dispose();
      }
    },
  };
}
