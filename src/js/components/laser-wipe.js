/**
 * Laser wipe: a red beam sweeps across the screen on page changes.
 * The element lives in index.html; the animation is in base.css.
 */
import { prefersReducedMotion } from "../utils.js";

export function playLaserWipe() {
  const el = document.getElementById("laser-wipe");
  if (!el || prefersReducedMotion()) return;
  el.classList.remove("is-running");
  void el.offsetWidth;                 // restart the CSS animation
  el.classList.add("is-running");
}
