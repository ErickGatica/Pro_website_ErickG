/**
 * Optical path for the hero scene: laser source → gas cell → detector.
 *
 * The beam fades across the cell following Beer–Lambert, I(z) = I₀·e^(−α·z/L).
 * Real peak absorbances are ~0.1 (a 10 % dip), which is hard to see, so the
 * drawing uses a visual gain on α; the readouts always show the true values.
 */
const RED = "#FC6255";
const BLUE = "#58C4DD";
const PURPLE = "#B48AD0";
export const VISUAL_GAIN = 4;

/** Rounded rectangle path helper. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Laser head on the left: a small box with an aperture. */
function drawLaser(ctx, L) {
  ctx.save();
  ctx.strokeStyle = "rgba(236,233,226,0.55)";
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1.3;
  roundRect(ctx, L.laserX - 34, L.beamY - 13, 34, 26, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.shadowColor = RED;
  ctx.shadowBlur = 10;
  ctx.fillRect(L.laserX - 2, L.beamY - 3, 3, 6);
  ctx.restore();
}

/** Detector on the right: photodiode with a bar showing the transmitted signal. */
function drawDetector(ctx, L, transmitted) {
  ctx.save();
  ctx.strokeStyle = "rgba(236,233,226,0.55)";
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1.3;
  roundRect(ctx, L.detX, L.beamY - 16, 26, 32, 4);
  ctx.fill();
  ctx.stroke();
  const h = 24 * transmitted;
  ctx.fillStyle = RED;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(L.detX + 20, L.beamY + 12 - h, 3, h);
  ctx.restore();
}

/** Gas cell: two windows and dashed walls (manim DashedLine look). */
function drawCell(ctx, L) {
  ctx.save();
  ctx.strokeStyle = "rgba(88,196,221,0.35)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 6]);
  ctx.strokeRect(L.cellX0, L.cellY0, L.cellX1 - L.cellX0, L.cellY1 - L.cellY0);
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(88,196,221,0.7)";
  ctx.lineWidth = 2;
  for (const x of [L.cellX0, L.cellX1]) {
    ctx.beginPath();
    ctx.moveTo(x, L.beamY - 18);
    ctx.lineTo(x, L.beamY + 18);
    ctx.stroke();
  }
  ctx.restore();
}

/** One glowing beam segment whose intensity goes from i0 to i1. */
function beamSegment(ctx, x0, x1, y, i0, i1, color, dash = null, dashOffset = 0) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOffset; }
  for (const [w, a] of [[10, 0.08], [4, 0.25], [1.6, 0.95]]) {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, withAlpha(color, a * i0));
    g.addColorStop(1, withAlpha(color, a * i1));
    ctx.strokeStyle = g;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.restore();
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

/**
 * Draws the full optical path.
 * @param L       layout {laserX, detX, cellX0, cellX1, cellY0, cellY1, beamY}
 * @param alpha   true absorbance at the current laser wavenumber
 * @param mode    "direct" | "wms" | "dualcomb"
 * @param t       time in seconds (animates pulse trains)
 */
export function drawOpticalPath(ctx, L, { alpha, mode, t }) {
  const tVis = Math.exp(-Math.min(2.5, alpha * VISUAL_GAIN));
  drawCell(ctx, L);
  drawLaser(ctx, L);

  if (mode === "dualcomb") {
    // two pulse trains (comb A probes the gas, comb B is the local oscillator)
    const off = -t * 140;
    beamSegment(ctx, L.laserX, L.cellX0, L.beamY - 2, 1, 1, BLUE, [6, 10], off);
    beamSegment(ctx, L.cellX0, L.cellX1, L.beamY - 2, 1, tVis, BLUE, [6, 10], off);
    beamSegment(ctx, L.cellX1, L.detX, L.beamY - 2, tVis, tVis, BLUE, [6, 10], off);
    beamSegment(ctx, L.laserX, L.detX, L.beamY + 3, 0.7, 0.7, PURPLE, [6, 10], -t * 132);
  } else {
    // WMS: small intensity ripple from the modulation
    const ripple = mode === "wms" ? 1 + 0.08 * Math.sin(t * 40) : 1;
    beamSegment(ctx, L.laserX, L.cellX0, L.beamY, ripple, ripple, RED);
    beamSegment(ctx, L.cellX0, L.cellX1, L.beamY, ripple, ripple * tVis, RED);
    beamSegment(ctx, L.cellX1, L.detX, L.beamY, ripple * tVis, ripple * tVis, RED);
  }
  drawDetector(ctx, L, tVis);
}
