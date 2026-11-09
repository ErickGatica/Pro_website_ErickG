/**
 * Paper figures: markup with caption + credit line, and lightbox wiring.
 * Every figure caption ends with "Reproduced from <short cite>, doi:…".
 */
import { $$, esc } from "../utils.js";
import { doiUrl, shortCite } from "./citation.js";
import { openLightbox, plainAlt } from "./lightbox.js";

/** Finds the publication a figure comes from (by id prefix for multi-paper projects). */
export function sourcePublication(fig, pubs) {
  if (pubs.length === 1) return pubs[0];
  if (fig.id.startsWith("model-")) return pubs.find((p) => p.id.includes("modeling")) ?? pubs[0];
  if (fig.id.startsWith("exp-")) return pubs.find((p) => !p.id.includes("modeling")) ?? pubs[0];
  return pubs[0];
}

export function creditHtml(pub) {
  return pub ? `Reproduced from ${esc(shortCite(pub))}, <a href="${doiUrl(pub)}" target="_blank" rel="noopener">doi:${esc(pub.doi)}</a>` : "";
}

/** One figure card. `i` is the position in the gallery (used by the lightbox). */
export function figureHtml(fig, pub, i) {
  return `
  <figure class="figure reveal">
    <button class="figure__img" type="button" data-fig="${i}" aria-label="Enlarge figure ${fig.fig}">
      <img src="${fig.thumb}" srcset="${fig.thumb} 600w, ${fig.full} ${fig.width}w" sizes="(max-width: 900px) 100vw, 800px"
        alt="${esc(fig.caption)}" loading="lazy" decoding="async" width="${fig.width}" height="${fig.height}" />
    </button>
    <figcaption><b>Fig. ${fig.fig}.</b>${esc(fig.caption)}
      <span class="figure__credit">${creditHtml(pub)}</span>
    </figcaption>
  </figure>`;
}

/** Opens the clicked figure in the lightbox, with the whole gallery navigable. */
export function bindFigureLightbox(root, figs, pubFor) {
  const items = figs.map((f) => ({
    src: f.full,
    alt: plainAlt(f.caption),
    caption: `<b style="color:var(--blue)">Fig. ${f.fig}.</b> ${esc(f.caption)}`,
    credit: creditHtml(pubFor(f)),
  }));
  $$("[data-fig]", root).forEach((btn) => btn.addEventListener("click", () => openLightbox(items, +btn.dataset.fig)));
}
