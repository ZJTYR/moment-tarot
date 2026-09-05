import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

type Point = readonly [number, number];
type Stroke = { points: Point[]; closed?: boolean; straight?: boolean };
const TAU = Math.PI * 2;
export const ZODIAC_CRYSTAL_RADIUS = 0.40;
export const ZODIAC_MEDALLION_RADIUS = ZODIAC_CRYSTAL_RADIUS;
export const ZODIAC_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;
const line = (...points: Point[]): Stroke => ({ points, straight: true });
const curve = (...points: Point[]): Stroke => ({ points });
const circle = (x: number, y: number, r: number): Stroke => ({
  points: Array.from({ length: 16 }, (_, i) => [x + Math.cos(i / 16 * TAU) * r, y + Math.sin(i / 16 * TAU) * r] as Point), closed: true,
});

/** Hand-drawn traditional glyphs, used only as distinct bronze placeholders while the relief atlas loads. */
function strokes(index: number): Stroke[] {
  switch (index) {
    case 0: return [ // Aries: two curled horns joining the central stem.
      curve([0, -0.9], [0, 0.15], [-0.28, 0.8], [-0.72, 0.86], [-0.92, 0.48], [-0.62, 0.22]),
      curve([0, 0.15], [0.28, 0.8], [0.72, 0.86], [0.92, 0.48], [0.62, 0.22]),
    ];
    case 1: return [circle(0, -0.3, 0.58), curve([-0.85, 0.92], [-0.62, 0.36], [0, 0.28], [0.62, 0.36], [0.85, 0.92])];
    case 2: return [line([-0.48, -0.8], [-0.48, 0.8]), line([0.48, -0.8], [0.48, 0.8]), curve([-0.88, 0.92], [0, 0.76], [0.88, 0.92]), curve([-0.88, -0.92], [0, -0.76], [0.88, -0.92])];
    case 3: return [circle(-0.55, 0.36, 0.25), circle(0.55, -0.36, 0.25), curve([-0.8, 0.38], [-0.63, 0.75], [0, 0.85], [0.8, 0.55]), curve([0.8, -0.38], [0.63, -0.75], [0, -0.85], [-0.8, -0.55])];
    case 4: return [circle(-0.57, -0.33, 0.3), curve([-0.37, -0.1], [-0.5, 0.45], [-0.25, 0.89], [0.3, 0.84], [0.51, 0.35], [0.26, -0.38], [0.49, -0.8], [0.85, -0.6])];
    case 5: return [ // Virgo: folded m and an inward loop.
      line([-0.86, -0.72], [-0.86, 0.72]), curve([-0.86, 0.48], [-0.55, 0.78], [-0.31, 0.48], [-0.31, -0.64]),
      curve([-0.31, 0.48], [0.02, 0.78], [0.25, 0.48], [0.25, -0.48], [0.74, -0.86]),
      curve([0.25, 0.1], [0.7, 0.52], [0.88, 0.15], [0.62, -0.43], [0.02, -0.8]),
    ];
    case 6: return [ // Libra: beam, hanging pans, upright and foot.
      line([0, -0.78], [0, 0.8]), line([-0.9, 0.42], [0, 0.56], [0.9, 0.42]), line([-0.5, -0.84], [0.5, -0.84]),
      line([-0.65, 0.46], [-0.98, -0.22], [-0.32, -0.22], [-0.65, 0.46]),
      curve([-0.98, -0.22], [-0.65, -0.43], [-0.32, -0.22]),
      line([0.65, 0.46], [0.32, -0.22], [0.98, -0.22], [0.65, 0.46]),
      curve([0.32, -0.22], [0.65, -0.43], [0.98, -0.22]),
    ];
    case 7: return [line([-0.86, -0.72], [-0.86, 0.72]), curve([-0.86, 0.48], [-0.55, 0.78], [-0.3, 0.48], [-0.3, -0.68]), curve([-0.3, 0.48], [0.02, 0.78], [0.25, 0.48], [0.25, -0.56], [0.55, -0.73], [0.93, -0.32]), line([0.5, -0.35], [0.93, -0.32], [0.9, -0.74])];
    case 8: return [line([-0.8, -0.8], [0.8, 0.8]), line([0.08, 0.8], [0.8, 0.8], [0.8, 0.08]), line([-0.64, 0.12], [0.12, -0.64])];
    case 9: return [curve([-0.92, 0.65], [-0.7, 0.8], [-0.44, 0.3], [-0.32, -0.55]), curve([-0.44, 0.3], [-0.1, 0.74], [0.2, 0.65], [0.17, -0.21], [0.48, -0.69], [0.89, -0.4], [0.7, -0.12], [0.17, -0.21], [-0.03, -0.85])];
    case 10: return [line([-0.94, 0.18], [-0.5, 0.55], [-0.06, 0.18], [0.39, 0.55], [0.94, 0.18]), line([-0.94, -0.5], [-0.5, -0.13], [-0.06, -0.5], [0.39, -0.13], [0.94, -0.5])];
    default: return [ // Pisces: two opposing fish with a fine connecting current.
      { points: [[-0.34, 0.74], [-0.76, 0.35], [-0.78, -0.22], [-0.4, -0.58], [-0.24, 0], [-0.34, 0.74]], closed: true },
      line([-0.4, -0.58], [-0.77, -0.94], [-0.12, -0.89], [-0.4, -0.58]),
      { points: [[0.34, -0.74], [0.76, -0.35], [0.78, 0.22], [0.4, 0.58], [0.24, 0], [0.34, -0.74]], closed: true },
      line([0.4, 0.58], [0.77, 0.94], [0.12, 0.89], [0.4, 0.58]), curve([-0.27, 0], [0, 0.07], [0.27, 0]),
    ];
  }
}

function placeholderGeometry(index: number, low: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  for (const stroke of strokes(index)) {
    const points = stroke.points.map(([x, y]) => new THREE.Vector3(x, y, 0));
    if (stroke.straight) {
      for (let i = 1; i < points.length; i++) {
        parts.push(new THREE.TubeGeometry(new THREE.LineCurve3(points[i - 1], points[i]), 1, 0.115, low ? 4 : 5, false));
      }
    } else {
      const path = new THREE.CatmullRomCurve3(points, stroke.closed ?? false, 'centripetal');
      parts.push(new THREE.TubeGeometry(path, low ? 16 : 32, 0.115, low ? 4 : 5, stroke.closed ?? false));
    }
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach(part => part.dispose());
  merged.computeBoundingBox();
  const center = merged.boundingBox!.getCenter(new THREE.Vector3());
  merged.translate(-center.x, -center.y, -center.z);
  merged.computeBoundingSphere();
  const scale = 0.25 / merged.boundingSphere!.radius;
  merged.scale(scale * 0.72, scale * 0.72, scale);
  return merged;
}

/** Bronze relief medallions. The legacy factory name is retained for scene compatibility.
 * Upright centers never rotate. Complete badge, rim and plinth fit a radius-0.40 sphere.
 * One shared atlas, no transparency image tricks, render targets, or per-frame geometry.
 */
export function createZodiacCrystals(low: boolean) {
  const group = new THREE.Group(); group.name = 'zodiac-medallions';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const icons: { group: THREE.Group; bronze: THREE.MeshStandardMaterial; face: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; placeholder?: THREE.Mesh }[] = [];
  let disposed = false;
  let ownedAtlas: THREE.Texture | undefined;
  let strength = 1;
  const segments = low ? 24 : 48;
  const bodyParts: THREE.BufferGeometry[] = [];
  const addPart = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, rotateX = 0) => {
    geometry.rotateX(rotateX); geometry.translate(x, y, z); bodyParts.push(geometry);
  };
  addPart(new THREE.CylinderGeometry(0.247, 0.253, 0.07, segments), 0, 0.065, 0, Math.PI / 2);
  addPart(new THREE.TorusGeometry(0.244, 0.012, 5, segments), 0, 0.065, 0.038);
  addPart(new THREE.CylinderGeometry(0.19, 0.21, 0.045, low ? 8 : 12), 0, -0.303, 0);
  addPart(new THREE.CylinderGeometry(0.105, 0.14, 0.105, low ? 8 : 12), 0, -0.235, 0);
  addPart(new THREE.CylinderGeometry(0.175, 0.12, 0.03, low ? 8 : 12), 0, -0.172, 0);
  const body = mergeGeometries(bodyParts)!; bodyParts.forEach(part => part.dispose()); geometries.add(body);
  for (let i = 0; i < 12; i++) {
    const icon = new THREE.Group(); icon.name = `zodiac-${ZODIAC_NAMES[i].toLowerCase()}`;
    icon.userData.maxRadius = ZODIAC_MEDALLION_RADIUS;
    const bronze = new THREE.MeshStandardMaterial({ color: '#a88b5b', metalness: 0.48, roughness: 0.4,
      emissive: '#76552d', emissiveIntensity: 0.1, transparent: true, opacity: 1, depthWrite: true });
    materials.add(bronze); icon.add(new THREE.Mesh(body, bronze));
    const blank = new THREE.CircleGeometry(0.232, segments); geometries.add(blank);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: '#413321', metalness: 0.2, roughness: 0.62, transparent: true, opacity: 1, depthWrite: true });
    materials.add(faceMaterial);
    const face = new THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>(blank, faceMaterial);
    face.name = `relief-${ZODIAC_NAMES[i].toLowerCase()}`; face.position.set(0, 0.065, 0.039); icon.add(face);
    const fallback = placeholderGeometry(i, low); geometries.add(fallback);
    const placeholder = new THREE.Mesh(fallback, bronze); placeholder.position.set(0, 0.065, 0.05); icon.add(placeholder);
    icons.push({ group: icon, bronze, face, placeholder }); group.add(icon);
  }
  const setLayout = (radiusX: number, radiusY: number) => {
    if (disposed || !Number.isFinite(radiusX) || !Number.isFinite(radiusY) || radiusX <= 0 || radiusY <= 0) return;
    icons.forEach((icon, i) => icon.group.position.set(Math.sin(i / 12 * TAU) * radiusX, Math.cos(i / 12 * TAU) * radiusY, 0));
  };
  setLayout(4.55 * 0.99, 4.55 * 0.99);
  return {
    group, setLayout,
    /** Transfers atlas ownership. Crop UVs share a single GPU texture across all faces. */
    installAtlas(atlas: THREE.Texture) {
      if (disposed) { atlas.dispose(); return false; }
      if (atlas === ownedAtlas) return true;
      const image = atlas.image as HTMLImageElement | undefined;
      if (!image || image.width !== 1024 || image.height !== 1536) { atlas.dispose(); return false; }
      let pixels: Uint8ClampedArray | undefined;
      try {
        const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1536;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) { ctx.drawImage(image, 0, 0); pixels = ctx.getImageData(0, 0, 1024, 1536).data; }
      } catch { /* A convex face and bump map remain available if pixel readback is unavailable. */ }
      atlas.colorSpace = THREE.SRGBColorSpace;
      atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
      icons.forEach((icon, i) => {
        const cx = [176, 512, 848][i % 3]; const cy = [210, 560, 902, 1246][Math.floor(i / 3)];
        const rings = low ? 8 : 18; const sectors = low ? 32 : 64;
        const positions: number[] = []; const uv: number[] = []; const indices: number[] = [];
        for (let ring = 0; ring <= rings; ring++) for (let sector = 0; sector <= sectors; sector++) {
          const r = ring / rings; const angle = sector / sectors * TAU;
          const x = Math.cos(angle) * r; const y = Math.sin(angle) * r;
          const px = cx + x * 158; const py = cy - y * 158;
          const at = (Math.round(py) * 1024 + Math.round(px)) * 4;
          const luminance = pixels ? (pixels[at] * 0.2126 + pixels[at + 1] * 0.7152 + pixels[at + 2] * 0.0722) / 255 : 0.4;
          // Low-amplitude relief follows the inspected artwork, with a real convex bronze face.
          positions.push(x * 0.232, y * 0.232, (1 - r * r) * (0.013 + luminance * 0.022));
          uv.push(px / 1024, 1 - py / 1536);
          if (ring < rings && sector < sectors) {
            const a = ring * (sectors + 1) + sector; const b = a + sectors + 1;
            indices.push(a, b, a + 1, a + 1, b, b + 1);
          }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometries.add(geometry);
        icon.face.geometry.dispose(); geometries.delete(icon.face.geometry); icon.face.geometry = geometry;
        if (icon.placeholder) {
          icon.placeholder.removeFromParent(); icon.placeholder.geometry.dispose(); geometries.delete(icon.placeholder.geometry); icon.placeholder = undefined;
        }
        Object.assign(icon.face.material, { map: atlas, bumpMap: low ? null : atlas, bumpScale: 0.016,
          color: new THREE.Color('#d2bd99'), emissive: new THREE.Color('#a78959'), emissiveMap: atlas, emissiveIntensity: 0.14, metalness: 0.22, roughness: 0.65 });
        icon.face.material.needsUpdate = true;
      });
      ownedAtlas?.dispose(); ownedAtlas = atlas;
      return true;
    },
    update(dt: number, clockAngle: number, energy: number, reduced: boolean, focus: boolean) {
      if (disposed) return;
      const elapsed = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.05) : 0;
      strength = THREE.MathUtils.lerp(strength, focus ? 0.22 : 1, reduced ? 1 : -Math.expm1(-elapsed * 7));
      const activity = Number.isFinite(energy) ? THREE.MathUtils.clamp(energy, 0, 1) : 0;
      const angle = Number.isFinite(clockAngle) ? clockAngle : 0;
      icons.forEach((icon, i) => {
        const sweep = reduced || focus ? 0 : Math.pow(Math.max(0, Math.cos(i / 12 * TAU + angle)), 16) * activity;
        icon.bronze.opacity = icon.face.material.opacity = strength;
        icon.bronze.emissiveIntensity = (0.1 + sweep * 0.15) * strength;
        icon.face.material.emissiveIntensity = (0.14 + sweep * 0.08) * strength;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true; group.removeFromParent(); group.clear(); icons.length = 0;
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); ownedAtlas?.dispose(); ownedAtlas = undefined;
      geometries.clear(); materials.clear();
    },
  };
}
