import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import * as THREE from 'three';
// @ts-expect-error Node's native TypeScript runner needs the explicit extension.
import { createAstronomicalClock } from './astronomical-clock.ts';

// The clock's motion uses real Three objects. Only decorative canvas paint is stubbed;
// browser screenshots separately verify the rendered artwork and composition.
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalPath = Object.getOwnPropertyDescriptor(globalThis, 'Path2D');
before(() => {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement() {
      const canvas = { width: 0, height: 0, getContext: () => context };
      const context = new Proxy({ canvas, createRadialGradient: () => ({ addColorStop() {} }) }, {
        get(target, key) { return Reflect.get(target, key) ?? (() => {}); },
      });
      return canvas;
    },
  } });
  Object.defineProperty(globalThis, 'Path2D', { configurable: true, value: class {} });
});
after(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
  if (originalPath) Object.defineProperty(globalThis, 'Path2D', originalPath);
  else Reflect.deleteProperty(globalThis, 'Path2D');
});

void test('both browse directions rotate the outer ticks and teeth together; the frame stays open', () => {
  const clock = createAstronomicalClock(true);
  try {
    const ticks = clock.group.getObjectByName('outer-clock-ticks')!;
    const teeth = clock.group.getObjectByName('outer-clock-teeth')!;
    assert.ok(ticks && teeth);
    clock.update(1 / 60, 'spread', 0, 0, false, false);
    const starLayers = clock.group.children.filter(child => child instanceof THREE.Points);
    assert.deepEqual(starLayers.map(stars => stars.geometry.getAttribute('position').count), [650, 32], 'keep the existing low-quality far and mid star density');
    let previous = 0;
    for (const index of [1, 0, 21, 0]) {
      for (let i = 0; i < 180; i++) clock.update(1 / 60, 'spread', index, 0, false, false);
      assert.ok(ticks.rotation.z < previous - 0.3);
      assert.equal(teeth.rotation.z, ticks.rotation.z);
      previous = ticks.rotation.z;
    }
    assert.ok(clock.group.getObjectByName('zodiac-medallions'));
    assert.ok(clock.group.getObjectByName('roman-chapter-ring'));
    assert.equal(clock.getFigureBounds().length, 3);
    assert.equal(clock.group.getObjectByName('fortuna-wheel'), undefined);
    // Inspect every vertex of the actual annular frame, including teeth and ticks.
    const ellipse = ticks.parent!;
    ellipse.updateWorldMatrix(true, true);
    const point = new THREE.Vector3();
    ellipse.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      const position = object.geometry.getAttribute('position');
      const instance = new THREE.Matrix4();
      const count = object instanceof THREE.InstancedMesh ? object.count : 1;
      for (let copy = 0; copy < count; copy++) {
        if (object instanceof THREE.InstancedMesh) object.getMatrixAt(copy, instance);
        else instance.identity();
        for (let i = 0; i < position.count; i++) {
          point.fromBufferAttribute(position, i).applyMatrix4(instance).applyMatrix4(object.matrixWorld);
          ellipse.worldToLocal(point);
          assert.ok(Math.hypot(point.x, point.y) >= 0.9259, 'no metal enters the open center');
          assert.ok(Math.hypot(point.x, point.y) <= 1.0341, 'metal stays within shared outer bound');
        }
      }
    });
  } finally { clock.dispose(); }
});

void test('reduced motion freezes both rings without catch-up, and late textures are disposed', () => {
  const clock = createAstronomicalClock(true);
  try {
    const ticks = clock.group.getObjectByName('outer-clock-ticks')!;
    clock.update(1 / 60, 'spread', 0, 0, false, true);
    clock.update(1 / 60, 'spread', 1, 0, false, true);
    const angle = ticks.rotation.z;
    for (const index of [2, 0, 21]) clock.update(1 / 60, 'spread', index, 0, true, true);
    for (let i = 0; i < 180; i++) clock.update(1 / 60, 'spread', 21, 0, false, true);
    assert.equal(ticks.rotation.z, angle);
    clock.dispose();
    for (const back of [false, true]) {
      const texture = new THREE.Texture();
      let disposed = false;
      texture.addEventListener('dispose', () => { disposed = true; });
      assert.equal(back ? clock.installTheatreFigureBack('angel', texture) : clock.installTheatreFigure('goddess', texture), false);
      assert.equal(disposed, true);
    }
  } finally { clock.dispose(); }
});

void test('all twelve relief faces stand ahead of the chapter ring with real depth occlusion', () => {
  for (const narrow of [false, true]) {
    const clock = createAstronomicalClock(true);
    try {
      clock.installZodiacAtlas(new THREE.Texture({ width: 1024, height: 1536 } as HTMLImageElement));
      clock.update(1 / 60, 'spread', 0, 0, false, narrow);
      clock.group.updateWorldMatrix(true, true);
      const badges = clock.group.getObjectByName('zodiac-medallions')!;
      const ring = clock.group.getObjectByName('outer-clock-ticks')!.parent!;
      const ringMeshes: THREE.Object3D[] = []; ring.traverse(object => { if (object instanceof THREE.Mesh) ringMeshes.push(object); });
      const ray = new THREE.Raycaster(); const point = new THREE.Vector3();
      let overlapSamples = 0;
      badges.children.forEach(badge => {
        const face = badge.children.find(object => object.name.startsWith('relief-')) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
        assert.equal(face.material.depthTest, true); assert.equal(face.material.depthWrite, true); assert.equal(face.material.opacity, 1);
        for (const x of [-0.13, 0, 0.13]) for (const y of [-0.13, 0, 0.13]) {
          point.set(x, y, 0).applyMatrix4(face.matrixWorld);
          ray.set(new THREE.Vector3(point.x, point.y, 8), new THREE.Vector3(0, 0, -1));
          const faceHits = ray.intersectObject(face, false);
          assert.ok(faceHits.length, 'sample lands on actual cropped relief geometry');
          const ringHits = ray.intersectObjects(ringMeshes, false);
          if (ringHits.length) {
            overlapSamples++;
            assert.ok(faceHits[0].distance < ringHits[0].distance - 0.03, 'relief is physically in front, independent of transparent sorting');
          }
        }
      });
      assert.ok(overlapSamples >= 36, 'exercise badge regions overlapping the ring on screen');
    } finally { clock.dispose(); }
  }
});
