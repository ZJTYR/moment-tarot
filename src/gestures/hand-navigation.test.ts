import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's native TypeScript runner requires the extension.
import { advanceHandNavigation, initialHandNavigation, readHandSample, type HandPoint, type HandSample } from './hand-navigation.ts';
// @ts-expect-error Node's native TypeScript runner requires the extension.
import { advanceGesture, initialGestureState, type MagicGesture } from './gesture-machine.ts';

// Geometric input observations: wrist, thumb and four articulated fingers.
// Replayed through the same observation -> navigation -> action pipeline as the camera.
function hand(x: number, pose: 'palm' | 'point' | 'fist' = 'palm'): HandPoint[] {
  const points: HandPoint[] = [{ x, y: 0.72, z: 0 }];
  points.push({x:x-0.06,y:0.67},{x:x-0.11,y:0.61},{x:x-0.16,y:0.55},{x:x-0.2,y:0.5});
  for (let finger = 0; finger < 4; finger++) {
    const fx = x - 0.09 + finger * 0.06;
    const extended = pose === 'palm' || (pose === 'point' && finger === 0);
    points.push({x:fx,y:0.57},{x:fx,y:extended?0.46:0.53},{x:fx,y:extended?0.37:0.58},{x:fx,y:extended?0.29:0.62});
  }
  return points;
}
function replay(fps: number, positions: number[], classify: (index: number) => { categoryName: string; score: number }, pose: 'palm' | 'point' | 'fist' = 'palm') {
  let previous: HandSample | null = null, navigation = initialHandNavigation(), machine = initialGestureState();
  let total = 0, firstMove: number | null = null;
  const events: MagicGesture[] = [];
  const offsets: number[] = [];
  positions.forEach((x, index) => {
    const now = index * 1000 / fps;
    const sample = readHandSample(hand(x, pose), classify(index), previous, now);
    previous = sample;
    const nav = advanceHandNavigation(navigation, sample, now); navigation = nav.state;
    if (nav.steps && firstMove === null) firstMove = now;
    total += nav.steps; offsets.push(nav.offset);
    const action = advanceGesture(machine, sample, now); machine = action.state;
    if (action.event) events.push(action.event);
  });
  return { total, firstMove, events, offsets, navigation };
}

void test('a relaxed moving palm navigates despite None, low scores and intermittent wrong canned labels', () => {
  const positions = Array.from({length:25}, (_, i) => 0.35 + i * 0.006);
  const run = replay(25, positions, i => [
    { categoryName: 'Open_Palm', score: 0.91 }, { categoryName: 'None', score: 0.2 },
    { categoryName: 'Pointing_Up', score: 0.86 }, { categoryName: 'Open_Palm', score: 0.42 },
  ][i % 4]);
  assert.ok(run.total >= 3, '15% of camera width must browse several cards without a perfect pose label');
  assert.ok(run.firstMove !== null && run.firstMove <= 320);
  assert.ok(run.offsets.some(offset => Math.abs(offset) > 0.1 && Math.abs(offset) < 0.8), 'partial travel must respond before a step');
  assert.deepEqual(run.events, ['Open_Palm'], 'moving a real open hand must not accidentally confirm a card');
});

void test('slow small movements accumulate; resting jitter does not browse', () => {
  const moved = replay(30, Array.from({length:61}, (_, i) => 0.4 + i * 0.001), () => ({categoryName:'None',score:0.01}));
  assert.ok(moved.total >= 1);
  const still = replay(30, Array.from({length:300}, (_, i) => 0.5 + Math.sin(i * 1.7) * 0.003), () => ({categoryName:'Open_Palm',score:0.9}));
  assert.equal(still.total, 0);
});

void test('left and right movements work at low and high camera rates', () => {
  for (const fps of [5, 10, 20, 30, 60]) {
    for (const direction of [-1, 1]) {
      const run = replay(fps, Array.from({length:fps+1}, (_, i) => 0.5 + direction * i / fps * 0.14), () => ({categoryName:'None',score:0}));
      assert.equal(Math.sign(run.total), direction);
      assert.ok(Math.abs(run.total) >= 3 && Math.abs(run.total) <= 4);
    }
  }
});

void test('pointing and a fist do not drag; a held confirmation only fires once', () => {
  for (const pose of ['point', 'fist'] as const) {
    const run = replay(25, Array.from({length:40}, (_, i) => 0.4 + i * 0.003), () => ({categoryName:pose==='point'?'Pointing_Up':'Closed_Fist',score:0.95}), pose);
    assert.equal(run.total, 0);
    assert.deepEqual(run.events, [pose==='point'?'Pointing_Up':'Closed_Fist']);
  }
});

void test('brief hand loss preserves small travel; long loss or reacquisition jumps never launch cards', () => {
  const first = readHandSample(hand(0.5), {categoryName:'None',score:0}, null, 0)!;
  let nav = advanceHandNavigation(initialHandNavigation(), first, 0).state;
  const moved = { ...first, x:first.x-0.02, timestamp:50 };
  nav = advanceHandNavigation(nav, moved, 50).state;
  const missing = advanceHandNavigation(nav, null, 100);
  assert.equal(missing.steps, 0);
  const resumed = advanceHandNavigation(missing.state, {...moved,x:moved.x-0.02,timestamp:140},140);
  assert.equal(resumed.steps, 1);
  const lost = advanceHandNavigation(resumed.state, null, 600);
  assert.equal(lost.offset, 0);
  const reappeared = advanceHandNavigation(lost.state, {...first,x:0.1,timestamp:650},650);
  assert.equal(reappeared.steps, 0);
  const jump = advanceHandNavigation(reappeared.state, {...first,x:0.9,timestamp:700},700);
  assert.equal(jump.steps, 0);
});

void test('invalid or incomplete landmarks never produce a control sample', () => {
  assert.equal(readHandSample(undefined, undefined, null, 0), null);
  assert.equal(readHandSample(hand(0.5).slice(0,10), undefined, null, 0), null);
  const invalid = hand(0.5); invalid[9].x = NaN;
  assert.equal(readHandSample(invalid, undefined, null, 0), null);
});
