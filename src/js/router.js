/**
 * Hash router with smooth page transitions.
 *
 * Routes look like  #/            → routes[""]
 *                   #/research    → routes["research"]
 *                   #/research/x  → routes["research/:id"]  (param = "x")
 *
 * A page module exports:
 *   title(param)        → document title
 *   render(param)       → HTML string (return null to fall through to 404)
 *   mount(root, param)  → optional; runs after render, may return a cleanup function
 */
import { prefersReducedMotion } from "./utils.js";

/** Splits the current hash into a route name and an optional parameter. */
function parseHash() {
  const [, name = "", param = null] = (location.hash.replace(/^#/, "") || "/").split("/");
  return { name, param: param ? decodeURIComponent(param) : null };
}

/** Finds the page for a route, preferring the ":id" variant when a parameter is present. */
function resolvePage(routes, name, param) {
  if (param !== null) return routes[`${name}/:id`] ?? null;
  return routes[name] ?? null;
}

export function createRouter({ routes, notFound, outlet, onChange, onBeforeSwap }) {
  let current = { key: null, cleanup: null };
  let queue = Promise.resolve();

  /** Replaces the outlet content with the new page and mounts it. */
  function swap(page, name, param) {
    current.cleanup?.();
    let html = page.render(param);
    if (html == null) { page = notFound; html = notFound.render(); }
    outlet.innerHTML = `<div class="page" data-page="${name || "home"}">${html}</div>`;
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = page.title(param);
    const cleanup = page.mount?.(outlet.firstElementChild, param);
    current = { key: `${name}/${param}`, cleanup: typeof cleanup === "function" ? cleanup : null };
    onChange?.(name, param);
  }

  /** Runs one navigation, with a transition unless this is the first load. */
  async function navigate() {
    const { name, param } = parseHash();
    const page = resolvePage(routes, name, param) ?? notFound;
    if (current.key === `${name}/${param}`) return;

    const first = current.key === null;
    if (first || prefersReducedMotion()) return swap(page, name, param);

    onBeforeSwap?.();
    if (document.startViewTransition) {
      await document.startViewTransition(() => swap(page, name, param)).finished.catch(() => {});
    } else {
      outlet.firstElementChild?.classList.add("is-leaving");
      await new Promise((r) => setTimeout(r, 220));
      swap(page, name, param);
    }
  }

  window.addEventListener("hashchange", () => { queue = queue.then(navigate); });
  return { start: () => (queue = queue.then(navigate)) };
}
