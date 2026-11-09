/**
 * Hero simulation: a laser crosses a gas of H₂O/N₂ molecules and a live
 * H₂O spectrum near 1469 nm responds to temperature, pressure and
 * concentration. Three modes: direct absorption, WMS-2f, dual-comb.
 *
 *   heroHtml()          → markup for the hero section
 *   mountHero(root)     → starts the simulation, returns a cleanup function
 *
 * Module map:  physics.js (line-by-line math, tested against HITRAN/HAPI)
 *              modes.js   (what each instrument mode plots)
 *              plot.js    (spectrum canvas)
 *              molecules.js, beam.js (scene canvas)
 */
import { site } from "../config.js";
import { $, $$, esc, icons, prefersReducedMotion } from "../utils.js";
import { indicateAll } from "../anim/indicate.js";
import { thermometryLines, wavenumberToNm } from "./physics.js";
import { computeView, MODES } from "./modes.js";
import { createPlot } from "./plot.js";
import { createGas, targetCounts } from "./molecules.js";
import { drawOpticalPath } from "./beam.js";

const SCAN_PERIOD_S = 7;            // laser sweeps the window once every 7 s
const ABSORB_GAIN = 16;             // absorption events per second per molecule per unit α (visual)
const LABEL_INTERVAL_MS = 120;

/* Slider definitions: id, label, range, formatting, which equation term it drives */
const CONTROLS = [
  { key: "T", label: "Temperature", sym: "T", min: 300, max: 2000, step: 10, fmt: (v) => `${v} K`, aria: (v) => `${v} kelvin` },
  { key: "P", label: "Pressure", sym: "P", min: 0.2, max: 5, step: 0.1, fmt: (v) => `${v.toFixed(1)} atm`, aria: (v) => `${v.toFixed(1)} atmospheres`, secondary: true },
  { key: "x", label: "H₂O fraction", sym: "x", min: 0.01, max: 0.3, step: 0.01, fmt: (v) => `${Math.round(v * 100)} %`, aria: (v) => `${Math.round(v * 100)} percent`, secondary: true },
  { key: "a", label: "Mod. depth", sym: "a", min: 0.02, max: 0.3, step: 0.005, fmt: (v) => `${v.toFixed(3)}`, aria: (v) => `${v.toFixed(3)} inverse centimeters`, secondary: true, modes: ["wms"] },
];

/* ------------------------------------------------------------------ */
/* Markup                                                              */
/* ------------------------------------------------------------------ */

const T_ = '<span class="eq-term" data-term="T"><i>T</i></span>';
const P_ = '<span class="eq-term" data-term="P"><i>P</i></span>';
const X_ = '<span class="eq-term" data-term="x"><i>x</i></span>';
const A_ = '<span class="eq-term" data-term="a"><i>a</i></span>';

const EQUATIONS = {
  direct: `<i>α</i>(<i>ν</i>) = Σ<sub><i>j</i></sub> <i>S<sub>j</sub></i>(${T_}) <i>φ<sub>j</sub></i>(<i>ν</i>; ${T_}, ${P_})
    <span class="frac"><span>${X_}${P_}<i>L</i></span><span><i>k</i><sub>B</sub>${T_}</span></span>`,
  wms: `<i>ν</i>(<i>t</i>) = <i>ν̄</i> + ${A_} cos <i>ωt</i> &nbsp;⟶&nbsp; <span class="frac"><span><i>S</i><sub>2<i>f</i></sub></span><span><i>S</i><sub>1<i>f</i></sub></span></span>`,
  dualcomb: `<i>ν<sub>n</sub></i> = <i>ν</i><sub>0</sub> + <i>n f</i><sub>rep</sub> &nbsp;⟶&nbsp; <i>f<sub>n</sub></i> = <i>f</i><sub>0</sub> + <i>n</i> Δ<i>f</i><sub>rep</sub>`,
};

function controlHtml(c) {
  return `
  <div class="control control--${c.key}${c.secondary ? " control--secondary" : ""}" data-control="${c.key}">
    <label for="hero-${c.key}">${c.label} <i>${c.sym}</i></label>
    <input type="range" id="hero-${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" />
    <output for="hero-${c.key}" id="hero-${c.key}-out"></output>
  </div>`;
}

export function heroHtml() {
  return `
  <section class="hero" id="hero" aria-label="Introduction and live spectroscopy simulation">
    <canvas class="hero__scene" id="hero-scene" aria-hidden="true"></canvas>

    <div class="hero__band" id="hero-band">
      <div class="hero__band-label hero__band-label--left" id="hero-laser-label">Laser · <b>λ = 1469 nm</b></div>
      <div class="hero__band-label hero__band-label--right" id="hero-det-label">Detector · <b>I/I₀ = 1.000</b></div>
    </div>

    <div class="container hero__grid">
      <div class="hero__intro">
        <span class="eyebrow">Ph.D. · CU Boulder · Fulbright Scholar</span>
        <h1 class="hero__name"><span>Erick</span><span class="grad-text">Gatica Candia</span></h1>
        <p class="hero__tagline">Laser absorption spectroscopy for <em>cleaner combustion</em>.</p>
        <p class="hero__bio">I build laser sensors that read temperature and gas composition straight from the light molecules absorb, now for hydrogen engines in the ${esc(site.lab)} (${esc(site.advisor)}).</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="#/research" id="hero-research">Explore research ${icons.arrow}</a>
          <a class="btn" href="#/cv" id="hero-cv">View CV</a>
        </div>
        <div class="hero__beer">
          <span class="eq write" style="--delay:600ms"><i>I</i>/<i>I</i><sub>0</sub> = <i>e</i><sup>−<i>α</i>(<i>ν</i>)</sup></span>
          <small>Beer–Lambert law<br />the physics on this page</small>
        </div>
      </div>

      <div class="spec-card" id="spec-card">
        <div class="spec-card__head">
          <span class="spec-card__title">Live H₂O spectrum · <b>1469 nm</b></span>
          <div class="modes" role="tablist" aria-label="Measurement technique">
            ${Object.entries(MODES).map(([k, m]) => `<button role="tab" type="button" data-mode="${k}" id="mode-${k}" aria-selected="false">${m.label}</button>`).join("")}
          </div>
        </div>
        <div class="spec-card__eq" id="spec-eq"></div>
        <div class="spec-plot">
          <canvas id="spec-canvas" role="img" aria-label="Simulated water absorption spectrum"></canvas>
        </div>
        <dl class="readouts" id="spec-readouts"></dl>
        <div class="controls" id="spec-controls" data-collapsed="true">
          ${CONTROLS.map(controlHtml).join("")}
          <button class="controls__toggle" type="button" id="controls-toggle" aria-expanded="false">More controls +</button>
        </div>
        <div class="spec-card__foot">
          <span class="spec-card__note" id="spec-note"></span>
          <span>HITRAN2020 · <a href="#/research/h2-engine-sensor">why it matters →</a></span>
        </div>
      </div>
    </div>
    <div class="hero__scroll" aria-hidden="true"></div>
  </section>`;
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

let spectraPromise = null;
const loadSpectra = () => (spectraPromise ??= fetch("src/data/spectra.json").then((r) => r.json()));

/* ------------------------------------------------------------------ */
/* Controls and readouts                                               */
/* ------------------------------------------------------------------ */

/** Sets the coloured fill of a range input (WebKit has no native progress fill). */
function paintSlider(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty("--fill", `${pct}%`);
}

function syncControls(root, state) {
  CONTROLS.forEach((c) => {
    const input = $(`#hero-${c.key}`, root);
    input.value = state[c.key];
    paintSlider(input);
    $(`#hero-${c.key}-out`, root).textContent = c.fmt(state[c.key]);
    input.setAttribute("aria-valuetext", c.aria(state[c.key]));
    const visible = !c.modes || c.modes.includes(state.mode);
    $(`[data-control="${c.key}"]`, root).hidden = !visible;
  });
  $$(".modes button", root).forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === state.mode)));
}

function renderReadouts(root, view) {
  $("#spec-readouts", root).innerHTML = view.readouts
    .map(([k, v]) => `<div class="readout"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("#spec-note", root).textContent = view.note;
}

function describeView(state, view) {
  const mode = MODES[state.mode].label;
  return `${mode} simulation of water absorption near 1469 nm at ${state.T} K, ${state.P.toFixed(1)} atm and ${Math.round(state.x * 100)} percent water. ${view.readouts.map(([k, v]) => `${k} ${v}`).join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/* Scene layout                                                        */
/* ------------------------------------------------------------------ */

/** Positions of the laser, gas cell, beam and detector in hero coordinates. */
function computeLayout(hero, band) {
  const h = hero.getBoundingClientRect();
  const b = band.getBoundingClientRect();
  const gutter = Math.max(16, Math.min(40, h.width * 0.03));
  const top = b.top - h.top, bottom = b.bottom - h.top;
  const beamY = Math.round(top + (bottom - top) * 0.46);
  const laserX = gutter + 34;
  const detX = h.width - gutter - 26;
  return {
    width: h.width, height: h.height, beamY, laserX, detX,
    cellX0: laserX + Math.min(60, h.width * 0.06),
    cellX1: detX - Math.min(50, h.width * 0.05),
    cellY0: top + 12,
    cellY1: bottom - 28,
  };
}

function sizeCanvas(canvas, w, h) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  return dpr;
}

/* ------------------------------------------------------------------ */
/* Mount                                                               */
/* ------------------------------------------------------------------ */

export function mountHero(root) {
  const hero = $("#hero", root);
  const band = $("#hero-band", root);
  const scene = $("#hero-scene", root);
  const sceneCtx = scene.getContext("2d");
  const plotCanvas = $("#spec-canvas", root);
  const plot = createPlot(plotCanvas);
  const gas = createGas();
  const reduced = prefersReducedMotion();

  let data = null;
  let view = null;
  let layout = null;
  let dpr = 1;
  let disposed = false;
  let running = false;
  let rafId = 0;
  let last = 0;
  let simTime = 0;
  let lastLabel = 0;
  let pendingCompute = false;
  let slowFrames = 0;
  let quality = 1;                       // drops to 0.5 if frames are slow
  const state = { mode: "direct", T: 1000, P: 1, x: 0.1, L: 40, a: 0.12 };

  /* ----- simulation state → view ----- */

  function baseCount() {
    return Math.round((layout && layout.width < 700 ? 14 : 36) * quality);
  }

  function recompute(animate = true) {
    pendingCompute = false;
    view = computeView(data, state);
    plot.setView(view, { animate: animate && !reduced });
    renderReadouts(root, view);
    plotCanvas.setAttribute("aria-label", describeView(state, view));
    gas.setPopulation(targetCounts(state, baseCount()), state.T);
    hero.style.setProperty("--heat", ((state.T - 300) / 1700).toFixed(3));
    if (!running) drawFrame(performance.now(), false);
  }

  function scheduleRecompute() {
    if (pendingCompute) return;
    pendingCompute = true;
    requestAnimationFrame(() => !disposed && recompute());
  }

  /* ----- per-frame drawing ----- */

  function laserNu(t) {
    const [a, b] = data.window_cm;
    let nu = a + (b - a) * ((t / SCAN_PERIOD_S) % 1);
    if (state.mode === "wms") nu += state.a * Math.cos(t * 2 * Math.PI * 3);
    return nu;
  }

  function updateLabels(nu, alphaNow) {
    $("#hero-laser-label", root).innerHTML = `Laser · <b>λ = ${wavenumberToNm(nu).toFixed(3)} nm</b>`;
    $("#hero-det-label", root).innerHTML = `Detector · <b>I/I₀ = ${Math.exp(-alphaNow).toFixed(3)}</b>`;
  }

  function drawFrame(now, advance = true) {
    if (!view || !layout) return;
    const dt = advance ? Math.min(0.05, (now - last) / 1000 || 0) : 0;
    last = now;
    simTime += dt;

    const nu = laserNu(simTime);
    const alphaNow = view.alphaAt(nu);
    if (advance) gas.step(dt, layout.beamY, 9, ABSORB_GAIN * alphaNow);

    sceneCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sceneCtx.clearRect(0, 0, layout.width, layout.height);
    drawOpticalPath(sceneCtx, layout, { alpha: alphaNow, mode: state.mode, t: simTime });
    gas.draw(sceneCtx, dpr);
    plot.draw(now, nu);

    if (now - lastLabel > LABEL_INTERVAL_MS) { lastLabel = now; updateLabels(nu, alphaNow); }
    if (advance) adaptQuality(dt);
  }

  /** Halves the molecule count if the frame time stays above 20 ms. */
  function adaptQuality(dt) {
    slowFrames = dt > 0.02 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 90 && quality > 0.5) {
      quality = 0.5;
      gas.setPopulation(targetCounts(state, baseCount()), state.T);
    }
  }

  function loop() {
    if (!running) return;
    drawFrame(performance.now());          // one clock for scene, plot and morphs
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    on = on && !reduced && !document.hidden && !disposed;
    if (on === running) return;
    running = on;
    if (on) { last = performance.now(); rafId = requestAnimationFrame(loop); }
    else cancelAnimationFrame(rafId);
  }

  /* ----- resize ----- */

  function onResize() {
    layout = computeLayout(hero, band);
    dpr = sizeCanvas(scene, layout.width, layout.height);
    scene.style.width = `${layout.width}px`;
    scene.style.height = `${layout.height}px`;
    gas.initSprites(dpr);
    gas.setBox({ x: layout.cellX0 + 10, y: layout.cellY0 + 8, w: layout.cellX1 - layout.cellX0 - 20, h: layout.cellY1 - layout.cellY0 - 16 });
    plot.resize();
    if (!running) drawFrame(performance.now(), false);
  }

  /* ----- input ----- */

  function onSlider(c, input) {
    state[c.key] = parseFloat(input.value);
    syncControls(root, state);
    indicateAll($("#spec-eq", root), `[data-term="${c.key}"]`);
    scheduleRecompute();
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    $("#spec-eq", root).innerHTML = `<span class="eq write" style="--delay:0ms">${EQUATIONS[mode]}</span>`;
    syncControls(root, state);
    scheduleRecompute();
  }

  function bindInputs() {
    CONTROLS.forEach((c) => {
      const input = $(`#hero-${c.key}`, root);
      input.addEventListener("input", () => onSlider(c, input));
    });
    $$(".modes button", root).forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    $(".modes", root).addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const keys = Object.keys(MODES);
      const next = keys[(keys.indexOf(state.mode) + (e.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length];
      setMode(next);
      $(`#mode-${next}`, root).focus();
    });
    const toggle = $("#controls-toggle", root);
    toggle.addEventListener("click", () => {
      const box = $("#spec-controls", root);
      const collapsed = box.dataset.collapsed === "true";
      box.dataset.collapsed = String(!collapsed);
      toggle.setAttribute("aria-expanded", String(collapsed));
      toggle.textContent = collapsed ? "Fewer controls −" : "More controls +";
    });
  }

  /* ----- start ----- */

  const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0.02 });
  const ro = new ResizeObserver(() => !disposed && data && onResize());
  const onVisibility = () => setRunning(!document.hidden && hero.getBoundingClientRect().bottom > 0);

  loadSpectra().then((spectra) => {
    if (disposed) return;
    data = spectra;
    state.L = data.defaults.L_cm;
    $("#spec-eq", root).innerHTML = `<span class="eq write">${EQUATIONS.direct}</span>`;
    syncControls(root, state);
    bindInputs();
    onResize();
    view = computeView(data, state);
    plot.setView(view, { animate: false, thermometry: thermometryLines(data) });
    renderReadouts(root, view);
    gas.setPopulation(targetCounts(state, baseCount()), state.T);
    hero.style.setProperty("--heat", ((state.T - 300) / 1700).toFixed(3));
    plot.reveal(!reduced);
    if (reduced) {
      gas.step(0.6, -1e9, 0, 0);          // let molecules fade in for the static frame
      drawFrame(performance.now(), false);
    }
    io.observe(hero);
    ro.observe(hero);
    document.addEventListener("visibilitychange", onVisibility);
  });

  return () => {
    disposed = true;
    setRunning(false);
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
