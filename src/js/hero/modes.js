/**
 * Measurement modes for the hero card. Each mode turns the physics into
 * what an instrument would show:
 *
 *   direct    absorbance α(ν)
 *   wms       wavelength-modulation 2f/1f signal versus mean wavenumber
 *   dualcomb  transmission sampled by comb teeth, and the same samples
 *             mapped to radio-frequency beat notes
 *
 * computeView(data, state) returns everything the plot and readouts need.
 */
import {
  absorbanceSpectrum, makeGrid, makeAlphaInterpolator, wms2f1f,
  subtractBaseline, typicalHWHM, wavenumberToNm,
} from "./physics.js";

const PLOT_POINTS = 480;          // points drawn on the plot
const DENSE_POINTS = 3000;        // dense absorbance grid used for WMS and comb sampling
const WING_HW = 60;               // live-display line wing (half-widths)

/* Dual-comb illustration: tooth spacing (optical) and the RF compression factor */
export const COMB = {
  spacingCm: 0.25,                // f_rep ≈ 7.5 GHz (wide, so teeth are visible)
  frepGHz: 7.5,
  dfrepKHz: 50,                   // Δf_rep → compression f_rep/Δf_rep = 150 000
  rfOffsetMHz: 0.4,
};

export const MODES = {
  direct: { label: "Direct", yLabel: "Absorbance α(ν)" },
  wms: { label: "WMS-2f", yLabel: "2f/1f signal" },
  dualcomb: { label: "Dual-comb", yLabel: "Transmission I/I₀" },
};

/** Dense absorbance on a fine grid plus a fast interpolator α(ν). */
function denseAbsorbance(data, cond) {
  const dense = makeGrid(data, DENSE_POINTS);
  const alpha = absorbanceSpectrum(data, dense, cond, { wingHW: WING_HW });
  return { dense, alpha, alphaAt: makeAlphaInterpolator(dense, alpha) };
}

/** Comb teeth inside the window, each sampling the transmission. */
export function combTeeth(data, transmissionAt) {
  const [a, b] = data.window_cm;
  const first = Math.ceil(a / COMB.spacingCm) * COMB.spacingCm + COMB.spacingCm / 2;
  const teeth = [];
  for (let nu = first, n = 0; nu < b; nu += COMB.spacingCm, n++) {
    const rfMHz = COMB.rfOffsetMHz + (n * COMB.dfrepKHz) / 1000;
    teeth.push({ nu, n, rfMHz, value: transmissionAt(nu) });
  }
  return teeth;
}

function peakOf(grid, y) {
  let k = 0;
  for (let i = 1; i < y.length; i++) if (y[i] > y[k]) k = i;
  return { nu: grid[k], value: y[k] };
}

/** Builds the plot trace and readouts for the current state {mode, T, P, x, L, a}. */
export function computeView(data, state) {
  const cond = { T: state.T, P: state.P, x: state.x, L: state.L };
  const grid = makeGrid(data, PLOT_POINTS);
  const { alphaAt } = denseAbsorbance(data, cond);
  const alpha = grid.map(alphaAt);
  const alphaPeak = peakOf(grid, alpha);
  const base = { mode: state.mode, grid, alpha, alphaAt, yLabel: MODES[state.mode].yLabel };

  if (state.mode === "wms") {
    const y = subtractBaseline(wms2f1f(alphaAt, grid, state.a));
    const hwhm = typicalHWHM(data, cond);
    const peak = peakOf(grid, y);
    return {
      ...base, y, peak,
      readouts: [
        ["2f/1f peak", peak.value.toFixed(3)],
        ["Mod. depth a", `${state.a.toFixed(3)} cm⁻¹`],
        ["Optimal a ≈", `${(2.2 * hwhm).toFixed(3)} cm⁻¹`],
      ],
      note: "The 2f peak is largest when a ≈ 2.2 × the line's half-width.",
    };
  }

  if (state.mode === "dualcomb") {
    const y = alpha.map((v) => Math.exp(-v));
    const teeth = combTeeth(data, (nu) => Math.exp(-alphaAt(nu)));
    const min = Math.min(...y);
    return {
      ...base, y, teeth, peak: { nu: grid[y.indexOf(min)], value: min },
      readouts: [
        ["Comb teeth", String(teeth.length)],
        ["f_rep · Δf_rep", `${COMB.frepGHz} GHz · ${COMB.dfrepKHz} kHz`],
        ["Min I/I₀", min.toFixed(3)],
      ],
      note: "Illustrative comb spacing; the optical → RF mapping is exact.",
    };
  }

  return {
    ...base, y: alpha, peak: alphaPeak,
    readouts: [
      ["Peak α", alphaPeak.value.toFixed(3)],
      ["at λ", `${wavenumberToNm(alphaPeak.nu).toFixed(2)} nm`],
      ["Path L", `${state.L} cm`],
    ],
    note: "",
  };
}
