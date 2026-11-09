/**
 * manim "Transform": smoothly morph one array of values into another.
 *
 *   const m = createMorph(800);
 *   m.to(newValues);          // start morphing from the current state
 *   m.sample(now)             // → values at this frame, { done }
 */
import { smooth } from "./easing.js";

export function createMorph(duration = 600) {
  let from = null, to = null, start = 0;
  let current = null;

  return {
    /** Sets a new target. The first call jumps straight to it. */
    to(values, now = performance.now()) {
      if (!current || current.length !== values.length) {
        current = Float64Array.from(values);
        from = to = current;
        start = now - duration;
        return;
      }
      from = Float64Array.from(current);
      to = Float64Array.from(values);
      start = now;
    },
    /** Values at time `now`; `done` is true once the morph has finished. */
    sample(now = performance.now()) {
      if (!current) return { values: null, done: true };
      const t = Math.min(1, (now - start) / duration);
      const k = smooth(t);
      for (let i = 0; i < current.length; i++) current[i] = from[i] + (to[i] - from[i]) * k;
      return { values: current, done: t >= 1 };
    },
    /** Jumps to the target (for reduced motion). */
    finish() { if (to) current = Float64Array.from(to); start = -Infinity; },
  };
}
