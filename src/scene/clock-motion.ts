import type { SceneMode } from './scene-types';

/** A unidirectional escapement. Input baselines advance even while motion is disabled. */
export function createClockMotion() {
  let angle = 0;
  let target = 0;
  let energy = 0;
  let previous: { index: number; mode: SceneMode; hand: number } | undefined;
  return {
    update(dt: number, mode: SceneMode, index: number, hand: number, reduced: boolean) {
      const elapsed = Math.max(0, Math.min(dt, 0.05));
      let travel = 0;
      if (previous) {
        const browse = index !== previous.index;
        if (browse || (mode === 'revealing' && previous.mode !== mode)) travel += Math.PI / 5;
        if (!browse && mode === 'spread' && previous.mode === mode && hand !== 0) {
          const delta = Math.abs(hand - previous.hand);
          // Ignore lost tracking and reacquisition jumps, matching the hand navigation contract.
          if (delta < 0.35) travel += delta * Math.PI * 1.1;
        }
      }
      previous = { index, mode, hand };
      if (reduced) { target = angle; energy = 0; }
      else {
        target -= travel;
        angle += (target - angle) * -Math.expm1(-elapsed * 8);
        energy = Math.min(1, energy + travel * 3) * Math.exp(-elapsed * 2);
      }
      return { angle, energy };
    },
  };
}
