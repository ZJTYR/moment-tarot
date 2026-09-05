// @ts-expect-error Node's native TypeScript test runner needs the explicit extension.
import { asMagicGesture, smoothPosition, type MagicGesture } from './gesture-machine.ts';

export interface HandPoint { x: number; y: number; z?: number }
export interface HandSample {
  gesture: MagicGesture;
  x: number;
  y: number;
  confidence: number;
  landmarks: HandPoint[];
  canBrowse: boolean;
  timestamp: number;
  actionProgress: number;
}

const distance = (a: HandPoint, b: HandPoint) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
/** Hand presence and motion are independent of the canned gesture classifier score. */
export function readHandSample(
  landmarks: HandPoint[] | undefined,
  category: { categoryName?: string; score?: number } | undefined,
  previous: HandSample | null,
  now: number,
): HandSample | null {
  if (!landmarks || landmarks.length !== 21 || !Number.isFinite(now)
    || landmarks.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || (point.z !== undefined && !Number.isFinite(point.z)))) return null;
  const palm = [0, 5, 9, 13, 17].map(index => landmarks[index]);
  if (distance(landmarks[0], landmarks[9]) < 0.015) return null;
  const x = palm.reduce((sum, point) => sum + point.x, 0) / palm.length;
  const y = palm.reduce((sum, point) => sum + point.y, 0) / palm.length;
  const fingers = [5, 9, 13, 17].map(base => {
    const [mcp, pip, dip, tip] = landmarks.slice(base, base + 4);
    const length = distance(mcp, pip) + distance(pip, dip) + distance(dip, tip);
    return distance(mcp, tip) > length * 0.72
      && distance(landmarks[0], tip) > distance(landmarks[0], pip) * 1.12;
  });
  const extended = fingers.filter(Boolean).length;
  const classified = asMagicGesture(category?.categoryName);
  const score = Number.isFinite(category?.score) ? category!.score! : 0;
  const actionPose = classified !== 'None' && classified !== 'Open_Palm' && score >= 0.65;
  const canBrowse = extended >= 3 || (extended >= 2 && !actionPose) || (extended >= 1 && classified === 'Open_Palm' && score >= 0.5);
  // An open geometric palm wins over transient Pointing/Fist labels while moving.
  const gesture = canBrowse ? 'Open_Palm' : classified;
  const continuous = previous && now - previous.timestamp <= 350 && now >= previous.timestamp;
  const position = smoothPosition(continuous ? previous : null, x, y, continuous ? now - previous.timestamp : undefined);
  return { ...position, landmarks, canBrowse, gesture, confidence: canBrowse ? Math.max(0.75, classified === 'Open_Palm' ? score : 0) : score, timestamp: now, actionProgress: 0 };
}

export interface HandNavigation {
  lastX: number | null;
  lastSeen: number | null;
  travel: number;
  lastStep: number;
}
export const HAND_NAVIGATION = { step: 0.035, intervalMs: 85, lostMs: 350, maxJump: 0.22 };
export function initialHandNavigation(): HandNavigation {
  return { lastX: null, lastSeen: null, travel: 0, lastStep: -Infinity };
}
/** Relative drag: a small movement gives immediate fractional preview before a card commits. */
export function advanceHandNavigation(state: HandNavigation, sample: HandSample | null, now: number): {
  state: HandNavigation; steps: number; offset: number;
} {
  const empty = () => ({ state: initialHandNavigation(), steps: 0, offset: 0 });
  if (!Number.isFinite(now)) return empty();
  if (!sample) {
    return state.lastSeen !== null && now >= state.lastSeen && now - state.lastSeen <= HAND_NAVIGATION.lostMs
      ? { state, steps: 0, offset: Math.max(-0.95, Math.min(0.95, -state.travel / HAND_NAVIGATION.step)) }
      : empty();
  }
  if (!sample.canBrowse) return empty();
  if (state.lastX === null || state.lastSeen === null || now < state.lastSeen || now - state.lastSeen > HAND_NAVIGATION.lostMs
    || Math.abs(sample.x - state.lastX) > HAND_NAVIGATION.maxJump) {
    return { state: { ...initialHandNavigation(), lastX: sample.x, lastSeen: now }, steps: 0, offset: 0 };
  }
  const next = { ...state, lastX: sample.x, lastSeen: now, travel: state.travel + sample.x - state.lastX };
  let steps = 0;
  if (now - state.lastStep >= HAND_NAVIGATION.intervalMs) {
    const count = Math.min(2, Math.floor((Math.abs(next.travel) + 1e-10) / HAND_NAVIGATION.step));
    // Same direction as dragging the card carousel with a pointer.
    steps = -Math.sign(next.travel) * count;
    if (count) { next.travel += steps * HAND_NAVIGATION.step; next.lastStep = now; }
  }
  // Never stockpile a long animation after a fast sweep or tracking jump.
  next.travel = Math.max(-HAND_NAVIGATION.step * 2.95, Math.min(HAND_NAVIGATION.step * 2.95, next.travel));
  return { state: next, steps, offset: Math.max(-0.95, Math.min(0.95, -next.travel / HAND_NAVIGATION.step)) };
}
