import * as THREE from 'three';
import type { SceneMode } from './scene-types';
// @ts-expect-error Node's native test runner needs the explicit extension.
import { sculptureContains } from './sculpture-outline.ts';

export type TheatreFigure = 'goddess' | 'angel' | 'devil';

/** A carved, closed relief, including its back and silhouette edges. */
function sculptureGeometry(image: CanvasImageSource, height: number, depth: number, low: boolean, asset: string) {
  const canvas = document.createElement('canvas');
  const source = image as HTMLImageElement;
  canvas.width = low ? 104 : 176;
  canvas.height = Math.round(canvas.width * source.height / source.width);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const w = canvas.width; const h = canvas.height;
  const occupied = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    const drawn = sculptureContains(asset, (x + 0.5) / w * 1024, (y + 0.5) / h * 1536);
    const at = (y * w + x) * 4;
    if (drawn !== undefined) {
      // Keep the bronze mesh just inside its bright neutral studio surround.
      const minimum = Math.min(data[at], data[at + 1], data[at + 2]);
      const maximum = Math.max(data[at], data[at + 1], data[at + 2]);
      return drawn && !(asset === 'devil' && minimum > 210 && maximum - minimum < 18);
    }
    return data[at + 3] > 48;
  };
  let left = w; let right = 0; let top = h; let bottom = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (occupied(x, y)) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right <= left || bottom <= top) return null;
  const solid = (x: number, y: number) => occupied(x, y);
  const distance = new Float32Array(w * h);
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    if (solid(x, y)) distance[y * w + x] = 1 + Math.min(x ? distance[y * w + x - 1] : 0, y ? distance[(y - 1) * w + x] : 0);
  }
  for (let y = bottom; y >= top; y--) for (let x = right; x >= left; x--) {
    if (solid(x, y)) distance[y * w + x] = Math.min(distance[y * w + x], 1 + Math.min(x + 1 < w ? distance[y * w + x + 1] : 0, y + 1 < h ? distance[(y + 1) * w + x] : 0));
  }
  const positions: number[] = []; const uvs: number[] = [];
  const front: number[] = []; const back: number[] = []; const edges: number[] = [];
  const span = bottom - top + 1;
  const vertex = (x: number, y: number, reverse: boolean) => {
    const px = Math.min(w - 1, Math.max(0, x)); const py = Math.min(h - 1, Math.max(0, y));
    const d = distance[py * w + px];
    const relief = depth * (0.16 + 0.84 * Math.sin(Math.min(1, d / 7) * Math.PI / 2));
    positions.push((x - (left + right + 1) / 2) / span * height, (bottom + 1 - y) / span * height,
      reverse ? 0 : relief);
    uvs.push(x / w, 1 - y / h);
    return positions.length / 3 - 1;
  };
  const vertices = new Map<string, number>();
  const at = (x: number, y: number, reverse = false) => {
    const key = `${x},${y},${reverse}`;
    let index = vertices.get(key);
    if (index === undefined) { index = vertex(x, y, reverse); vertices.set(key, index); }
    return index;
  };
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    if (!solid(x, y)) continue;
    const a = at(x, y); const b = at(x, y + 1); const c = at(x + 1, y + 1); const d = at(x + 1, y);
    const ar = at(x, y, true); const br = at(x, y + 1, true); const cr = at(x + 1, y + 1, true); const dr = at(x + 1, y, true);
    front.push(a, b, d, b, c, d); back.push(ar, dr, br, br, dr, cr);
    if (!solid(x - 1, y)) edges.push(a, ar, b, b, ar, br);
    if (!solid(x + 1, y)) edges.push(d, c, dr, c, cr, dr);
    if (!solid(x, y - 1)) edges.push(a, d, ar, d, dr, ar);
    if (!solid(x, y + 1)) edges.push(b, br, c, c, br, cr);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex([...front, ...back, ...edges]);
  geometry.addGroup(0, front.length, 0);
  geometry.addGroup(front.length, back.length, 1);
  geometry.addGroup(front.length + back.length, edges.length, 2);
  geometry.computeVertexNormals();
  return { geometry, bounds: new THREE.Vector4(left / w, top / h, (right + 1) / w, (bottom + 1) / h) };
}

/** Three textured, closed bas-reliefs; the outer clock owns all ring geometry. */
export function createFateTheatre(low: boolean) {
  const group = new THREE.Group(); group.name = 'upper-fate-theatre';
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const geo = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value; };
  const mat = <T extends THREE.Material>(value: T) => { materials.add(value); return value; };
  const brass = mat(new THREE.MeshStandardMaterial({ color: '#b7aa89', metalness: 0.45, roughness: 0.56, transparent: true, opacity: 0.72 }));
  const antique = mat(new THREE.MeshStandardMaterial({ color: '#494139', metalness: 0.35, roughness: 0.72, transparent: true, opacity: 0.66 }));
  const bases = new Map<TheatreFigure, THREE.Group>();
  const figures = new Map<TheatreFigure, THREE.Group>();
  const figureMaterials = new Set<THREE.Material>();
  const figureMeshes = new Map<string, THREE.Mesh>();
  const figureTextures = new Map<string, THREE.Texture>();
  const figureConfigs = {
    goddess: { x: 0, y: 1.90, height: 2.0, depth: 0.22, color: '#d2c4a1' },
    angel: { x: -1.5, y: 2.0, height: 1.28, depth: 0.07, color: '#f0eadc' },
    devil: { x: 1.5, y: 2.0, height: 1.28, depth: 0.07, color: '#ad9071' },
  };
  for (const [name, config] of Object.entries(figureConfigs)) {
    const figure = new THREE.Group(); figure.name = `theatre-${name}`;
    figure.position.set(config.x, config.y, 0.08); group.add(figure); figures.set(name as TheatreFigure, figure);
    figure.rotation.y = name === 'angel' ? 0.12 : name === 'devil' ? -0.12 : 0;
    const base = new THREE.Group(); base.position.set(config.x, config.y - 0.045, 0.09); group.add(base);
    bases.set(name as TheatreFigure, base);
    const foot = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.20, 0.24, 0.05, low ? 12 : 24)), antique); base.add(foot);
    const bevel = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.19, 0.21, 0.025, low ? 12 : 24)), brass); bevel.position.y = 0.04; base.add(bevel);
  }
  const initialOpacity = new Map<THREE.Material, number>();
  materials.forEach(material => initialOpacity.set(material, material.opacity));
  const bounds = (['goddess', 'angel', 'devil'] as const).map(() => new THREE.Box3());
  const baseBounds = new THREE.Box3();
  let angle = 0;
  let focused = false;
  let disposed = false;
  const installFigure = (name: TheatreFigure, texture: THREE.Texture, rear: boolean) => {
    if (disposed) { texture.dispose(); return false; }
    const asset = `${name}${rear ? '-back' : ''}`;
    if (figureTextures.get(asset) === texture) return true;
    const config = figureConfigs[name];
    let sculpture: ReturnType<typeof sculptureGeometry>;
    try { sculpture = sculptureGeometry(texture.image, config.height, config.depth, low, asset); }
    catch { texture.dispose(); return false; }
    if (!sculpture) { texture.dispose(); return false; }
    const old = figureMeshes.get(asset);
    if (old) {
      old.removeFromParent(); old.geometry.dispose(); geometries.delete(old.geometry);
      for (const material of Array.isArray(old.material) ? old.material : [old.material]) {
        material.dispose(); materials.delete(material); figureMaterials.delete(material);
      }
      const oldTexture = figureTextures.get(asset);
      if (oldTexture) { oldTexture.dispose(); textures.delete(oldTexture); }
    }
    texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture); figureTextures.set(asset, texture);
    // The bronze artwork already contains dark shading. Avoid multiplying it by
    // another dark tint; a texture-mapped fill preserves its carved details.
    const face = mat(new THREE.MeshStandardMaterial({
      map: texture, color: name === 'devil' ? '#dac7ad' : config.color,
      emissiveMap: name === 'devil' ? texture : null,
      emissive: name === 'devil' ? '#b39778' : '#000000',
      emissiveIntensity: name === 'devil' ? 0.3 : 0,
      metalness: 0.1, roughness: 0.85, transparent: true,
      opacity: focused ? 0.14 : 0.88, alphaTest: 0.15,
    }));
    const interior = mat(new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.45, roughness: 0.66, transparent: true, opacity: focused ? 0.14 : 0.88 }));
    const edge = mat(interior.clone()); edge.color.multiplyScalar(name === 'goddess' ? 0.76 : 0.6); edge.metalness = 0.24; edge.roughness = 0.7;
    interior.visible = !rear && !figureMeshes.has(`${name}-back`);
    for (const material of [face, interior, edge]) figureMaterials.add(material);
    const mesh = new THREE.Mesh(geo(sculpture.geometry), [face, interior, edge]);
    if (rear) {
      mesh.rotation.y = Math.PI;
      const front = figureMeshes.get(name);
      if (front) (front.material as THREE.Material[])[1].visible = false;
    }
    figures.get(name)!.add(mesh); figureMeshes.set(asset, mesh);
    return true;
  };
  return {
    group,
    /** Three reusable world-space boxes, each including its separate plinth. Read, do not mutate. */
    getFigureBounds() {
      if (disposed) return [];
      group.updateWorldMatrix(true, true);
      (['goddess', 'angel', 'devil'] as const).forEach((name, index) => {
        const figure = figures.get(name)!; const config = figureConfigs[name];
        const box = bounds[index];
        if (figure.children.length) box.setFromObject(figure);
        else {
          const halfWidth = name === 'goddess' ? 0.65 : 0.4;
          box.min.set(-halfWidth, 0, -config.depth); box.max.set(halfWidth, config.height, config.depth);
          box.applyMatrix4(figure.matrixWorld);
        }
        baseBounds.setFromObject(bases.get(name)!); box.union(baseBounds);
      });
      return bounds;
    },
    installFigure(name: TheatreFigure, texture: THREE.Texture) { return installFigure(name, texture, false); },
    installFigureBack(name: TheatreFigure, texture: THREE.Texture) { return installFigure(name, texture, true); },
    update(dt: number, mode: SceneMode, clockAngle: number, reduced: boolean, narrow: boolean) {
      if (disposed) return;
      const elapsed = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
      focused = mode === 'revealing' || mode === 'result';
      // Clock motion already owns inertia. Use its continuous angle directly,
      // keeping the head upright and the closed double relief readable from either side.
      if (!reduced && Number.isFinite(clockAngle)) angle = clockAngle;
      figures.get('goddess')!.rotation.y = angle;
      for (const name of ['angel', 'devil'] as const) {
        const x = (name === 'angel' ? -1 : 1) * (narrow ? 1.1 : 1.5);
        figures.get(name)!.position.x = x;
        bases.get(name)!.position.x = x;
      }
      const ease = reduced ? 1 : 1 - Math.exp(-elapsed * 6);
      initialOpacity.forEach((base, material) => { material.opacity = THREE.MathUtils.lerp(material.opacity, base * (focused ? 0.18 : 1), ease); });
      figureMaterials.forEach(material => { material.opacity = THREE.MathUtils.lerp(material.opacity, focused ? 0.14 : 0.88, ease); });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(value => value.dispose()); materials.forEach(value => value.dispose()); textures.forEach(value => value.dispose());
      group.removeFromParent(); group.clear();
      geometries.clear(); materials.clear(); textures.clear();
      figures.clear(); bases.clear(); figureMeshes.clear(); figureTextures.clear(); figureMaterials.clear(); initialOpacity.clear();
    },
  };
}
