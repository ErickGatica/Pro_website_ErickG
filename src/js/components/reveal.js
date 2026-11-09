/**
 * Scroll-triggered effects:
 *  - .reveal      fades/slides in when it enters the viewport
 *  - .draw-line   divider draws itself in (manim "Create")
 *  - .tl-item     timeline nodes light up
 *  - .timeline    beam grows with scroll progress
 */
import { $$ } from "../utils.js";

let observer;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-visible");
      observer.unobserve(e.target);
    }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
  );
  return observer;
}

/** Starts observing every reveal-type element inside `root`. */
export function observeReveals(root = document) {
  const io = getObserver();
  $$(".reveal:not(.is-visible), .draw-line:not(.is-visible), .tl-item:not(.is-visible)", root).forEach((el) => io.observe(el));
}

/** Staggers .reveal children by setting --delay. */
export function stagger(elements, step = 70) {
  elements.forEach((el, i) => el.style.setProperty("--delay", `${i * step}ms`));
}

/**
 * Grows each timeline's beam with scroll position.
 * Returns a cleanup function that removes the scroll listener.
 */
export function trackTimelines(root) {
  const lines = $$(".timeline", root);
  if (!lines.length) return () => {};
  const update = () => {
    const vh = window.innerHeight;
    lines.forEach((tl) => {
      const r = tl.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
      tl.style.setProperty("--progress", progress.toFixed(3));
    });
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  return () => window.removeEventListener("scroll", update);
}

/** Card border trace: sets the SVG rect perimeter so the dash animation fits. */
export function sizeCardTraces(root) {
  $$(".card__trace", root).forEach((svg) => {
    const { width, height } = svg.getBoundingClientRect();
    svg.style.setProperty("--len", Math.ceil(2 * (width + height)));
  });
}
