/**
 * manim "Indicate": briefly scale up and colour a term yellow.
 * The visual style is .eq-term.is-indicated in hero.css.
 */
const timers = new WeakMap();

export function indicate(el, ms = 650) {
  if (!el) return;
  clearTimeout(timers.get(el));
  el.classList.add("is-indicated");
  timers.set(el, setTimeout(() => el.classList.remove("is-indicated"), ms));
}

/** Indicates every element matching `selector` inside `root`. */
export function indicateAll(root, selector, ms) {
  root.querySelectorAll(selector).forEach((el) => indicate(el, ms));
}
