import type { HandSample } from './hand-navigation';

/** Draw only landmarks and feedback; never copy the hidden camera frame. */
export function paintHandPreview(ctx: CanvasRenderingContext2D, sample: HandSample | null) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  if (!sample) return;
  const xs = sample.landmarks.map(point => point.x), ys = sample.landmarks.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = Math.min((width - 80) / Math.max(0.05, maxX - minX), (height - 70) / Math.max(0.05, maxY - minY));
  const project = (point: { x: number; y: number }) => ({ x: width / 2 - (point.x - (minX + maxX) / 2) * scale, y: (height - 30) / 2 + (point.y - (minY + maxY) / 2) * scale });
  ctx.save();
  ctx.strokeStyle = sample.canBrowse ? '#bde9e0' : '#e0c899';
  ctx.shadowColor = sample.canBrowse ? '#7bd8c5' : '#c1a9ff'; ctx.shadowBlur = 7; ctx.lineWidth = 2;
  for (const line of [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]]) {
    ctx.beginPath();
    line.forEach((id, i) => { const point = project(sample.landmarks[id]); if (i) ctx.lineTo(point.x, point.y); else ctx.moveTo(point.x, point.y); });
    ctx.stroke();
  }
  for (const landmark of sample.landmarks) {
    const point = project(landmark); ctx.beginPath(); ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#e6d3ad'; ctx.fill();
  }
  // The skeleton stays centered, while this rail shows real mirrored hand travel.
  ctx.shadowBlur = 0; ctx.lineWidth = 1; ctx.strokeStyle = '#d7bd8b55';
  ctx.beginPath(); ctx.moveTo(30, height - 19); ctx.lineTo(width - 30, height - 19); ctx.stroke();
  ctx.fillStyle = sample.canBrowse ? '#bde9e0' : '#d7bd8b';
  ctx.beginPath(); ctx.arc(30 + sample.x * (width - 60), height - 19, 5, 0, Math.PI * 2); ctx.fill();
  if (sample.gesture === 'Pointing_Up') {
    const tip = project(sample.landmarks[8]);
    ctx.lineWidth = 3; ctx.strokeStyle = '#f7d399';
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * sample.actionProgress); ctx.stroke();
  }
  ctx.restore();
}
