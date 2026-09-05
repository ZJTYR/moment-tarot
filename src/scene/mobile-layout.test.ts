import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import type { SceneMode } from './scene-types';
// @ts-expect-error Native Node TypeScript runner.
import { framePlacement, placeStage, fitCardsInsideFrame, projectedCardRadius, CARD_CLEAR_RADIUS } from './frame-layout.ts';
// @ts-expect-error Native Node TypeScript runner.
import { cardTarget } from './card-layout.ts';

// Real 03 DOM capture: viewport390x844, canvas x=-19.5/y145, w429/h599.
const width = 429, height = 599;
const bounds = (mode: SceneMode) => ({ left: 35.5, right: 393.5, top: mode === 'idle' ? 94.34375 : 100, bottom: mode === 'idle' ? 516 : 478 });
const rig = (w = width, h = height, narrow = true) => {
  const camera = new THREE.PerspectiveCamera(39, w / h, 0.1, 100);
  camera.position.set(0, 1.4, narrow ? 15.3 : 13.8); camera.lookAt(0, 0, 0);
  const stage = new THREE.Group(), table = new THREE.Group(), frame = new THREE.Group(); stage.add(table, frame);
  const cards = Array.from({ length: 22 }, () => new THREE.Group()); table.add(...cards);
  return { camera, stage, table, frame, cards };
};
const corners = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new THREE.Vector3(x * .715, y * 1.195, z * .03))));
function measurements(r: ReturnType<typeof rig>, w = width, h = height, figureScale = .86) {
  r.stage.updateMatrixWorld(true);
  const points = r.cards.map(card => corners.map(p => p.clone().applyMatrix4(card.matrixWorld).project(r.camera)));
  const selectedWidth = (Math.max(...points[0].map(p => p.x)) - Math.min(...points[0].map(p => p.x))) * w / 2;
  const cardTop = Math.max(...points.flat().map(p => p.y));
  const foot = new THREE.Vector3(0, .15 + (1.9 - .045) * figureScale, .18 * figureScale).applyMatrix4(r.frame.matrixWorld).project(r.camera);
  const selectedHeight = (Math.max(...points[0].map(p => p.y)) - Math.min(...points[0].map(p => p.y))) * h / 2;
  return { selectedWidth, selectedHeight, footGap: (foot.y - cardTop) * h / 2 };
}

void test('actual mobile canvas keeps a readable foreground card and a distinct gap below the goddess', () => {
  for (const mode of ['idle', 'spread', 'revealing'] as const) {
    const r = rig(); const p = framePlacement(width, height, true, mode === 'idle', bounds(mode));
    placeStage(r.stage, r.camera, width, height, p, 1);
    r.cards.forEach((card, i) => {
      const euler = new THREE.Euler();
      card.scale.setScalar(cardTarget(i, 0, 22, mode, true, 0, 0, true, card.position, euler)); card.rotation.copy(euler);
    });
    const fit = fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, true);
    const metrics = measurements(r);
    assert.ok(metrics.selectedWidth >= 95, `${mode} selected width ${metrics.selectedWidth}`);
    assert.ok(metrics.footGap >= 12, `${mode} goddess gap ${metrics.footGap}`);
    assert.ok(fit >= .97, `${mode} should not rely on shrinking the whole fan: ${fit}`);
    assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, true) <= CARD_CLEAR_RADIUS);
  }
});

void test('actual mobile interpolated browse, seal, expand and reveal keep frame and goddess clearance', () => {
  const r = rig(), target = new THREE.Vector3(), euler = new THREE.Euler(), q = new THREE.Quaternion();
  let initialized = false;
  for (const mode of ['idle', 'spread', 'sealed', 'burst', 'spread', 'revealing', 'spread'] as const) {
    const p = framePlacement(width, height, true, mode === 'idle', bounds(mode));
    for (let tick = 0; tick < 180; tick++) {
      const blend = initialized ? 1 - Math.exp(-6 / 60) : 1;
      placeStage(r.stage, r.camera, width, height, p, blend);
      r.cards.forEach((card, i) => {
        const scale = cardTarget(i, mode === 'spread' ? Math.floor(tick / 30) : 0, 22, mode, true, mode === 'spread' ? Math.sin(tick / 6) * .9 : 0, tick / 60, false, target, euler);
        card.position.lerp(target, blend); card.quaternion.slerp(q.setFromEuler(euler), blend); card.scale.lerp(new THREE.Vector3(scale, scale, scale), blend);
      });
      fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, true);
      assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, true) <= CARD_CLEAR_RADIUS + 1e-9);
      const metrics = measurements(r);
      assert.ok(metrics.footGap >= 12, `${mode} frame${tick} gap${metrics.footGap}`);
      initialized = true;
    }
  }
});

void test('idle to spread interpolates the complete stage instead of jumping', () => {
  const r = rig();
  const idle = framePlacement(1440, 732, false, true), spread = framePlacement(1440, 732, false, false);
  placeStage(r.stage, r.camera, 1440, 732, idle, 1);
  const before = r.stage.position.clone(), beforeScale = r.stage.scale.x;
  const final = new THREE.Group(); placeStage(final, r.camera, 1440, 732, spread, 1);
  placeStage(r.stage, r.camera, 1440, 732, spread, 1 - Math.exp(-6 / 60));
  assert.ok(r.stage.position.distanceTo(before) > 0);
  assert.ok(r.stage.position.distanceTo(before) < final.position.distanceTo(before) * .11);
  assert.ok(Math.abs(r.stage.scale.x - beforeScale) <= Math.abs(final.scale.x - beforeScale) * .11);
});

void test('1440x900 desktop keeps the existing rim and restores a 200px foreground card', () => {
  for (const mode of ['idle', 'spread', 'revealing'] as const) {
    const r = rig(1440, 732, false);
    placeStage(r.stage, r.camera, 1440, 732, framePlacement(1440, 732, false, mode === 'idle'), 1);
    r.cards.forEach((card, i) => {
      const e = new THREE.Euler();
      card.scale.setScalar(cardTarget(i, 0, 22, mode, false, 0, 0, true, card.position, e)); card.rotation.copy(e);
    });
    fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, false);
    const metrics = measurements(r, 1440, 732, .90);
    assert.ok(metrics.selectedHeight >= 200, `${mode} height ${metrics.selectedHeight}`);
    assert.ok(metrics.footGap >= 12, `${mode} gap ${metrics.footGap}`);
    assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, false) <= CARD_CLEAR_RADIUS);
  }
});

void test('desktop enlarged cards retain clearance throughout actual target interpolation', () => {
  const r = rig(1440, 732, false), target = new THREE.Vector3(), euler = new THREE.Euler(), q = new THREE.Quaternion();
  let initialized = false;
  for (const mode of ['idle', 'spread', 'sealed', 'burst', 'spread', 'revealing', 'spread'] as const) {
    for (let tick = 0; tick < 180; tick++) {
      const blend = initialized ? 1 - Math.exp(-6 / 60) : 1;
      placeStage(r.stage, r.camera, 1440, 732, framePlacement(1440, 732, false, mode === 'idle'), blend);
      r.cards.forEach((card, i) => {
        const scale = cardTarget(i, mode === 'spread' ? Math.floor(tick / 30) : 0, 22, mode, false, mode === 'spread' ? Math.sin(tick / 6) * .9 : 0, tick / 60, false, target, euler);
        card.position.lerp(target, blend); card.quaternion.slerp(q.setFromEuler(euler), blend); card.scale.lerp(new THREE.Vector3(scale, scale, scale), blend);
      });
      fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, false);
      assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, false) <= CARD_CLEAR_RADIUS + 1e-9);
      const metrics = measurements(r, 1440, 732, .90);
      assert.ok(metrics.footGap >= 12, `${mode} frame${tick} gap${metrics.footGap}`);
      initialized = true;
    }
  }
});

void test('automatic foreground remains legible with true-circle rim and current figure bounds', () => {
  for (const narrow of [false, true]) {
    const w = narrow ? 429 : 1440, h = narrow ? 599 : 732;
    const r = rig(w, h, narrow);
    placeStage(r.stage, r.camera, w, h, framePlacement(w, h, narrow, true, narrow ? bounds('idle') : undefined), 1);
    const figure = new THREE.Group(); figure.position.y = .15; figure.scale.setScalar(narrow ? .86 : .90); r.frame.add(figure);
    r.stage.updateMatrixWorld(true);
    const box = new THREE.Box3(new THREE.Vector3(-1.95, 1.805, -.30), new THREE.Vector3(1.95, 3.9, .30)).applyMatrix4(figure.matrixWorld);
    for (let step = 0; step < 220; step++) {
      const active = step / 10;
      r.cards.forEach((card, i) => {
        const euler = new THREE.Euler();
        card.scale.setScalar(cardTarget(i, active, 22, 'idle', narrow, 0, 0, true, card.position, euler)); card.rotation.copy(euler);
      });
      fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, narrow, [box], h);
      r.stage.updateMatrixWorld(true);
      const closest = r.cards[Math.round(active) % 22];
      const points = corners.map(p => p.clone().applyMatrix4(closest.matrixWorld).project(r.camera));
      const size = narrow ? (Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x))) * w / 2 : (Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y))) * h / 2;
      assert.ok(size >= (narrow ? 95 : 200), `narrow=${narrow} active=${active} size=${size}`);
      assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, narrow) <= CARD_CLEAR_RADIUS + 1e-8);
    }
  }
});

void test('1280x720 short desktop uses the agreed compact-controls safe area without sacrificing the main card', () => {
  const w = 1280, h = 580, r = rig(w, h, false);
  // 03 compact-controls CSS targets top540: canvas-local bottom540-70-22=448.
  const p = framePlacement(w, h, false, false, { left: 0, right: w, top: 29, bottom: 448 });
  placeStage(r.stage, r.camera, w, h, p, 1);
  const figure = new THREE.Group(); figure.position.y = .15; figure.scale.setScalar(.90); r.frame.add(figure);
  r.stage.updateMatrixWorld(true);
  const box = new THREE.Box3(new THREE.Vector3(-1.95, 1.805, -.30), new THREE.Vector3(1.95, 3.9, .30)).applyMatrix4(figure.matrixWorld);
  r.cards.forEach((card, i) => {
    const e = new THREE.Euler(); card.scale.setScalar(cardTarget(i, 0, 22, 'spread', false, 0, 0, true, card.position, e, p.pixelsPerUnit)); card.rotation.copy(e);
  });
  fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, false, [box], h);
  const metrics = measurements(r, w, h, .90);
  assert.ok(metrics.selectedHeight >= 195, `approximately 200px at short desktop, got ${metrics.selectedHeight}`);
  assert.ok(projectedCardRadius(r.cards, r.frame, r.camera, false) <= CARD_CLEAR_RADIUS);
});

void test('production rotating figure boxes keep the foreground clear and legible at every quarter turn', async () => {
  // @ts-expect-error Native Node TypeScript runner.
  const { createFateTheatre } = await import('./fate-theatre.ts');
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement() {
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage() {}, getImageData() {
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4); data.fill(180);
      for (let i = 3; i < data.length; i += 4) data[i] = 255;
      return { data };
    } }) }; return canvas;
  } } });
  try {
    for (const narrow of [false, true]) {
      const w = narrow ? 429 : 1440, h = narrow ? 599 : 732;
      const r = rig(w, h, narrow), theatre = createFateTheatre(true);
      r.frame.add(theatre.group); theatre.group.position.y = .15; theatre.group.scale.setScalar(narrow ? .86 : .90);
      try {
        const image = { width: 1024, height: 1536 } as HTMLImageElement;
        theatre.installFigure('goddess', new THREE.Texture(image));
        theatre.installFigureBack('goddess', new THREE.Texture(image));
        for (const mode of ['idle', 'spread', 'revealing'] as const) for (let turn = 0; turn < 16; turn++) {
          const p = framePlacement(w, h, narrow, mode === 'idle', narrow ? bounds(mode) : undefined);
          placeStage(r.stage, r.camera, w, h, p, 1);
          theatre.update(1 / 60, mode, -turn * Math.PI / 8, false, narrow);
          r.cards.forEach((card, i) => {
            const e = new THREE.Euler(); card.scale.setScalar(cardTarget(i, 0, 22, mode, narrow, 0, 0, true, card.position, e, p.pixelsPerUnit)); card.rotation.copy(e);
          });
          const boxes = theatre.getFigureBounds();
          fitCardsInsideFrame(r.table, r.cards, r.frame, r.camera, narrow, boxes, h);
          r.stage.updateMatrixWorld(true);
          const cardTop = Math.max(...r.cards.flatMap(card => corners.map(p => p.clone().applyMatrix4(card.matrixWorld).project(r.camera).y)));
          const floor = Math.min(...boxes.flatMap(box => [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z => new THREE.Vector3(x < 0 ? box.min.x : box.max.x, y < 0 ? box.min.y : box.max.y, z < 0 ? box.min.z : box.max.z).project(r.camera).y)))));
          assert.ok((floor - cardTop) * h / 2 >= 12 - 1e-6);
          const metrics = measurements(r, w, h, narrow ? .86 : .90);
          assert.ok(narrow ? metrics.selectedWidth >= 95 : metrics.selectedHeight >= 200, `${mode} narrow${narrow} turn${turn}: ${JSON.stringify(metrics)}`);
        }
      } finally { theatre.dispose(); }
    }
  } finally {
    if (original) Object.defineProperty(globalThis, 'document', original); else Reflect.deleteProperty(globalThis, 'document');
  }
});
