import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createCardRitualEffects } from './card-ritual-effects.ts';
// @ts-expect-error Native Node tests require explicit TypeScript extensions.
import { createGalaxyField } from './galaxy-field.ts';

void test('card effects stay local, leave anchor pose intact, emit once and consume reduced-motion triggers', () => {
  const effects = createCardRitualEffects(true);
  const anchor = new THREE.Group(); anchor.position.set(3, 4, 5); anchor.rotation.set(0.2, 0.4, 0.1); anchor.scale.setScalar(1.6);
  const pose = [anchor.position.toArray(), anchor.quaternion.toArray(), anchor.scale.toArray()];
  effects.update(1 / 60, 'spread', anchor, 0, false); assert.equal(effects.group.visible, false);
  effects.update(1 / 60, 'spread', anchor, 1, false); assert.equal(effects.group.visible, true);
  assert.equal(effects.group.parent, anchor);
  assert.deepEqual([anchor.position.toArray(), anchor.quaternion.toArray(), anchor.scale.toArray()], pose);
  effects.group.traverse((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) { assert.ok(Math.abs(positions.getX(i)) <= 0.7151); assert.ok(Math.abs(positions.getY(i)) <= 1.1951); }
  });
  effects.update(1 / 60, 'revealing', anchor, 0, false); assert.equal(effects.group.visible, true);
  for (let i = 0; i < 120; i++) effects.update(1 / 60, 'result', anchor, 0, false);
  assert.equal(effects.group.visible, false);
  effects.update(1 / 60, 'spread', anchor, 0, true);
  effects.update(1 / 60, 'revealing', anchor, 1, true); assert.equal(effects.group.visible, false);
  effects.update(1 / 60, 'revealing', anchor, 1, false); assert.equal(effects.group.visible, false);
  let released = 0;
  effects.group.children.forEach((object: THREE.Object3D) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
    object.geometry.addEventListener('dispose', () => { released++; });
    (object.material as THREE.Material).addEventListener('dispose', () => { released++; });
  });
  effects.dispose(); effects.dispose(); assert.equal(released, 4); assert.equal(anchor.children.length, 0);
});

void test('four galaxy systems remain, reduced motion holds all transforms and shader time', () => {
  const galaxies = createGalaxyField(true); const pointer = new THREE.Vector2();
  const systems = galaxies.group.children.filter((object: THREE.Object3D) => object.name.startsWith('galaxy-system-'));
  assert.equal(systems.length, 4);
  galaxies.update(1 / 60, 'spread', 0, pointer, true, false, 1);
  const positions = systems.map((system: THREE.Object3D) => system.position.toArray());
  const shards = galaxies.group.getObjectByName('restrained-metal-shards') as THREE.InstancedMesh;
  assert.equal(shards.count, 8);
  const matrices = Array.from(shards.instanceMatrix.array);
  for (let i = 0; i < 60; i++) galaxies.update(1 / 60, 'spread', i, pointer, true, false, 1);
  assert.deepEqual(systems.map((system: THREE.Object3D) => system.position.toArray()), positions);
  assert.deepEqual(Array.from(shards.instanceMatrix.array), matrices);
  for (const system of systems) assert.equal((system as THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms.uTime.value, 0);
  galaxies.dispose(); galaxies.dispose(); assert.equal(galaxies.group.children.length, 0);
});

void test('halo has a depth-tested near surface before and after the actual PI card flip', () => {
  const effects = createCardRitualEffects(true); const anchor = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.43, 2.39, 0.06), new THREE.MeshBasicMaterial()); anchor.add(body);
  effects.update(0.05, 'revealing', anchor, 0, false);
  const halo = effects.group.children.find((object: THREE.Object3D) => object instanceof THREE.Mesh) as THREE.Mesh;
  assert.equal((halo.material as THREE.Material).depthTest, true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0.7, 0, 5), new THREE.Vector3(0, 0, -1));
  for (const angle of [0, Math.PI]) {
    anchor.rotation.y = angle; anchor.updateWorldMatrix(true, true);
    const hits = ray.intersectObjects([body, halo], false);
    assert.ok(hits.length > 1); assert.equal(hits[0].object, halo, 'the visible rim is in front of the opaque card');
    assert.ok(hits[0].point.z > 0.06);
  }
  const dust = effects.group.children.find((object: THREE.Object3D) => object instanceof THREE.Points) as THREE.Points;
  const positions = dust.geometry.getAttribute('position');
  assert.ok(Array.from({ length: positions.count }, (_, i) => positions.getZ(i)).some((z: number) => z < 0));
  effects.dispose(); body.geometry.dispose(); (body.material as THREE.Material).dispose();
});
