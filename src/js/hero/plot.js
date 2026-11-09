/**
 * Spectrum plot (canvas) in the manim style:
 *  - axes draw themselves in on first show ("Create")
 *  - the trace morphs smoothly between states ("Transform")
 *  - glowing strokes via a wide faint pass + a thin bright pass
 *  - live laser cursor, peak label, thermometry line labels, comb teeth
 */
import { createMorph } from "../anim/transform.js";
import { smooth } from "../anim/easing.js";
import { COMB } from "./modes.js";

const COLORS = {
  axis: "rgba(236,233,226,0.45)",
  grid: "rgba(88,196,221,0.07)",
  label: "#8b93a1",
  blue: "#58C4DD",
  gold: "#F0AC5F",
  yellow: "#F7D96F",
  red: "#FC6255",
  purple: "#B48AD0",
  teal: "#5CD0B3",
};
const MODE_COLOR = { direct: COLORS.blue, wms: COLORS.gold, dualcomb: COLORS.purple };
const MONO = '500 10px "JetBrains Mono", ui-monospace, monospace';
const AXES_DRAW_MS = 900;

/** Rounds a value up to a "nice" axis limit (1, 2, 2.5, 5 × 10ⁿ). */
function niceCeil(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

function formatTick(v) {
  return v === 0 ? "0" : String(Number(v.toPrecision(3)));
}

export function createPlot(canvas) {
  const ctx = canvas.getContext("2d");
  const traceMorph = createMorph(650);
  const rangeMorph = createMorph(650);
  let view = null;              // latest computeView() result
  let range = [0, 1];           // y-axis [min, max] target (with hysteresis)
  let size = { w: 0, h: 0, dpr: 1 };
  let axesStart = null;         // time the axes started drawing in
  let markers = null;           // thermometry lines {hot, cold}

  /* ---------- layout ---------- */

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = { w: r.width, h: r.height, dpr };
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }

  /** Plot areas: one panel, or optical + RF panels for dual-comb. */
  function panels() {
    const pad = { l: 40, r: 10, t: 12, b: 28 };
    const full = { x: pad.l, y: pad.t, w: size.w - pad.l - pad.r, h: size.h - pad.t - pad.b };
    if (view?.mode !== "dualcomb") return { main: full };
    const split = Math.round(full.h * 0.62);
    return {
      main: { ...full, h: split - 24 },
      rf: { x: full.x, y: full.y + split + 20, w: full.w, h: full.h - split - 20 },
    };
  }

  /* ---------- data → targets ---------- */

  /** Chooses the y-range for the new data, keeping it steady unless it no longer fits well. */
  function nextRange(v) {
    if (v.mode === "dualcomb") {
      const min = Math.min(...v.y);
      const lo = Math.max(0, 1 - niceCeil((1 - min) * 1.25));
      return [lo, 1];
    }
    const max = Math.max(...v.y);
    const [, cur] = range;
    const modeChanged = view && view.mode !== v.mode;
    if (modeChanged || max > cur * 0.95 || max < cur * 0.35) return [0, niceCeil(max * 1.15)];
    return range;
  }

  /* ---------- drawing helpers ---------- */

  const xOf = (p, nu) => p.x + ((nu - view.grid[0]) / (view.grid[view.grid.length - 1] - view.grid[0])) * p.w;
  const yOf = (p, v, [lo, hi]) => p.y + p.h - ((v - lo) / (hi - lo)) * p.h;

  function drawGrid(p, yr, progress) {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 4; i++) {
      const y = p.y + p.h - (p.h * i) / 4;
      ctx.moveTo(p.x, y);
      ctx.lineTo(p.x + p.w * progress, y);
    }
    ctx.stroke();

    ctx.fillStyle = COLORS.label;
    ctx.font = MONO;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = progress;
    for (let i = 0; i <= 4; i++) {
      const v = yr[0] + ((yr[1] - yr[0]) * i) / 4;
      ctx.fillText(formatTick(v), p.x - 6, yOf(p, v, yr));
    }
    ctx.globalAlpha = 1;
  }

  function drawAxes(p, progress, xTicks, xLabel, labelX = p.x + p.w / 2) {
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h - p.h * progress);           // y axis grows upward
    ctx.lineTo(p.x, p.y + p.h);
    ctx.lineTo(p.x + p.w * progress, p.y + p.h);           // x axis grows rightward
    ctx.stroke();

    ctx.globalAlpha = progress;
    ctx.fillStyle = COLORS.label;
    ctx.font = MONO;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    xTicks.forEach(([pos, label]) => {
      ctx.beginPath();
      ctx.moveTo(pos, p.y + p.h);
      ctx.lineTo(pos, p.y + p.h + 4);
      ctx.stroke();
      ctx.fillText(label, pos, p.y + p.h + 7);
    });
    ctx.fillText(xLabel, labelX, p.y + p.h + 7);          // default: centred between the middle ticks
    ctx.globalAlpha = 1;
  }

  function opticalTicks(p) {
    const ticks = [];
    for (let nu = Math.ceil(view.grid[0] / 5) * 5; nu <= view.grid[view.grid.length - 1]; nu += 5) ticks.push([xOf(p, nu), String(nu)]);
    return ticks;
  }

  /** Glowing polyline: wide translucent pass, then thin bright pass, additive blend. */
  function glowLine(points, color, width = 1.8) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    for (const [w, a] of [[width * 4, 0.12], [width * 2, 0.22], [width, 1]]) {
      ctx.globalAlpha = a;
      ctx.lineWidth = w;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTrace(p, values, yr, color, progress) {
    const n = Math.max(2, Math.floor(values.length * progress));
    const pts = new Array(n);
    for (let i = 0; i < n; i++) pts[i] = [xOf(p, view.grid[i]), yOf(p, values[i], yr)];

    // soft fill under the curve
    const grad = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    grad.addColorStop(0, color + "33");
    grad.addColorStop(1, color + "00");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], p.y + p.h);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[n - 1][0], p.y + p.h);
    ctx.fill();

    glowLine(pts, color);
  }

  function drawCursor(p, nu, values, yr) {
    if (nu == null) return;
    const x = xOf(p, nu);
    const i = Math.round(((nu - view.grid[0]) / (view.grid[view.grid.length - 1] - view.grid[0])) * (values.length - 1));
    const y = yOf(p, values[Math.max(0, Math.min(values.length - 1, i))], yr);
    ctx.save();
    ctx.strokeStyle = COLORS.red;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x, p.y);
    ctx.lineTo(x, p.y + p.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.red;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPeakLabel(p, values, yr) {
    let k = 0;
    for (let i = 1; i < values.length; i++) if (values[i] > values[k]) k = i;
    const x = xOf(p, view.grid[k]), y = yOf(p, values[k], yr);
    const text = `${view.mode === "wms" ? "2f/1f" : "α"} = ${values[k].toFixed(3)}`;
    ctx.save();
    ctx.font = MONO;
    ctx.fillStyle = COLORS.yellow;
    ctx.textAlign = x > p.x + p.w * 0.75 ? "right" : "left";
    ctx.textBaseline = "bottom";
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(text, x + (ctx.textAlign === "left" ? 7 : -7), Math.max(p.y + 10, y - 3));
    ctx.restore();
  }

  /** Labels the high-E″ (grows with T) and low-E″ (fades with T) lines in direct mode. */
  function drawThermometryLabels(p, values, yr) {
    if (!markers) return;
    const items = [[markers.hot, "high E″ ↑T", COLORS.gold], [markers.cold, "low E″ ↓T", COLORS.teal]];
    ctx.save();
    ctx.font = MONO;
    ctx.textAlign = "center";
    items.forEach(([line, text, color]) => {
      if (!line) return;
      const x = xOf(p, line.nu);
      const i = Math.round(((line.nu - view.grid[0]) / (view.grid[view.grid.length - 1] - view.grid[0])) * (values.length - 1));
      const y = yOf(p, values[i], yr);
      const ty = Math.max(p.y + 12, y - 22);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, ty + 4);
      ctx.lineTo(x, y - 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      const lx = Math.min(Math.max(x, p.x + 34), p.x + p.w - 34);
      const w = ctx.measureText(text).width + 8;
      ctx.fillStyle = "rgba(14,16,21,0.9)";
      ctx.fillRect(lx - w / 2, ty - 11, w, 14);
      ctx.fillStyle = color;
      ctx.fillText(text, lx, ty);
    });
    ctx.restore();
  }

  /** Dual-comb: probe teeth (blue) sampling the transmission + local-oscillator teeth (purple). */
  function drawOpticalTeeth(p, values, yr) {
    const interp = (nu) => {
      const f = ((nu - view.grid[0]) / (view.grid[view.grid.length - 1] - view.grid[0])) * (values.length - 1);
      const i = Math.max(0, Math.min(values.length - 2, Math.floor(f)));
      return values[i] + (values[i + 1] - values[i]) * (f - i);
    };
    ctx.save();
    ctx.lineWidth = 1;
    view.teeth.forEach((t) => {
      const x = xOf(p, t.nu);
      ctx.strokeStyle = COLORS.blue;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(x, p.y + p.h);
      ctx.lineTo(x, yOf(p, interp(t.nu), yr));
      ctx.stroke();
      ctx.strokeStyle = COLORS.purple;
      ctx.globalAlpha = 0.6;
      const xb = x + Math.min(4, (p.w / view.teeth.length) * 0.3);
      ctx.beginPath();
      ctx.moveTo(xb, p.y);
      ctx.lineTo(xb, p.y + 7);
      ctx.stroke();
    });
    ctx.restore();
    return interp;
  }

  /** Dual-comb RF panel: the same samples as beat notes at f_n = f₀ + n·Δf_rep. */
  function drawRfPanel(rf, interp, yr, progress) {
    const teeth = view.teeth;
    const fMin = teeth[0].rfMHz - 0.05, fMax = teeth[teeth.length - 1].rfMHz + 0.05;
    const xRf = (f) => rf.x + ((f - fMin) / (fMax - fMin)) * rf.w;
    const ticks = [];
    for (let f = Math.ceil(fMin * 2) / 2; f <= fMax; f += 0.5) {
      if (xRf(f) < rf.x + rf.w - 70) ticks.push([xRf(f), f.toFixed(1)]);   // keep room for the axis label
    }
    drawAxes(rf, progress, ticks, "f_RF (MHz)", rf.x + rf.w - 30);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = COLORS.purple;
    ctx.lineWidth = 2;
    teeth.forEach((t) => {
      const v = (interp(t.nu) - yr[0]) / (yr[1] - yr[0]);   // same normalization as optical panel
      const x = xRf(t.rfMHz);
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(x, rf.y + rf.h);
      ctx.lineTo(x, rf.y + rf.h - Math.max(0, v) * rf.h * progress);
      ctx.stroke();
    });
    ctx.restore();

    ctx.fillStyle = COLORS.label;
    ctx.font = MONO;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const caption = `RF beat notes · optical × 1/${(COMB.frepGHz * 1e6 / COMB.dfrepKHz).toLocaleString("en-US")}`;
    ctx.fillStyle = "rgba(14,16,21,0.92)";
    ctx.fillRect(rf.x + 2, rf.y - 2, ctx.measureText(caption).width + 10, 15);
    ctx.fillStyle = COLORS.label;
    ctx.fillText(caption, rf.x + 6, rf.y);
  }

  /* ---------- public API ---------- */

  return {
    resize,

    /** New data from computeView(). Starts a smooth morph to it. */
    setView(v, { animate = true, thermometry = null } = {}) {
      const now = performance.now();
      if (thermometry) markers = thermometry;
      range = nextRange(v);
      view = v;
      traceMorph.to(v.y, now);
      rangeMorph.to(range, now);
      if (!animate) { traceMorph.finish(); rangeMorph.finish(); }
    },

    /** Starts the axes draw-in animation. */
    reveal(animate = true) { axesStart = animate ? performance.now() : -Infinity; },

    /** Draws one frame. Returns true while an animation is still running. */
    draw(now, cursorNu) {
      if (!view || !size.w) return false;
      const { values, done: traceDone } = traceMorph.sample(now);
      const { values: yr } = rangeMorph.sample(now);
      const t = axesStart == null ? 0 : Math.min(1, (now - axesStart) / AXES_DRAW_MS);
      const progress = smooth(t);
      const traceProgress = smooth(Math.max(0, Math.min(1, (t - 0.25) / 0.75)));

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      const { main, rf } = panels();
      const color = MODE_COLOR[view.mode];

      drawGrid(main, yr, progress);
      drawAxes(main, progress, opticalTicks(main), "ν (cm⁻¹)");
      if (traceProgress > 0) {
        drawTrace(main, values, yr, view.mode === "dualcomb" ? COLORS.blue : color, traceProgress);
        if (traceProgress >= 1) {
          if (view.mode === "dualcomb") {
            const interp = drawOpticalTeeth(main, values, yr);
            drawRfPanel(rf, interp, yr, progress);
          } else {
            drawPeakLabel(main, values, yr);
            if (view.mode === "direct") drawThermometryLabels(main, values, yr);
          }
          drawCursor(main, cursorNu, values, yr);
        }
      }
      return !traceDone || t < 1;
    },
  };
}
