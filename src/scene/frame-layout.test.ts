import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
// @ts-expect-error Native Node TypeScript runner.
import { FRAME, CARD_CLEAR_RADIUS, fitCardsInsideFrame, projectedCardRadius, framePlacement } from './frame-layout.ts';

for (const [width, height] of [[1440, 732], [1024, 600], [390, 676], [320, 480], [768, 856]]) {
  void test(`projected clearance through 22-card transitions at ${width} x ${height}`, () => {
    const narrow = width < 761;
    const camera = new THREE.PerspectiveCamera(39, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 14); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
    const stage = new THREE.Group(); stage.quaternion.copy(camera.quaternion);
    const placement = framePlacement(width, height, narrow, false);
    stage.scale.setScalar(placement.pixelsPerUnit / (height / (28 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))));
    const frame = new THREE.Group(); const table = new THREE.Group(); stage.add(frame, table);
    const cards = Array.from({ length: 22 }, () => new THREE.Group()); table.add(...cards);
    let minimumScale = 1;
    // Sweep full browsing, partial hand offsets and interpolation between spread/seal/reveal.
    for (let tick = 0; tick < 500; tick++) {
      const mix = (Math.sin(tick * 0.037) + 1) / 2;
      cards.forEach((card, i) => {
        const offset = ((i - tick / 17 + 33) % 22) - 11;
        const theta = offset * Math.PI * 2 / 22;
        card.position.set(Math.sin(theta) * (narrow ? 2.55 : 4.65) * mix, (Math.cos(theta) * -0.77 + 0.38) * mix, Math.cos(theta) * 1.6 - 0.5);
        card.rotation.set(0.1, Math.sin(tick * 0.03 + i) * Math.PI, -Math.sin(theta) * 0.15);
        card.scale.setScalar(0.82 + 0.28 * Math.max(0, 1 - Math.abs(offset)));
        if (i === 0) { card.position.lerp(new THREE.Vector3(0, 0.2, 4.1), 1 - mix); card.scale.setScalar(1.38); }
      });
      minimumScale = Math.min(minimumScale, fitCardsInsideFrame(table, cards, frame, camera, narrow));
      assert.ok(projectedCardRadius(cards, frame, camera, narrow) <= CARD_CLEAR_RADIUS + 1e-10);
    }
    assert.ok(minimumScale > 0.65, `cards must remain substantial, minimum scale ${minimumScale}`);
  });
  void test(`frame including crystal silhouette stays in reserved viewport at ${width} x ${height}`, () => {
    for (const idle of [false, true]) {
      const narrow = width < 761;
      const axes = narrow ? FRAME.mobile : FRAME.desktop;
      const p = framePlacement(width, height, narrow, idle);
      const top = p.centerY - (axes.y * 0.99 + 0.40) * p.pixelsPerUnit;
      const bottom = p.centerY + (axes.y * 0.99 + 0.40) * p.pixelsPerUnit;
      assert.ok(top >= (narrow ? 165 : 24));
      assert.ok(bottom <= height - (narrow ? 151 : idle ? 130 : 170));
      assert.ok(p.centerX - (axes.x * 0.99 + 0.40) * p.pixelsPerUnit > 0);
      assert.ok(p.centerX + (axes.x * 0.99 + 0.40) * p.pixelsPerUnit < width);
    }
  });
}

void test('the outer frame projects to a true screen circle at desktop and phone aspect ratios', async () => {
  // @ts-expect-error Native Node TypeScript runner.
  const { placeStage } = await import('./frame-layout.ts');
  for (const [width, height, narrow] of [[1440, 732, false], [1280, 580, false], [429, 599, true]] as const) {
    const camera = new THREE.PerspectiveCamera(39, width / height, .1, 100);
    camera.position.set(0, 1.4, 14); camera.lookAt(0, 0, 0);
    const stage = new THREE.Group();
    placeStage(stage, camera, width, height, framePlacement(width, height, narrow, false), 1);
    stage.updateWorldMatrix(true, true);
    const axes = narrow ? FRAME.mobile : FRAME.desktop;
    const points = Array.from({ length: 360 }, (_, i) => new THREE.Vector3(Math.cos(i * Math.PI / 180) * axes.x, Math.sin(i * Math.PI / 180) * axes.y, 0).applyMatrix4(stage.matrixWorld).project(camera));
    const w = (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * width / 2;
    const h = (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) * height / 2;
    assert.ok(Math.abs(w - h) < 1e-8, `screen ratio must equal one: ${w}/${h}`);
  }
});
