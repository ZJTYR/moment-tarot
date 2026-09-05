import test from 'node:test';
import assert from 'node:assert/strict';
// @ts-expect-error -- Node's built-in TypeScript runner requires the explicit extension.
import { advanceGesture, asMagicGesture, initialGestureState, smoothPosition, type MagicGesture } from './gesture-machine.ts';

function sequence() {
  let state = initialGestureState();
  const events: MagicGesture[] = [];
  return {
    events,
    step(now: number, gesture: MagicGesture | null, confidence = 0.95) {
      const result = advanceGesture(state, gesture === null ? null : { gesture, confidence }, now);
      state = result.state;
      if (result.event) events.push(result.event);
    },
  };
}

void test('stable gesture fires once; a continuously held hand never repeats', () => {
  const run = sequence();
  for (let t = 0; t <= 2000; t += 50) run.step(t, 'Open_Palm');
  assert.deepEqual(run.events, ['Open_Palm']);
});

void test('jitter and low confidence do not accumulate dwell', () => {
  const run = sequence();
  for (let t = 0; t < 500; t += 50) run.step(t, t % 100 ? 'Victory' : 'Pointing_Up');
  for (let t = 500; t < 1000; t += 50) run.step(t, 'Victory', 0.3);
  assert.deepEqual(run.events, []);
});

void test('short tracking dropout does not re-arm a held gesture', () => {
  const run = sequence();
  for (let t = 0; t <= 300; t += 50) run.step(t, 'Victory');
  run.step(350, null);
  run.step(400, null);
  for (let t = 450; t <= 1000; t += 50) run.step(t, 'Victory');
  assert.deepEqual(run.events, ['Victory']);
});

void test('sustained release permits a second action, lost hands emit nothing', () => {
  const run = sequence();
  for (let t = 0; t <= 300; t += 50) run.step(t, 'Victory');
  for (let t = 350; t <= 650; t += 50) run.step(t, null);
  assert.deepEqual(run.events, ['Victory']);
  for (let t = 700; t <= 1000; t += 50) run.step(t, 'Victory');
  assert.deepEqual(run.events, ['Victory', 'Victory']);
});

void test('different stable poses switch actions without forcing hand removal', () => {
  const run = sequence();
  for (let t = 0; t <= 300; t += 50) run.step(t, 'Open_Palm');
  for (let t = 350; t <= 650; t += 50) run.step(t, 'Pointing_Up');
  for (let t = 700; t <= 1000; t += 50) run.step(t, 'Closed_Fist');
  assert.deepEqual(run.events, ['Open_Palm', 'Pointing_Up', 'Closed_Fist']);
});

void test('long frame gaps and backwards clocks cannot satisfy dwell', () => {
  const run = sequence();
  run.step(0, 'Victory');
  run.step(50, 'Victory');
  run.step(1000, 'Victory');
  run.step(900, 'Victory');
  assert.deepEqual(run.events, []);
  for (let t = 950; t <= 1200; t += 50) run.step(t, 'Victory');
  assert.deepEqual(run.events, ['Victory']);
});

void test('missing hands, None and invalid confidence never trigger', () => {
  const run = sequence();
  for (let t = 0; t <= 500; t += 50) run.step(t, null);
  for (let t = 550; t <= 1000; t += 50) run.step(t, 'None');
  for (let t = 1050; t <= 1500; t += 50) run.step(t, 'Victory', NaN);
  assert.deepEqual(run.events, []);
  assert.equal(asMagicGesture('Thumb_Up'), 'None');
  assert.equal(asMagicGesture('Victory'), 'Victory');
});

void test('palm position is mirrored, clamped and smoothly interpolated', () => {
  assert.deepEqual(smoothPosition(null, 0.2, 0.4), { x: 0.8, y: 0.4 });
  const moved = smoothPosition({ x: 0.8, y: 0.4 }, 0.8, 1);
  assert.ok(Math.abs(moved.x - 0.62) < 1e-9);
  assert.ok(Math.abs(moved.y - 0.58) < 1e-9);
  assert.deepEqual(smoothPosition(null, -4, 8), { x: 1, y: 1 });
});
