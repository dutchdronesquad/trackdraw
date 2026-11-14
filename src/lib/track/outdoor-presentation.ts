import * as THREE from "three";

export type OutdoorQuality = "full" | "low";

const OUTDOOR_HORIZON = "#c2d7e0";
const SUN = new THREE.Vector3(-0.59, 0.65, 0.48).normalize();

function random(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function grassTexture(quality: OutdoorQuality, extent: number) {
  const size = quality === "full" ? 256 : 128;
  const next = random(1064);
  const data = new Uint8Array(size * size * 4);
  const layers = [4, 16, 32].map((period) => ({
    period,
    values: Array.from({ length: period ** 2 }, next),
  }));
  const sample = (x: number, y: number, layer: (typeof layers)[number]) => {
    const { period, values } = layer;
    const u = (x * period) / size;
    const v = (y * period) / size;
    const i = Math.floor(u);
    const j = Math.floor(v);
    const blend = (t: number) => t * t * (3 - 2 * t);
    const at = (a: number, b: number) =>
      values[(a % period) + (b % period) * period];
    const s = blend(u - i);
    const t = blend(v - j);
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(at(i, j), at(i + 1, j), s),
      THREE.MathUtils.lerp(at(i, j + 1), at(i + 1, j + 1), s),
      t
    );
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const patch = sample(x, y, layers[0]);
      const grain =
        sample(x, y, layers[1]) * 13 +
        sample(x, y, layers[2]) * 9 +
        next() * 13 -
        17;
      const mowing = Math.cos((y / size) * 8 * Math.PI) * 2.8;
      const i = (y * size + x) * 4;
      data[i] = 102 + patch * 28 + grain + mowing;
      data[i + 1] = 119 + patch * 20 + grain + mowing;
      data[i + 2] = 66 + patch * 12 + grain + mowing;
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = quality === "full" ? 4 : 1;
  texture.repeat.setScalar(extent / 24);
  texture.needsUpdate = true;
  return texture;
}

function sky() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        horizon: { value: new THREE.Color(OUTDOOR_HORIZON) },
        zenith: { value: new THREE.Color("#438dc4") },
        sunDirection: { value: SUN },
      },
      vertexShader: `
        varying vec3 direction;
        void main() {
          direction = position;
          vec4 clip = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
          gl_Position = clip.xyww;
        }
      `,
      fragmentShader: `
        varying vec3 direction;
        uniform vec3 horizon;
        uniform vec3 zenith;
        uniform vec3 sunDirection;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
                     mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
        }
        void main() {
          vec3 ray = normalize(direction);
          float h = max(0.0, ray.y);
          vec3 color = mix(horizon, zenith, pow(h, 0.57));
          vec2 p = ray.xz / max(h + 0.15, 0.15) * 4.0 + vec2(3.2, 1.7);
          float clouds = noise(p) * 0.56 + noise(p * 2.1) * 0.28 + noise(p * 4.3) * 0.16;
          color = mix(color, vec3(0.94, 0.96, 1.0),
                      smoothstep(0.56, 0.76, clouds) * smoothstep(0.025, 0.22, h) * 0.76);
          float sun = max(dot(ray, sunDirection), 0.0);
          color += vec3(1.0, 0.78, 0.49) *
                   (pow(sun, 20.0) * 0.14 + smoothstep(0.99965, 0.99985, sun) * 1.3);
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}

function addScenery(
  group: THREE.Group,
  width: number,
  height: number,
  span: number,
  quality: OutdoorQuality
) {
  const total = 72;
  const stride = quality === "full" ? 1 : 3;
  const count = total / stride;
  const next = random(42107);
  const standard = (color: string) =>
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const crowns = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, quality === "full" ? 1 : 0),
    standard("#ffffff"),
    count * 2
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.2, 1, 5),
    standard("#685746"),
    count
  );
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < total; i++) {
    const index = i / stride;
    const keep = i % stride === 0;
    const angle = (i / total) * Math.PI * 2 + (next() - 0.5) * 0.13;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    // Intersect the ray with the field plus a buffer before adding the treeline.
    const distance =
      Math.min(
        (width / 2 + 18) / Math.abs(dx),
        (height / 2 + 18) / Math.abs(dz)
      ) +
      next() * 30 +
      (i % 3) * 7;
    const x = dx * distance;
    const z = dz * distance;
    const treeHeight = 4 + next() * 6;
    const radius = treeHeight * (0.19 + next() * 0.11);
    transform.position.set(x, treeHeight * 0.28, z);
    transform.scale.set(1, treeHeight * 0.58, 1);
    transform.rotation.set(0, angle, 0);
    transform.updateMatrix();
    if (keep) trunks.setMatrixAt(index, transform.matrix);
    for (let layer = 0; layer < 2; layer++) {
      transform.position.set(
        x + layer * radius * 0.46,
        treeHeight * (0.62 + layer * 0.15),
        z
      );
      transform.scale.set(
        radius * (1 - layer * 0.22),
        treeHeight * 0.32,
        radius
      );
      transform.updateMatrix();

      color.setHSL(
        0.24 + next() * 0.095,
        0.26 + next() * 0.18,
        0.14 + next() * 0.095
      );
      if (keep) {
        crowns.setMatrixAt(index * 2 + layer, transform.matrix);
        crowns.setColorAt(index * 2 + layer, color);
      }
    }
  }
  group.add(trunks, crowns);

  const hills = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 2),
    standard("#637c5e"),
    9
  );
  const distance =
    Math.min(span, 120) * 0.5 + Math.hypot(width, height) / 2 + 80;
  for (let i = 0; i < hills.count; i++) {
    const angle = (i / hills.count) * Math.PI * 2;
    transform.position.set(
      Math.cos(angle) * distance,
      -6,
      Math.sin(angle) * distance
    );
    transform.rotation.set(0, -angle, 0);
    transform.scale.set(24 + next() * 20, 18 + next() * 10, distance * 0.46);
    transform.updateMatrix();
    hills.setMatrixAt(i, transform.matrix);
  }
  group.add(hills);

  const shelter = new THREE.Group();
  shelter.position.set(width / 2 + 10, 0, -height / 2 - 12);
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(7, 2.7, 4),
    standard("#aa9a80")
  );
  wall.position.y = 1.35;
  const roofSection = new THREE.Shape()
    .moveTo(-2.3, 0)
    .lineTo(0, 1.2)
    .lineTo(2.3, 0)
    .closePath();
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofSection, { depth: 7.6, bevelEnabled: false }),
    standard("#485554")
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-3.8, 2.7, 0);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.05, 0.05),
    standard("#554e44")
  );
  door.position.set(-1.7, 1.025, 2.02);
  shelter.add(wall, roof, door);
  group.add(shelter);
}

export function outdoorGroundExtent(width: number, height: number) {
  return Math.max(1600, Math.max(width, height) * 2 + 1000);
}

export function createOutdoorPresentation(
  { width, height }: { width: number; height: number },
  quality: OutdoorQuality
) {
  const span = Math.max(width, height);
  const extent = outdoorGroundExtent(width, height);
  const group = new THREE.Group();
  const landscape = new THREE.Group();
  landscape.position.set(width / 2, 0, height / 2);
  const texture = grassTexture(quality, extent);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(extent, extent),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.018;
  ground.receiveShadow = quality === "full";
  landscape.add(ground);
  addScenery(landscape, width, height, span, quality);

  const sun = new THREE.DirectionalLight("#fff1d9", 2.2);
  const targetDistance = span * 0.75 + 30;
  sun.position.copy(SUN).multiplyScalar(targetDistance);
  if (quality === "full") {
    const bound = Math.hypot(width, height) / 2 + 14;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -bound,
      right: bound,
      top: bound,
      bottom: -bound,
      near: 0.5,
      far: targetDistance + bound * 2,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.00028;
    sun.shadow.normalBias = 0.04;
    sun.shadow.radius = 2.4;
  }
  landscape.add(
    sun,
    sun.target,
    new THREE.HemisphereLight("#cbe6ff", "#7f8052", 1.48)
  );
  group.add(landscape, sky());
  const fog = new THREE.Fog(
    OUTDOOR_HORIZON,
    Math.max(55, span * 0.7),
    Math.max(240, span * 2 + 120)
  );

  return {
    group,
    fog,
    dispose() {
      group.removeFromParent();
      group.traverse((node) => {
        if (
          node instanceof THREE.InstancedMesh ||
          node instanceof THREE.DirectionalLight
        )
          node.dispose();
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          node.material.dispose();
        }
      });
      texture.dispose();
    },
  };
}
