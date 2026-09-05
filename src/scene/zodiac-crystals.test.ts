import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createZodiacCrystals, ZODIAC_NAMES, ZODIAC_MEDALLION_RADIUS } from './zodiac-crystals.ts';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createFateTheatre } from './fate-theatre.ts';

for (const low of [false, true]) {
  void test(`bronze badges: complete occupied radius, fixed centers, distinct atlas crops and release (low=${low})`, () => {
    const badges = createZodiacCrystals(low);
    const atlas = new THREE.Texture({ width: 1024, height: 1536 } as HTMLImageElement);
    let atlasReleases = 0; atlas.addEventListener('dispose', () => { atlasReleases++; });
    assert.equal(badges.installAtlas(atlas), true);
    assert.equal(badges.installAtlas(atlas), true);
    badges.setLayout(4.55 * 0.99, 4.55 * 0.99);
    const crops = new Set<string>();
    const resources = new Set<THREE.BufferGeometry | THREE.Material>();
    let triangles = 0;
    const point = new THREE.Vector3(); const inverse = new THREE.Matrix4();
    assert.equal(badges.group.children.length, 12);
    badges.group.updateWorldMatrix(true, true);
    badges.group.children.forEach((icon: THREE.Object3D, i: number) => {
      assert.equal(icon.name, `zodiac-${ZODIAC_NAMES[i].toLowerCase()}`);
      inverse.copy(icon.matrixWorld).invert();
      icon.traverse((object: THREE.Object3D) => {
        if (!(object instanceof THREE.Mesh)) return;
        resources.add(object.geometry); resources.add(object.material as THREE.Material);
        const vertices = object.geometry.getAttribute('position');
        for (let at = 0; at < vertices.count; at++) {
          point.fromBufferAttribute(vertices, at).applyMatrix4(object.matrixWorld).applyMatrix4(inverse);
          assert.ok(point.length() <= ZODIAC_MEDALLION_RADIUS, `${icon.name} radius ${point.length()}`);
        }
        triangles += (object.geometry.index?.count ?? vertices.count) / 3;
        if (object.name.startsWith('relief-')) {
          const uv = object.geometry.getAttribute('uv'); crops.add(`${uv.getX(0)},${uv.getY(0)}`);
          for (let at = 0; at < uv.count; at++) {
            assert.ok(uv.getX(at) >= 0 && uv.getX(at) <= 1 && uv.getY(at) >= 0 && uv.getY(at) <= 1);
          }
          assert.equal((object.material as THREE.MeshStandardMaterial).map, atlas);
        }
      });
    });
    assert.equal(crops.size, 12);
    assert.ok(triangles < (low ? 14000 : 43000), `triangle budget: ${triangles}`);
    const poses = badges.group.children.map((icon: THREE.Object3D) => [...icon.position.toArray(), ...icon.rotation.toArray()]);
    for (let i = 0; i < 120; i++) badges.update(1 / 60, -i * 0.1, 1, false, false);
    assert.deepEqual(badges.group.children.map((icon: THREE.Object3D) => [...icon.position.toArray(), ...icon.rotation.toArray()]), poses);
    badges.update(1 / 60, 0, 1, true, true);
    const first = badges.group.children[0].children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    assert.ok(first.material.opacity < 0.23);
    badges.setLayout(4.3 * 0.99, 4.3 * 0.99);
    assert.equal(badges.group.children[0].position.y, 4.3 * 0.99);
    let releases = 0; resources.forEach(resource => resource.addEventListener('dispose', () => { releases++; }));
    badges.dispose(); badges.dispose();
    assert.equal(releases, resources.size); assert.equal(atlasReleases, 1);
    const late = new THREE.Texture(); let lateReleases = 0; late.addEventListener('dispose', () => { lateReleases++; });
    assert.equal(badges.installAtlas(late), false); assert.equal(lateReleases, 1);
  });
}

void test('atlas replacement releases superseded faces and atlas, invalid image leaves current artwork intact', () => {
  const badges = createZodiacCrystals(true);
  const atlas = () => new THREE.Texture({ width: 1024, height: 1536 } as HTMLImageElement);
  const old = atlas(); let releases = 0; old.addEventListener('dispose', () => { releases++; });
  badges.installAtlas(old);
  const face = badges.group.getObjectByName('relief-aries') as THREE.Mesh;
  face.geometry.addEventListener('dispose', () => { releases++; });
  const next = atlas(); badges.installAtlas(next); assert.equal(releases, 2);
  const invalid = new THREE.Texture({ width: 1, height: 1 } as HTMLImageElement);
  assert.equal(badges.installAtlas(invalid), false);
  assert.equal((face.material as THREE.MeshStandardMaterial).map, next);
  badges.dispose();
});

void test('theatre follows a continuous clockwise angle, sentries fixed and world bounds include plinths', () => {
  const theatre = createFateTheatre(true);
  const angel = theatre.group.getObjectByName('theatre-angel')!;
  const devil = theatre.group.getObjectByName('theatre-devil')!;
  const goddess = theatre.group.getObjectByName('theatre-goddess')!;
  for (let i = 0; i < 120; i++) theatre.update(1 / 60, 'spread', -i * 0.03, false, false);
  assert.equal(angel.rotation.y, 0.12); assert.equal(devil.rotation.y, -0.12);
  assert.equal(goddess.rotation.y, -119 * 0.03);
  assert.equal(goddess.rotation.x, 0); assert.equal(goddess.rotation.z, 0);
  const held = goddess.rotation.y;
  theatre.update(1 / 60, 'spread', -8, true, true); assert.equal(goddess.rotation.y, held);
  assert.equal(angel.position.x, -1.1); assert.equal(devil.position.x, 1.1);
  theatre.group.position.set(3, 2, 1); theatre.group.scale.setScalar(0.86);
  const bounds = theatre.getFigureBounds(); assert.equal(bounds.length, 3);
  assert.ok(bounds.every((box: THREE.Box3) => !box.isEmpty() && box.min.y < box.max.y));
  assert.ok(bounds[0].min.y <= 2 + 1.84 * 0.86);
  theatre.dispose(); theatre.dispose();
  assert.deepEqual(theatre.getFigureBounds(), []);
  for (const rear of [false, true]) {
    const texture = new THREE.Texture(); let released = false;
    texture.addEventListener('dispose', () => { released = true; });
    assert.equal(rear ? theatre.installFigureBack('angel', texture) : theatre.installFigure('angel', texture), false); assert.ok(released);
  }
});

void test('installed double relief has measurable side thickness and bounds follow the rotated sculpture', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData() {
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4); data.fill(180);
      for (let i = 3; i < data.length; i += 4) data[i] = 255;
      return { data };
    } }) }; return canvas;
  } } });
  const theatre = createFateTheatre(true);
  try {
    const image = { width: 1024, height: 1536 } as HTMLImageElement;
    const front = new THREE.Texture(image); const back = new THREE.Texture(image);
    let releases = 0; front.addEventListener('dispose', () => { releases++; }); back.addEventListener('dispose', () => { releases++; });
    assert.equal(theatre.installFigure('goddess', front), true);
    assert.equal(theatre.installFigureBack('goddess', back), true);
    assert.equal(theatre.installFigure('goddess', front), true);
    assert.equal(releases, 0);
    theatre.update(1 / 60, 'spread', -Math.PI / 2, false, false);
    const figure = theatre.group.getObjectByName('theatre-goddess')!;
    const box = new THREE.Box3().setFromObject(figure);
    assert.ok(box.max.x - box.min.x >= 0.439, 'side view retains physical double-relief thickness');
    assert.ok(box.max.y - box.min.y >= 1.99, 'head stays upright at a quarter turn');
    assert.ok(theatre.getFigureBounds()[0].containsBox(box));
    theatre.dispose(); assert.equal(releases, 2);
  } finally {
    theatre.dispose();
    if (original) Object.defineProperty(globalThis, 'document', original); else Reflect.deleteProperty(globalThis, 'document');
  }
});
