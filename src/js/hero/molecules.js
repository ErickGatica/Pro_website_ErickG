/**
 * Gas molecules for the hero scene (2D, manim style).
 *
 *  - H₂O: blue oxygen + two white hydrogens at the real 104.5° bond angle
 *  - N₂ : two grey atoms (non-absorbing background gas)
 *
 * Speeds follow a 2D Maxwell–Boltzmann distribution (∝ √(T/m)); the number
 * on screen follows the number density (∝ P/T). When a water molecule in the
 * beam absorbs a photon it flashes yellow and plays a short vibration.
 *
 * Atoms are pre-rendered to small offscreen canvases ("sprites"), so each
 * frame is just a few drawImage calls.
 */
import { wiggle } from "../anim/easing.js";

const H2O_ANGLE = (104.5 * Math.PI) / 180;
const BOND = { H2O: 15, N2: 13 };
const MASS = { H2O: 18, N2: 28 };
const FLASH_S = 0.7;                      // flash + vibration duration
const SPEED_300K = 26;                    // px/s typical speed of H₂O at 300 K (visual scale)
const SPIN_300K = 0.9;                    // rad/s typical rotation at 300 K

/* ---------- sprites ---------- */

function makeAtomSprite(radius, stroke, fill, dpr, glow = 0) {
  const pad = 2 + glow;
  const size = Math.ceil((radius + pad) * 2 * dpr);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const mid = radius + pad;
  if (glow) { g.shadowColor = stroke; g.shadowBlur = glow; }
  g.beginPath();
  g.arc(mid, mid, radius, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1.6;
  g.strokeStyle = stroke;
  g.stroke();
  return { canvas: c, half: mid };
}

function buildSprites(dpr) {
  return {
    O: makeAtomSprite(8, "#58C4DD", "rgba(88,196,221,0.28)", dpr, 6),
    H: makeAtomSprite(5, "#ECE9E2", "rgba(236,233,226,0.2)", dpr),
    N: makeAtomSprite(6.5, "#8b93a1", "rgba(139,147,161,0.18)", dpr),
    Ofl: makeAtomSprite(8, "#F7D96F", "rgba(247,217,111,0.55)", dpr, 14),
    Hfl: makeAtomSprite(5, "#F7D96F", "rgba(247,217,111,0.45)", dpr, 10),
  };
}

/* ---------- physics of motion ---------- */

/** 2D Maxwell–Boltzmann speed sample (Rayleigh distribution), scaled for display. */
function sampleSpeed(T, species) {
  const sigma = SPEED_300K * Math.sqrt((T / 300) * (MASS.H2O / MASS[species])) / Math.SQRT2;
  return sigma * Math.sqrt(-2 * Math.log(1 - Math.random()));
}

function newMolecule(species, box, T) {
  const speed = sampleSpeed(T, species);
  const dir = Math.random() * Math.PI * 2;
  return {
    species,
    x: box.x + Math.random() * box.w,
    y: box.y + Math.random() * box.h,
    vx: Math.cos(dir) * speed,
    vy: Math.sin(dir) * speed,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2 * SPIN_300K * Math.sqrt(T / 300),
    flash: 0,                // seconds left of the absorption flash
    alpha: 0,                // fades in when added, out when removed
    leaving: false,
  };
}

/** Rescales a molecule's velocity and spin when the temperature changes. */
function rescaleThermal(m, ratio) {
  const k = Math.sqrt(ratio);
  m.vx *= k;
  m.vy *= k;
  m.spin *= k;
}

/* ---------- population ---------- */

/**
 * How many molecules to show: ∝ number density (P/T), with H₂O share from x.
 * The H₂O share is boosted (×2.5) so a 10 % mixture still shows enough water.
 */
export function targetCounts({ T, P, x }, base) {
  const total = Math.round(Math.min(2.2, Math.max(0.3, (P / 1) * (1000 / T))) * base);
  const h2o = Math.max(2, Math.round(total * Math.min(1, Math.max(0.12, x * 2.5))));
  return { H2O: h2o, N2: Math.max(0, total - h2o) };
}

export function createGas() {
  let molecules = [];
  let sprites = null;
  let box = { x: 0, y: 0, w: 1, h: 1 };
  let currentT = 1000;
  let rings = [];          // expanding absorption rings {x, y, t}

  function setBox(b) {
    const old = box;
    box = b;
    // keep molecules inside the new box (proportional remap)
    molecules.forEach((m) => {
      m.x = b.x + ((m.x - old.x) / old.w) * b.w;
      m.y = b.y + ((m.y - old.y) / old.h) * b.h;
    });
  }

  /** Adds or removes molecules (with fades) to match the target counts. */
  function setPopulation(counts, T) {
    if (T !== currentT) {
      molecules.forEach((m) => rescaleThermal(m, T / currentT));
      currentT = T;
    }
    for (const species of ["H2O", "N2"]) {
      const alive = molecules.filter((m) => m.species === species && !m.leaving);
      for (let i = alive.length; i < counts[species]; i++) molecules.push(newMolecule(species, box, T));
      alive.slice(counts[species]).forEach((m) => { m.leaving = true; });
    }
  }

  /**
   * Advances the simulation by dt seconds.
   * `absorbRate` = absorption events per second per H₂O molecule inside the beam.
   */
  function step(dt, beamY, beamHalf, absorbRate) {
    for (const m of molecules) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.angle += m.spin * dt;
      if (m.x < box.x) { m.x = box.x; m.vx = Math.abs(m.vx); }
      if (m.x > box.x + box.w) { m.x = box.x + box.w; m.vx = -Math.abs(m.vx); }
      if (m.y < box.y) { m.y = box.y; m.vy = Math.abs(m.vy); }
      if (m.y > box.y + box.h) { m.y = box.y + box.h; m.vy = -Math.abs(m.vy); }

      m.alpha = m.leaving ? m.alpha - dt * 2 : Math.min(1, m.alpha + dt * 2);
      if (m.flash > 0) m.flash = Math.max(0, m.flash - dt);

      const inBeam = Math.abs(m.y - beamY) < beamHalf;
      if (m.species === "H2O" && inBeam && m.flash === 0 && Math.random() < absorbRate * dt) {
        m.flash = FLASH_S;
        rings.push({ x: m.x, y: m.y, t: 0 });
      }
    }
    molecules = molecules.filter((m) => m.alpha > 0 || !m.leaving);
    rings = rings.filter((r) => (r.t += dt) < 0.6);
  }

  /** Atom positions for one molecule (vibration stretches the bonds while flashing). */
  function atomsOf(m) {
    const vib = m.flash > 0 ? 1 + 0.22 * wiggle(1 - m.flash / FLASH_S, 3) : 1;
    const c = Math.cos(m.angle), s = Math.sin(m.angle);
    if (m.species === "N2") {
      const d = (BOND.N2 / 2) * vib;
      return [["N", m.x - c * d, m.y - s * d], ["N", m.x + c * d, m.y + s * d]];
    }
    const b = BOND.H2O * vib, h = H2O_ANGLE / 2;
    const a1 = m.angle - h, a2 = m.angle + h;
    return [["H", m.x + Math.cos(a1) * b, m.y + Math.sin(a1) * b], ["H", m.x + Math.cos(a2) * b, m.y + Math.sin(a2) * b], ["O", m.x, m.y]];
  }

  function drawBonds(ctx, list) {
    ctx.lineWidth = 2;
    for (const [m, atoms] of list) {
      ctx.globalAlpha = m.alpha;
      ctx.strokeStyle = m.flash > 0 ? "#F7D96F" : m.species === "N2" ? "#6b7380" : "#9fdcec";
      ctx.beginPath();
      if (m.species === "N2") {
        ctx.moveTo(atoms[0][1], atoms[0][2]);
        ctx.lineTo(atoms[1][1], atoms[1][2]);
      } else {
        ctx.moveTo(atoms[0][1], atoms[0][2]);
        ctx.lineTo(m.x, m.y);
        ctx.lineTo(atoms[1][1], atoms[1][2]);
      }
      ctx.stroke();
    }
  }

  function drawAtoms(ctx, list, dpr) {
    for (const [m, atoms] of list) {
      const flashing = m.flash > 0;
      for (const [type, x, y] of atoms) {
        const sp = sprites[flashing && type !== "N" ? `${type}fl` : type];
        ctx.globalAlpha = m.alpha;
        ctx.drawImage(sp.canvas, x - sp.half, y - sp.half, sp.canvas.width / dpr, sp.canvas.height / dpr);
      }
    }
  }

  function drawRings(ctx) {
    ctx.lineWidth = 1.2;
    for (const r of rings) {
      const k = r.t / 0.6;
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = "#F7D96F";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 6 + k * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return {
    setBox,
    setPopulation,
    step,
    initSprites(dpr) { sprites = buildSprites(dpr); },
    /** Draws all molecules: bonds first, then atoms on top, then absorption rings. */
    draw(ctx, dpr) {
      if (!sprites) return;
      const list = molecules.map((m) => [m, atomsOf(m)]);
      ctx.save();
      drawBonds(ctx, list);
      drawAtoms(ctx, list, dpr);
      drawRings(ctx);
      ctx.restore();
    },
    count: () => molecules.length,
  };
}
