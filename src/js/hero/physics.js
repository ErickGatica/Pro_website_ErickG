/**
 * Absorption spectroscopy physics for the hero simulation.
 *
 * Everything here is pure math (no DOM), so it can be unit-tested in
 * tests/physics.test.html against HITRAN/HAPI reference spectra.
 *
 * Units: wavenumber ν in cm⁻¹, temperature T in K, pressure P in atm,
 * mole fraction x (0–1), path length L in cm. Absorbance is natural-log
 * (α = −ln(I/I₀)).
 */

const C2 = 1.4387769;            // second radiation constant, cm·K
const K_B = 1.380649e-23;        // Boltzmann constant, J/K
const C_LIGHT = 2.99792458e8;    // speed of light, m/s
const AMU = 1.66053907e-27;      // atomic mass unit, kg
const ATM_TO_PA = 101325;
const LN2 = Math.LN2;
const SQRT_LN2_PI = Math.sqrt(LN2 / Math.PI);
const WING_CM = 25;              // ignore a line farther than this from ν (same as the HAPI reference)

/* ------------------------------------------------------------------ */
/* Thermodynamics                                                      */
/* ------------------------------------------------------------------ */

/** Partition function Q(T), linearly interpolated from the tabulated values. */
export function partitionFunction(data, T) {
  const { T0, dT, values } = data.Q;
  const pos = Math.min(Math.max((T - T0) / dT, 0), values.length - 1.0001);
  const i = Math.floor(pos);
  return values[i] + (values[i + 1] - values[i]) * (pos - i);
}

/** Number density of the absorbing gas, molecules per cm³. */
export function numberDensity(T, P, x) {
  return (x * P * ATM_TO_PA) / (K_B * T) * 1e-6;
}

/** Line strength S(T) scaled from the HITRAN reference temperature (cm⁻¹/(molecule·cm⁻²)). */
export function lineStrength(S0, nu0, Elower, T, Qratio, Tref) {
  const boltzmann = Math.exp(-C2 * Elower * (1 / T - 1 / Tref));
  const stimulated = (1 - Math.exp(-C2 * nu0 / T)) / (1 - Math.exp(-C2 * nu0 / Tref));
  return S0 * Qratio * boltzmann * stimulated;
}

/* ------------------------------------------------------------------ */
/* Line shape                                                          */
/* ------------------------------------------------------------------ */

/** Doppler half-width at half-maximum (cm⁻¹). */
export function dopplerHWHM(nu0, T, massAmu) {
  return (nu0 / C_LIGHT) * Math.sqrt((2 * LN2 * K_B * T) / (massAmu * AMU));
}

/** Collisional (Lorentzian) half-width at half-maximum (cm⁻¹). */
export function collisionalHWHM(gAir, gSelf, nAir, T, P, x, Tref) {
  return P * (x * gSelf + (1 - x) * gAir) * Math.pow(Tref / T, nAir);
}

/**
 * Pseudo-Voigt parameters (Thompson–Cox–Hastings): total width f and mixing η.
 * Takes Gaussian and Lorentzian HWHMs; returns {f (HWHM), eta}.
 */
export function pseudoVoigtParams(gD, gL) {
  const fG = 2 * gD, fL = 2 * gL;   // TCH works with full widths
  const f = Math.pow(
    fG ** 5 + 2.69269 * fG ** 4 * fL + 2.42843 * fG ** 3 * fL ** 2 +
    4.47163 * fG ** 2 * fL ** 3 + 0.07842 * fG * fL ** 4 + fL ** 5, 0.2);
  const r = fL / f;
  const eta = 1.36603 * r - 0.47719 * r * r + 0.11116 * r ** 3;
  return { hwhm: f / 2, eta };
}

/** Area-normalized pseudo-Voigt profile value at detuning d (cm). */
export function pseudoVoigt(d, hwhm, eta) {
  const u = d / hwhm;
  const lorentz = 1 / (Math.PI * hwhm * (1 + u * u));
  const gauss = (SQRT_LN2_PI / hwhm) * Math.exp(-LN2 * u * u);
  return eta * lorentz + (1 - eta) * gauss;
}

/* ------------------------------------------------------------------ */
/* Spectra                                                             */
/* ------------------------------------------------------------------ */

/** Evenly spaced wavenumber grid over the data's display window. */
export function makeGrid(data, n = 600) {
  const [a, b] = data.window_cm;
  return Float64Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

/**
 * Per-line quantities that depend on conditions but not on ν.
 * Computing these once per slider change keeps the spectrum loop cheap.
 */
export function prepareLines(data, { T, P, x }) {
  const L = data.lines;
  const Qratio = data.Q_ref / partitionFunction(data, T);
  const out = [];
  for (let j = 0; j < L.nu.length; j++) {
    // Pressure shift: HITRAN gives only δ_air here (δ_self taken as 0, as HAPI does)
    const center = L.nu[j] + (1 - x) * L.delta_air[j] * P;
    const S = lineStrength(L.sw[j], L.nu[j], L.elower[j], T, Qratio, data.T_ref);
    const gD = dopplerHWHM(L.nu[j], T, data.mass_amu);
    const gL = collisionalHWHM(L.gamma_air[j], L.gamma_self[j], L.n_air[j], T, P, x, data.T_ref);
    const { hwhm, eta } = pseudoVoigtParams(gD, gL);
    out.push({ center, S, hwhm, eta, elower: L.elower[j] });
  }
  return out;
}

/**
 * Absorbance α(ν) on `grid` for the given conditions {T, P, x, L}.
 *
 * `grid` must be evenly spaced (see makeGrid). Each line is evaluated only
 * within its wing: WING_CM by default (matches the HAPI reference), or
 * `wingHW` half-widths when given, which is much faster for live display.
 */
export function absorbanceSpectrum(data, grid, cond, { wingHW = null } = {}) {
  const lines = prepareLines(data, cond);
  const columnDensity = numberDensity(cond.T, cond.P, cond.x) * cond.L;
  const alpha = new Float64Array(grid.length);
  const nu0 = grid[0];
  const step = grid[1] - grid[0];
  const last = grid.length - 1;

  for (const line of lines) {
    const amp = line.S * columnDensity;
    const wing = wingHW ? Math.min(WING_CM, wingHW * line.hwhm) : WING_CM;
    const i0 = Math.max(0, Math.ceil((line.center - wing - nu0) / step));
    const i1 = Math.min(last, Math.floor((line.center + wing - nu0) / step));
    for (let i = i0; i <= i1; i++) {
      alpha[i] += amp * pseudoVoigt(grid[i] - line.center, line.hwhm, line.eta);
    }
  }
  return alpha;
}

/**
 * The two lines that make temperature visible: the strongest high-E″ line
 * (grows with T) and the strongest low-E″ line (fades with T) in the window.
 */
export function thermometryLines(data) {
  const [a, b] = data.window_cm;
  const L = data.lines;
  let hot = null, cold = null;
  for (let j = 0; j < L.nu.length; j++) {
    if (L.nu[j] < a + 0.3 || L.nu[j] > b - 0.3) continue;
    const hotScore = L.sw[j] * Math.exp(-C2 * L.elower[j] * (1 / 1500 - 1 / data.T_ref));
    const coldScore = L.sw[j];
    if (L.elower[j] > 1500 && (!hot || hotScore > hot.score)) hot = { nu: L.nu[j], elower: L.elower[j], score: hotScore };
    if (L.elower[j] < 400 && (!cold || coldScore > cold.score)) cold = { nu: L.nu[j], elower: L.elower[j], score: coldScore };
  }
  return { hot, cold };
}

/** Transmission I/I₀ = exp(−α). */
export const transmission = (alpha) => alpha.map((a) => Math.exp(-a));

/** Convert wavenumber (cm⁻¹) to vacuum wavelength (nm). */
export const wavenumberToNm = (nu) => 1e7 / nu;

/* ------------------------------------------------------------------ */
/* Wavelength-modulation spectroscopy (WMS-2f/1f)                      */
/* ------------------------------------------------------------------ */

/**
 * WMS-2f/1f signal versus mean laser wavenumber.
 *
 * The laser is modulated as ν(t) = ν̄ + a·cos(ωt) with linear intensity
 * modulation I₀(t) = 1 + i₁·cos(ωt + ψ). The transmitted signal is projected
 * onto the 1f and 2f harmonics (a digital lock-in) and normalized: 2f/1f.
 *
 * @param alphaAt  function ν → absorbance (for the current conditions)
 * @param grid     mean wavenumbers ν̄ to evaluate
 * @param a        modulation depth (cm⁻¹)
 * @param steps    samples per modulation period
 */
export function wms2f1f(alphaAt, grid, a, { i1 = 0.1, psi = Math.PI * 0.9, steps = 48 } = {}) {
  const out = new Float64Array(grid.length);
  const cos = Float64Array.from({ length: steps }, (_, k) => Math.cos((2 * Math.PI * k) / steps));
  const sin = Float64Array.from({ length: steps }, (_, k) => Math.sin((2 * Math.PI * k) / steps));
  const cos2 = Float64Array.from({ length: steps }, (_, k) => Math.cos((4 * Math.PI * k) / steps));
  const sin2 = Float64Array.from({ length: steps }, (_, k) => Math.sin((4 * Math.PI * k) / steps));
  const cosPsi = Math.cos(psi), sinPsi = Math.sin(psi);

  for (let i = 0; i < grid.length; i++) {
    let X1 = 0, Y1 = 0, X2 = 0, Y2 = 0;
    for (let k = 0; k < steps; k++) {
      const I0 = 1 + i1 * (cos[k] * cosPsi - sin[k] * sinPsi);
      const It = I0 * Math.exp(-alphaAt(grid[i] + a * cos[k]));
      X1 += It * cos[k]; Y1 += It * sin[k];
      X2 += It * cos2[k]; Y2 += It * sin2[k];
    }
    out[i] = Math.hypot(X2, Y2) / Math.hypot(X1, Y1);
  }
  return out;
}

/**
 * Builds a fast α(ν) evaluator by linear interpolation on a dense precomputed
 * spectrum. WMS needs α at many off-grid points; this keeps it real-time.
 */
export function makeAlphaInterpolator(grid, alpha) {
  const a = grid[0], step = grid[1] - grid[0], last = grid.length - 1;
  return (nu) => {
    const pos = (nu - a) / step;
    if (pos <= 0) return alpha[0];
    if (pos >= last) return alpha[last];
    const i = pos | 0;
    return alpha[i] + (alpha[i + 1] - alpha[i]) * (pos - i);
  };
}

/** Removes the zero-absorption 2f/1f baseline (from the intensity modulation). */
export function subtractBaseline(signal) {
  let min = Infinity;
  for (const v of signal) min = Math.min(min, v);
  return signal.map((v) => v - min);
}

/** Typical collisional HWHM in the window, used to suggest an optimal WMS depth (~2.2 × HWHM). */
export function typicalHWHM(data, cond) {
  const lines = prepareLines(data, cond);
  const strongest = lines.reduce((m, l) => (l.S > m.S ? l : m), lines[0]);
  return strongest.hwhm;
}
