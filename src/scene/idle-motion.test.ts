import assert from 'node:assert/strict';
import { test } from 'node:test';
// @ts-expect-error Native Node TypeScript runner.
import { createIdleMotion } from './idle-motion.ts';

void test('idle passes different cards through the front and reverses naturally in a continuing cycle', () => {
  const motion = createIdleMotion(), control = { enabled: true, generation: 0 };
  let previous = 0, previousDelta = 0, reversals = 0;
  const foreground = new Set<number>();
  for (let tick = 0; tick < 7200; tick++) {
    const position = motion.update(1 / 60, 22, true, control, false);
    const delta = position - previous;
    foreground.add(((Math.round(position) % 22) + 22) % 22);
    assert.ok(Math.abs(delta) < .022, 'motion must not jump at an endpoint or card wrap');
    assert.ok(Math.abs(delta - previousDelta) < (tick ? .001 : .022), 'velocity reverses continuously');
    if (delta * previousDelta < 0) reversals++;
    previous = position; previousDelta = delta;
  }
  assert.equal(foreground.size, 22);
  assert.ok(reversals >= 4);
});

void test('input takeover coasts briefly, stays stopped through failure/lost tracking, reset alone resumes', () => {
  const motion = createIdleMotion(), control = { enabled: true, generation: 0 };
  let position = 0;
  for (let i = 0; i < 120; i++) position = motion.update(1 / 60, 22, true, control, false);
  const start = position;
  // activateHand sets this synchronously before awaiting permissions/model startup.
  control.enabled = false;
  const first = motion.update(1 / 60, 22, true, control, false);
  assert.ok(first > start && first - start < .022);
  for (let i = 0; i < 120; i++) position = motion.update(1 / 60, 22, true, control, false);
  assert.ok(position - start < .12, 'coast is bounded to a fraction of one card');
  const stopped = position;
  control.enabled = true; // Even a stale enable cannot steal control within the same visit.
  for (let i = 0; i < 600; i++) assert.equal(motion.update(1 / 60, 22, true, control, false), stopped);
  control.generation++;
  const reset = motion.update(1 / 60, 22, true, control, false);
  assert.ok(reset > 0 && reset < .022);
  assert.ok(motion.update(1 / 60, 22, true, control, false) > reset);
});

void test('reduced motion does not advance or bank idle time', () => {
  const motion = createIdleMotion(), control = { enabled: true, generation: 0 };
  const before = motion.update(1 / 60, 22, true, control, false);
  for (let i = 0; i < 600; i++) assert.equal(motion.update(1 / 60, 22, true, control, true), before);
  assert.ok(motion.update(1 / 60, 22, true, control, false) - before < .022);
});

void test('nonzero idle offset cannot leak through reduced motion into selection or reveal', () => {
  const motion = createIdleMotion(), control = { enabled: true, generation: 0 };
  let position = 0;
  for (let i = 0; i < 120; i++) position = motion.update(1 / 60, 22, true, control, false);
  assert.ok(position > 1);
  assert.equal(motion.update(1 / 60, 22, true, control, true), position);
  control.enabled = false;
  // The production Scene passes idle=false for spread and revealing, including reduced motion.
  for (const reduced of [true, true, false]) assert.equal(motion.update(1 / 60, 22, false, control, reduced), 0);
});
