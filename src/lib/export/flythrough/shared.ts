import * as THREE from "three";

export function makeMat(color: string, emissiveIntensity = 0.08) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity,
    roughness: 0.4,
    metalness: 0.05,
  });
}

export function addBox(
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

export function addCylinder(
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

export function addPipeBetween(
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

export function getGateLadderYawRadians(rotation: number) {
  return (-(rotation + 180) * Math.PI) / 180;
}

// ---------------------------------------------------------------------------
// Texture helpers (shared across gate, ladder, flag)
// ---------------------------------------------------------------------------

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, Promise<THREE.Texture>>();
const sharedTextureCacheEntries = new WeakSet<THREE.Texture>();

export function isSharedFlythroughTexture(texture: THREE.Texture) {
  return sharedTextureCacheEntries.has(texture);
}

export function loadTexture(path: string): Promise<THREE.Texture> {
  const cached = textureCache.get(path);
  if (cached) return cached;

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        sharedTextureCacheEntries.add(texture);
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

export function cloneTextureForPanel(
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

export async function loadPanelTextures(textures: {
  left: string;
  right: string;
  top?: string | null;
}) {
  const [left, right, top] = await Promise.all([
    loadTexture(textures.left),
    loadTexture(textures.right),
    textures.top ? loadTexture(textures.top) : Promise.resolve(null),
  ]);
  return { left, right, top };
}

export function addPanelTexturePlane(
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
