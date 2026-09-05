import * as THREE from 'three';

export const CARD_SIZE = { width: 1.43, height: 2.39, depth: 0.060 } as const;
export const FRAME = {
  desktop: { x: 4.55, y: 4.55 },
  mobile: { x: 4.3, y: 4.3 },
} as const;
export const FRAME_INNER_RATIO = 0.926;
export const CARD_CLEAR_RADIUS = 0.88;
export const CRYSTAL_TRACK_RATIO = 0.99;
export const CRYSTAL_BOUND_RADIUS = 0.40;

export function protectedInnerRatio(narrow: boolean) {
  const axes = narrow ? FRAME.mobile : FRAME.desktop;
  return Math.min(FRAME_INNER_RATIO, CRYSTAL_TRACK_RATIO - CRYSTAL_BOUND_RADIUS / Math.min(axes.x, axes.y));
}

export interface StageBounds { left: number; top: number; right: number; bottom: number }

/** Bounds are canvas-local: do not reserve the page header a second time. */
export function framePlacement(width: number, height: number, narrow: boolean, idle: boolean, bounds?: StageBounds) {
  const axes = narrow ? FRAME.mobile : FRAME.desktop;
  if (bounds) {
    const usableWidth = narrow ? Math.max(1, bounds.right - bounds.left) : width * (idle ? .56 : .87);
    const usableHeight = Math.max(1, bounds.bottom - bounds.top);
    return {
      pixelsPerUnit: Math.min(usableWidth / (axes.x * 2 * CRYSTAL_TRACK_RATIO + 0.85), usableHeight / (axes.y * 2 * CRYSTAL_TRACK_RATIO + 0.85)),
      centerX: narrow ? (bounds.left + bounds.right) / 2 : width * (idle ? .69 : .5),
      centerY: (bounds.top + bounds.bottom) / 2,
    };
  }
  const top = narrow ? 165 : 24;
  const bottom = narrow ? 151 : idle ? 130 : 170;
  const usableHeight = Math.max(160, height - top - bottom);
  const usableWidth = width * (narrow ? 0.9 : idle ? 0.56 : 0.87);
  const pixelsPerUnit = Math.min(usableWidth / (axes.x * 2 * CRYSTAL_TRACK_RATIO + 0.85), usableHeight / (axes.y * 2 * CRYSTAL_TRACK_RATIO + 0.85));
  return { pixelsPerUnit, centerX: width * (idle && !narrow ? 0.69 : 0.5), centerY: top + usableHeight / 2 };
}

const corners = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1, 1].map(z =>
  new THREE.Vector3(x * CARD_SIZE.width / 2, y * CARD_SIZE.height / 2, z * CARD_SIZE.depth / 2))));
const center = new THREE.Vector3();
const horizontal = new THREE.Vector3();
const vertical = new THREE.Vector3();
const corner = new THREE.Vector3();

/** Measure the actual projected card corners against the camera-facing inner rim. */
export function projectedCardRadius(cards: readonly THREE.Object3D[], frame: THREE.Object3D, camera: THREE.Camera, narrow: boolean) {
  const axes = narrow ? FRAME.mobile : FRAME.desktop;
  frame.updateWorldMatrix(true, false);
  center.set(0, 0, 0).applyMatrix4(frame.matrixWorld).project(camera);
  horizontal.set(axes.x * protectedInnerRatio(narrow), 0, 0).applyMatrix4(frame.matrixWorld).project(camera);
  vertical.set(0, axes.y * protectedInnerRatio(narrow), 0).applyMatrix4(frame.matrixWorld).project(camera);
  const radiusX = Math.abs(horizontal.x - center.x);
  const radiusY = Math.abs(vertical.y - center.y);
  let maximum = 0;
  for (const card of cards) {
    if (!card.visible) continue;
    card.updateWorldMatrix(true, false);
    for (const point of corners) {
      corner.copy(point).applyMatrix4(card.matrixWorld).project(camera);
      maximum = Math.max(maximum, Math.hypot((corner.x - center.x) / radiusX, (corner.y - center.y) / radiusY));
    }
  }
  return maximum;
}

/** Measure after interpolation; eight projected vertices bound every face of the convex card. */
export function fitCardsInsideFrame(table: THREE.Group, cards: readonly THREE.Object3D[], frame: THREE.Object3D, camera: THREE.Camera, narrow: boolean, figureBounds: readonly THREE.Box3[] = [], viewportHeight = 1) {
  table.scale.setScalar(1);
  // Box corners include the current Y-axis turn and real plinth geometry supplied by the clock.
  let floor = Infinity;
  for (const box of figureBounds) for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    corner.set(x, y, z).project(camera); floor = Math.min(floor, corner.y);
  }
  const fits = () => {
    if (projectedCardRadius(cards, frame, camera, narrow) > CARD_CLEAR_RADIUS) return false;
    if (!Number.isFinite(floor)) return true;
    let ceiling = -Infinity;
    for (const card of cards) {
      if (!card.visible) continue;
      card.updateWorldMatrix(true, false);
      for (const p of corners) { corner.copy(p).applyMatrix4(card.matrixWorld).project(camera); ceiling = Math.max(ceiling, corner.y); }
    }
    return (floor - ceiling) * viewportHeight / 2 >= 12;
  };
  if (fits()) return 1;
  // Shrinking depth too means perspective is nonlinear. Bisection is bounded and conservative.
  let safe = 0;
  let unsafe = 1;
  for (let attempt = 0; attempt < 18; attempt++) {
    const candidate = (safe + unsafe) / 2;
    table.scale.setScalar(candidate);
    if (fits()) safe = candidate;
    else unsafe = candidate;
  }
  table.scale.setScalar(safe);
  return safe;
}

const placementCenter = new THREE.Vector3();
const cameraForward = new THREE.Vector3();

/** Smooth the whole assembly; collision fitting runs on the resulting interpolated frame. */
export function placeStage(stage: THREE.Group, camera: THREE.PerspectiveCamera, width: number, height: number, placement: ReturnType<typeof framePlacement>, blend: number) {
  camera.updateMatrixWorld();
  camera.getWorldDirection(cameraForward);
  placementCenter.set(placement.centerX / width * 2 - 1, 1 - placement.centerY / height * 2, 0.5).unproject(camera);
  placementCenter.sub(camera.position);
  placementCenter.multiplyScalar(14 / placementCenter.dot(cameraForward)).add(camera.position);
  stage.position.lerp(placementCenter, blend);
  stage.quaternion.copy(camera.quaternion);
  const basePixelsPerUnit = height / (28 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  stage.scale.setScalar(THREE.MathUtils.lerp(stage.scale.x, placement.pixelsPerUnit / basePixelsPerUnit, blend));
}
