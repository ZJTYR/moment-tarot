export type MagicGesture = 'None' | 'Open_Palm' | 'Pointing_Up' | 'Closed_Fist' | 'Victory';

export interface GestureObservation { gesture: MagicGesture; confidence: number }
export interface GestureMachineState {
  candidate: MagicGesture;
  candidateSince: number;
  latched: MagicGesture;
  releaseSince: number | null;
  lastTime: number | null;
}
export const GESTURE_TIMING = { confidence: 0.65, dwellMs: 280, releaseMs: 200, maxGapMs: 250 };

export function initialGestureState(): GestureMachineState {
  return { candidate: 'None', candidateSince: 0, latched: 'None', releaseSince: null, lastTime: null };
}

/** Pure transition: a lost hand can release a latch, but never emits an action. */
export function advanceGesture(state: GestureMachineState, observation: GestureObservation | null, now: number): {
  state: GestureMachineState; event: MagicGesture | null;
} {
  if (!Number.isFinite(now)) return { state, event: null };
  const interrupted = state.lastTime !== null && (now < state.lastTime || now - state.lastTime > GESTURE_TIMING.maxGapMs);
  const next = { ...state, lastTime: now };
  if (interrupted) {
    next.candidate = 'None';
    next.releaseSince = null;
  }
  const gesture = observation && Number.isFinite(observation.confidence) && observation.confidence >= GESTURE_TIMING.confidence
    ? observation.gesture : 'None';
  if (gesture !== next.latched && next.latched !== 'None') {
    next.releaseSince ??= now;
    if (now - next.releaseSince >= GESTURE_TIMING.releaseMs) next.latched = 'None';
  } else next.releaseSince = null;
  if (next.candidate !== gesture) {
    next.candidate = gesture;
    next.candidateSince = now;
  }
  if (gesture !== 'None' && gesture !== next.latched && now - next.candidateSince >= GESTURE_TIMING.dwellMs) {
    next.latched = gesture;
    next.releaseSince = null;
    return { state: next, event: gesture };
  }
  return { state: next, event: null };
}

export function asMagicGesture(value: string | undefined): MagicGesture {
  return value === 'Open_Palm' || value === 'Pointing_Up' || value === 'Closed_Fist' || value === 'Victory' ? value : 'None';
}

export function smoothPosition(previous: { x: number; y: number } | null, x: number, y: number, elapsedMs?: number) {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
  const target = { x: 1 - clamp(x), y: clamp(y) };
  const alpha = elapsedMs === undefined ? 0.3 : 1 - Math.exp(-Math.max(0, Math.min(180, elapsedMs)) / 45);
  return previous ? { x: previous.x + (target.x - previous.x) * alpha, y: previous.y + (target.y - previous.y) * alpha } : target;
}
