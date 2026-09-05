import assert from 'node:assert/strict';
import { test } from 'node:test';
// @ts-expect-error Native Node TypeScript runner.
import { createClockMotion } from './clock-motion.ts';

void test('both directions and wrap advance clockwise, then settle', () => {
  const motion = createClockMotion();
  assert.equal(motion.update(1 / 60, 'spread', 0, 0, false).angle, 0);
  let previous = 0;
  for (const index of [1, 0, 21, 0]) {
    let angle = 0;
    for (let i = 0; i < 180; i++) {
      angle = motion.update(1 / 60, 'spread', index, 0, false).angle;
      assert.ok(angle <= previous); previous = angle;
    }
    assert.ok(angle < -0.3);
  }
  const settled = previous;
  for (let i = 0; i < 180; i++) previous = motion.update(1 / 60, 'spread', 0, 0, false).angle;
  assert.ok(Math.abs(previous - settled) < 1e-8);
});

void test('continuous palm travel follows before selection and ignores reset/reacquisition', () => {
  const motion = createClockMotion();
  motion.update(1 / 60, 'spread', 0, 0, false);
  let angle = 0;
  for (const hand of [0.05, 0.10, 0.18, 0.23, 0.17, 0.09]) {
    const next = motion.update(1 / 60, 'spread', 0, hand, false).angle;
    assert.ok(next < angle); angle = next;
  }
  for (let i = 0; i < 180; i++) angle = motion.update(1 / 60, 'spread', 0, 0.09, false).angle;
  motion.update(1 / 60, 'spread', 0, 0, false);
  for (let i = 0; i < 180; i++) assert.ok(Math.abs(motion.update(1 / 60, 'spread', 0, 0.9, false).angle - angle) < 1e-8);
});

void test('reduced motion cancels pending rotation and does not accumulate input', () => {
  const motion = createClockMotion();
  motion.update(1 / 60, 'spread', 0, 0, false);
  const angle = motion.update(1 / 60, 'spread', 1, 0.1, false).angle;
  for (const index of [2, 0, 21]) assert.equal(motion.update(1 / 60, 'spread', index, 0.2, true).angle, angle);
  for (let i = 0; i < 180; i++) assert.equal(motion.update(1 / 60, 'spread', 21, 0.2, false).angle, angle);
});

void test('reveal advances once, holding result does not repeat', () => {
  const motion = createClockMotion();
  motion.update(1 / 60, 'spread', 0, 0, false);
  let angle = 0;
  for (let i = 0; i < 180; i++) angle = motion.update(1 / 60, 'revealing', 0, 0, false).angle;
  assert.ok(angle < -0.34);
  for (let i = 0; i < 180; i++) assert.ok(Math.abs(motion.update(1 / 60, 'result', 0, 0, false).angle - angle) < 1e-8);
});

void test('a small incremental palm input gives a visible sustained clockwise turn before any index event', () => {
  const motion = createClockMotion();
  motion.update(1 / 60, 'spread', 0, 0, false);
  let angle = 0;
  for (let tick = 1; tick <= 30; tick++) {
    const next = motion.update(1 / 60, 'spread', 0, tick / 150, false).angle;
    assert.ok(next < angle); angle = next;
  }
  assert.ok(angle < -.45, `half-second 0.2 palm travel should visibly turn >25 degrees, got ${angle}`);
  for (let tick = 0; tick < 180; tick++) angle = motion.update(1 / 60, 'spread', 0, .2, false).angle;
  const settled = angle;
  for (let tick = 0; tick < 180; tick++) angle = motion.update(1 / 60, 'spread', 0, .2, false).angle;
  assert.ok(Math.abs(angle - settled) < 1e-8);
});
