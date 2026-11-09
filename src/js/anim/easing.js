/**
 * Rate functions (manim names). t ∈ [0, 1] → [0, 1].
 */
export const linear = (t) => t;

/** manim's default "smooth": a sigmoid-like ease in/out. */
export function smooth(t, inflection = 10) {
  const sig = (x) => 1 / (1 + Math.exp(-x));
  const err = sig(-inflection / 2);
  return Math.min(1, Math.max(0, (sig(inflection * (t - 0.5)) - err) / (1 - 2 * err)));
}

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Wiggle used by manim's Indicate/vibration: 0 → 1 → 0 with oscillation. */
export const wiggle = (t, n = 3) => Math.sin(Math.PI * t) * Math.sin(2 * Math.PI * n * t);
