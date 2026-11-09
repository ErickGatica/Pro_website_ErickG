/**
 * Lightbox: full-screen viewer for paper figures and book page previews.
 *
 * openLightbox(items, startIndex), where each item is
 *   { src, alt, caption?, credit? }   (caption/credit may contain HTML)
 *
 * Keyboard: ←/→ to navigate, Esc to close. Swipe on touch screens.
 */
import { $, esc, icons } from "../utils.js";

let el = null;
let items = [];
let index = 0;
let lastFocus = null;

function build() {
  el = document.createElement("div");
  el.className = "lb";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", "Image viewer");
  el.innerHTML = `
    <div class="lb__top">
      <div class="lb__counter" aria-live="polite"></div>
      <button class="icon-btn" id="lb-close" aria-label="Close (Esc)">${icons.close}</button>
    </div>
    <div class="lb__stage">
      <button class="lb__nav lb__nav--prev" id="lb-prev" aria-label="Previous">${icons.chevronLeft}</button>
      <figure class="lb__frame"><img alt="" /></figure>
      <button class="lb__nav lb__nav--next" id="lb-next" aria-label="Next">${icons.chevronRight}</button>
    </div>
    <div class="lb__caption"></div>`;
  document.body.appendChild(el);

  $("#lb-close", el).addEventListener("click", close);
  $("#lb-prev", el).addEventListener("click", () => step(-1));
  $("#lb-next", el).addEventListener("click", () => step(1));
  $(".lb__stage", el).addEventListener("click", (e) => { if (e.target === e.currentTarget) close(); });
  document.addEventListener("keydown", onKey);
  bindSwipe($(".lb__stage", el));
}

function onKey(e) {
  if (!el?.classList.contains("is-open")) return;
  if (e.key === "Escape") close();
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
}

function bindSwipe(stage) {
  let sx = 0, sy = 0;
  stage.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    else if (dy > 90) close();
  }, { passive: true });
}

/** Shows item `i` with a short fade/scale transition. */
function show(i) {
  index = (i + items.length) % items.length;
  const item = items[index];
  const frame = $(".lb__frame", el);
  const img = $("img", frame);
  frame.classList.add("is-entering");
  img.onload = () => requestAnimationFrame(() => frame.classList.remove("is-entering"));
  img.src = item.src;
  img.alt = item.alt ?? "";
  $(".lb__counter", el).innerHTML = `<b>${String(index + 1).padStart(2, "0")}</b> / ${String(items.length).padStart(2, "0")}`;
  $(".lb__caption", el).innerHTML = `${item.caption ?? ""}${item.credit ? `<small>${item.credit}</small>` : ""}`;
  const multi = items.length > 1;
  $("#lb-prev", el).hidden = !multi;
  $("#lb-next", el).hidden = !multi;
  if (multi) new Image().src = items[(index + 1) % items.length].src;   // preload next
}

const step = (d) => items.length > 1 && show(index + d);

export function openLightbox(list, start = 0) {
  if (!el) build();
  items = list;
  lastFocus = document.activeElement;
  show(start);
  el.classList.add("is-open");
  document.body.classList.add("no-scroll");
  $("#lb-close", el).focus({ preventScroll: true });
}

export function close() {
  if (!el?.classList.contains("is-open")) return;
  el.classList.remove("is-open");
  document.body.classList.remove("no-scroll");
  lastFocus?.focus?.({ preventScroll: true });
}

/** Text-only alt for an item whose caption may contain HTML. */
export const plainAlt = (html) => esc(String(html).replace(/<[^>]+>/g, ""));
