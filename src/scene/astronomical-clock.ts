import * as THREE from 'three';
import type { SceneMode } from './scene-types';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createFateTheatre, type TheatreFigure } from './fate-theatre.ts';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createZodiacCrystals } from './zodiac-crystals.ts';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createClockMotion } from './clock-motion.ts';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { FRAME, CRYSTAL_TRACK_RATIO } from './frame-layout.ts';

const TAU = Math.PI * 2;
function painted(size: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) draw(context);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  return result;
}


/** A genuinely open frame: all metal is restricted to the narrow outer annulus. */
export function createAstronomicalClock(low: boolean) {
  const group = new THREE.Group();
  group.name = 'astronomical-outer-frame';
  const ellipse = new THREE.Group();
  // The scaled chapter relief must physically sit behind the standing medallions.
  // Its nearest boss is < .192 world units deep, leaving a gap behind badge faces.
  ellipse.position.z = -0.20;
  group.add(ellipse);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const tex = (texture: THREE.Texture) => { textures.push(texture); return texture; };
  const geo = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const mat = <T extends THREE.Material>(m: T) => { materials.push(m); return m; };
  const bronze = mat(new THREE.MeshStandardMaterial({ color: '#8e6b3f', metalness: 0.58, roughness: 0.44, emissive: '#443019', emissiveIntensity: 0.12, transparent: true, opacity: 0.92, depthWrite: false }));
  const brass = mat(new THREE.MeshStandardMaterial({ color: '#c4a46b', metalness: 0.52, roughness: 0.32, emissive: '#876035', emissiveIntensity: 0.13, transparent: true, opacity: 0.94, depthWrite: false }));
  const enamel = mat(new THREE.MeshStandardMaterial({ color: '#14243a', metalness: 0.25, roughness: 0.4, transparent: true, opacity: 0.96, depthWrite: false }));
  const segments = low ? 144 : 256;
  const plateShape = new THREE.Shape(); plateShape.absarc(0, 0, 1.012, 0, TAU, false);
  const hole = new THREE.Path(); hole.absarc(0, 0, 0.932, 0, TAU, true); plateShape.holes.push(hole);
  const plate = new THREE.Mesh(geo(new THREE.ExtrudeGeometry(plateShape, { depth: 0.012, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.003, bevelThickness: 0.002, curveSegments: low ? 64 : 112 })), bronze);
  plate.name = 'bronze-annular-case'; ellipse.add(plate);
  const ring = (radius: number, thickness: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(geo(new THREE.TorusGeometry(radius, thickness, low ? 4 : 6, segments)), material);
    mesh.position.z = z; ellipse.add(mesh); return mesh;
  };
  ring(0.930, 0.003, 0.012, brass);
  ring(1.011, 0.004, 0.013, brass);
  ring(0.939, 0.0015, 0.016, brass);
  ring(0.982, 0.0015, 0.018, bronze);
  const recess = new THREE.Mesh(geo(new THREE.RingGeometry(0.943, 1.001, segments)), enamel);
  recess.name = 'blue-enamel-chapter'; recess.position.z = 0.014; ellipse.add(recess);
  const ticks = new THREE.Group(); ticks.name = 'outer-clock-ticks'; ellipse.add(ticks);
  const positions: number[] = [];
  for (let i = 0; i < 180; i++) {
    const a = i / 180 * TAU;
    const inner = i % 15 === 0 ? 0.983 : i % 5 === 0 ? 0.99 : 0.996;
    positions.push(Math.sin(a) * inner, Math.cos(a) * inner, 0.02, Math.sin(a) * 1.006, Math.cos(a) * 1.006, 0.02);
  }
  const tickMaterial = mat(new THREE.LineBasicMaterial({ color: '#d2b77e', transparent: true, opacity: 0.72, depthWrite: false }));
  ticks.add(new THREE.LineSegments(geo(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))), tickMaterial));
  const chapterMap = tex(painted(low ? 1024 : 2048, ctx => {
    const size = ctx.canvas.width;
    ctx.translate(size / 2, size / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${size * 0.019}px Georgia`; ctx.fillStyle = '#d4bb87';
    const roman = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    roman.forEach((label, i) => {
      ctx.save(); ctx.rotate((i + 0.5) / 12 * TAU);
      // Numerals occupy the gaps between the twelve fixed medallions.
      ctx.fillText(label, 0, -size * 0.962 / 2.12); ctx.restore();
    });
  }));
  const chapterGeometry = geo(new THREE.RingGeometry(0.942, 0.982, segments));
  const chapterPosition = chapterGeometry.getAttribute('position'); const chapterUv = chapterGeometry.getAttribute('uv');
  for (let i = 0; i < chapterUv.count; i++) chapterUv.setXY(i, chapterPosition.getX(i) / 2.12 + 0.5, chapterPosition.getY(i) / 2.12 + 0.5);
  const chapterMaterial = mat(new THREE.MeshBasicMaterial({ map: chapterMap, transparent: true, opacity: 0.78, depthWrite: false }));
  const chapter = new THREE.Mesh(chapterGeometry, chapterMaterial); chapter.position.z = 0.02; chapter.name = 'roman-chapter-ring'; ellipse.add(chapter);
  const teeth = new THREE.Group(); teeth.name = 'outer-clock-teeth'; ellipse.add(teeth);
  const toothGeometry = geo(new THREE.BoxGeometry(0.004, 0.014, 0.008));
  const toothCount = low ? 72 : 120;
  const toothInstances = new THREE.InstancedMesh(toothGeometry, bronze, toothCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < toothCount; i++) {
    const a = i / toothCount * TAU;
    dummy.position.set(Math.sin(a) * 1.026, Math.cos(a) * 1.026, 0.004); dummy.rotation.z = -a;
    dummy.updateMatrix(); toothInstances.setMatrixAt(i, dummy.matrix);
  }
  teeth.add(toothInstances);
  // Day/night bosses are small peripheral details. There are no hands, hubs or spokes.
  const solar = new THREE.Group(); solar.name = 'peripheral-sun';
  const lunar = new THREE.Group(); lunar.name = 'peripheral-moon';
  for (const [object, angle] of [[solar, 0.19], [lunar, Math.PI + 0.19]] as const) {
    object.position.set(Math.sin(angle) * 0.967, Math.cos(angle) * 0.967, 0.025); ellipse.add(object);
  }
  solar.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.012, 12, 8)), brass));
  const rays: number[] = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; rays.push(Math.sin(a) * 0.016, Math.cos(a) * 0.016, 0, Math.sin(a) * 0.022, Math.cos(a) * 0.022, 0); }
  solar.add(new THREE.LineSegments(geo(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rays, 3))), tickMaterial));
  const moonMaterial = mat(new THREE.MeshStandardMaterial({ color: '#9da9b6', metalness: 0.48, roughness: 0.38, transparent: true, opacity: 0.78, depthWrite: false }));
  lunar.add(new THREE.Mesh(geo(new THREE.SphereGeometry(0.017, 16, 8, 0, Math.PI)), moonMaterial));
  const theatre = createFateTheatre(low);
  const crystals = createZodiacCrystals(low);
  group.add(theatre.group, crystals.group);
  const starMap = tex(painted(64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.12, '#ffffffaa'); g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  }));
  const starCross = tex(painted(64, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(32, 1); ctx.lineTo(35, 28); ctx.lineTo(63, 32); ctx.lineTo(35, 35); ctx.lineTo(32, 63); ctx.lineTo(29, 35); ctx.lineTo(1, 32); ctx.lineTo(29, 29); ctx.closePath(); ctx.fill();
  }));
  const makeStars = (count: number, map: THREE.Texture, size: number, depth: number) => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const rand = (seed: number) => { const n = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return n - Math.floor(n); };
      const a = rand(i + 1) * TAU;
      const radius = 1.3 + Math.sqrt(rand(i + 4001)) * 13;
      positions.set([Math.cos(a) * radius, Math.sin(a) * radius * 0.73, depth - (i % 13) * 0.24], i * 3);
      // The idle title sits left of the clock; keep the brightest stars on its right.
      const titleMask = positions[i * 3] < -3 ? 0.28 : 1;
      const brightness = (0.55 + (i % 7) / 14) * titleMask;
      colors.set([brightness * 0.88, brightness * 0.93, brightness], i * 3);
    }
    const geometry = geo(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = mat(new THREE.PointsMaterial({ map, color: '#d6e0f2', vertexColors: true, size, transparent: true, opacity: 0.87, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    const points = new THREE.Points(geometry, material); group.add(points); return points;
  };
  const farStars = makeStars(low ? 650 : 2200, starMap, 0.16, -4);
  const midStars = makeStars(low ? 32 : 80, starCross, 0.42, -0.8);
  midStars.material.color.set('#ead7b4');
  const midBaseColors = (midStars.geometry.getAttribute('color').array as Float32Array).slice();

  let starTime = 0;
  const motion = createClockMotion();
  let disposed = false;
  let layoutNarrow: boolean | undefined;
  return {
    group,
    installZodiacAtlas(texture: THREE.Texture) { return crystals.installAtlas(texture); },
    getFigureBounds() { return theatre.getFigureBounds(); },
    installTheatreFigure(name: TheatreFigure, texture: THREE.Texture) {
      if (disposed) { texture.dispose(); return false; }
      return theatre.installFigure(name, texture);
    },
    installTheatreFigureBack(name: TheatreFigure, texture: THREE.Texture) {
      if (disposed) { texture.dispose(); return false; }
      return theatre.installFigureBack(name, texture);
    },
    update(dt: number, mode: SceneMode, activeIndex: number, _drawnCount: number, reduced: boolean, narrow: boolean, handOffset = 0) {
      if (disposed) return;
      const axes = narrow ? FRAME.mobile : FRAME.desktop;
      if (layoutNarrow !== narrow) {
        ellipse.scale.set(axes.x, axes.y, Math.min(axes.x, axes.y));
        crystals.setLayout(axes.x * CRYSTAL_TRACK_RATIO, axes.y * CRYSTAL_TRACK_RATIO);
        layoutNarrow = narrow;
      }
      const { angle, energy } = motion.update(dt, mode, activeIndex, handOffset, reduced);
      ticks.rotation.z = angle;
      teeth.rotation.z = angle;
      if (!reduced) starTime += Math.max(0, Math.min(dt, 0.05));
      farStars.rotation.z = -starTime * 0.002;
      midStars.rotation.z = starTime * 0.006;
      const starColors = midStars.geometry.getAttribute('color');
      for (let i = 0; i < starColors.count; i++) {
        const twinkle = reduced ? 0.85 : 0.66 + Math.pow(Math.sin(starTime * (0.6 + i % 4 * 0.17) + i * 1.73), 2) * 0.34;
        starColors.setXYZ(i, midBaseColors[i * 3] * twinkle, midBaseColors[i * 3 + 1] * twinkle, midBaseColors[i * 3 + 2] * twinkle);
      }
      starColors.needsUpdate = true;
      const focus = mode === 'revealing' || mode === 'result';
      midStars.material.opacity = focus ? 0.64 : 0.94;
      const metalStrength = focus ? 0.24 : 1;
      bronze.opacity = 0.92 * metalStrength; brass.opacity = 0.94 * metalStrength;
      enamel.opacity = 0.96 * metalStrength; chapterMaterial.opacity = 0.78 * metalStrength;
      tickMaterial.opacity = 0.72 * metalStrength; moonMaterial.opacity = 0.78 * metalStrength;
      brass.emissiveIntensity = 0.13 + (reduced || focus ? 0 : energy * 0.12);
      // Preserve the clock angle for callers attaching brief card-edge effects.
      group.userData.motionEnergy = reduced || focus ? 0 : energy;
      group.userData.clockAngle = angle;
      theatre.update(dt, mode, angle, reduced, narrow);
      theatre.group.position.set(0, 0.15, 0);
      theatre.group.scale.setScalar(narrow ? 0.86 : 0.90);
      crystals.update(dt, angle, energy, reduced, focus);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      theatre.dispose(); crystals.dispose(); group.removeFromParent(); group.clear();
    },
  };
}
