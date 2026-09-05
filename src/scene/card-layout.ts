import * as THREE from 'three';
import type { SceneMode } from './scene-types';
const TAU = Math.PI * 2;

export function cardTarget(index: number, active: number, count: number, mode: SceneMode, narrow: boolean, handDrag: number, seconds: number, reduced: boolean, targetPosition: THREE.Vector3, targetEuler: THREE.Euler, pixelsPerUnit = 55) {
  const focus = mode === 'revealing' || mode === 'result';
  let offset = index - active - handDrag;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  const theta = offset * TAU / Math.max(count, 9);
  const chosen = index === active;
  const sealed = mode === 'sealed';
  const width = narrow ? 1.9 : 2.65;
  const x = Math.sin(theta) * width;
  const y = narrow ? Math.cos(theta) * -0.50 + 0.15 : Math.cos(theta) * -0.77 + 0.38;
  const z = Math.cos(theta) * 1.6 - 0.5;
  const idle = mode === 'idle';
  targetPosition.set(x, y, z);
  targetEuler.set(0.07, -Math.sin(theta) * 0.45, -Math.sin(theta) * 0.15);
  const prominence = Math.max(0, 1 - Math.pow(Math.abs(offset), 4));
  const desktopFront = Math.max(1.52, Math.min(1.90, 84 / Math.max(1, pixelsPerUnit)));
  let scale = narrow ? 0.86 + prominence * 0.80 : 0.82 + prominence * (desktopFront - .82);
  targetPosition.z += prominence * 0.75;
  if (idle) { targetPosition.x *= 0.8; targetPosition.y -= 0.08; }
  if (focus && chosen) {
    targetPosition.set(0, narrow ? -0.35 : -0.45, narrow ? 2.5 : 4.1);
    targetEuler.set(0, Math.PI, 0);
    scale = narrow ? 1.66 : 1.52;
  } else if (focus) {
    targetPosition.x *= 1.18; targetPosition.z -= 2.5;
    scale = 0.66;
  }
  if (sealed) {
    targetPosition.set(offset * 0.018, -0.1 + Math.abs(offset) * 0.012, 0.5 - Math.abs(offset) * 0.065);
    targetEuler.set(0.1, 0, offset * 0.016);
    scale = narrow ? 1.45 : 1.15;
  }
  targetPosition.y -= narrow ? 0.55 : 0.50;
  if (!narrow && !focus && !sealed) targetPosition.y -= prominence * (desktopFront - 1.52) * (idle ? .35 : .6);
  if (!reduced && !sealed) targetPosition.y += Math.sin(seconds * 0.7 + index * 0.8) * 0.035;
  return scale;
}
