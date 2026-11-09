/**
 * Navigation: glass on scroll, hides when scrolling down, sliding active
 * indicator, full-screen mobile menu.
 */
import { $, $$, debounce } from "../utils.js";

export function initNav() {
  const nav = $("#nav");
  const links = $$(".nav__link", nav);
  const indicator = $(".nav__indicator", nav);
  const toggle = $("#nav-toggle");
  let lastY = 0;
  let active = null;

  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 30);
    const goingDown = y > lastY + 4;
    nav.classList.toggle("is-hidden", y > 500 && goingDown && !nav.classList.contains("is-open"));
    if (y < lastY - 4) nav.classList.remove("is-hidden");
    lastY = y;
  }

  function moveIndicator(el) {
    if (!el) { indicator.style.opacity = 0; return; }
    const parent = el.closest(".nav__links").getBoundingClientRect();
    const r = el.getBoundingClientRect();
    indicator.style.opacity = 1;
    indicator.style.width = `${r.width}px`;
    indicator.style.transform = `translateX(${r.left - parent.left}px)`;
  }

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("no-scroll", open);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", debounce(() => moveIndicator(active)));
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  links.forEach((a) => a.addEventListener("click", () => setMenu(false)));
  $("#brand-link").addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  return {
    /** Highlights the link for the current top-level route ("" for home). */
    setActive(route) {
      active = links.find((a) => a.dataset.route === route) ?? null;
      links.forEach((a) => {
        a.classList.toggle("is-active", a === active);
        if (a === active) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      moveIndicator(active);
      onScroll();
    },
  };
}
