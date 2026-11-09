/**
 * Citations: formatted reference HTML, short cites, BibTeX, and the
 * "Copy BibTeX" button behaviour. Everything is generated from the
 * structured fields in publications.json so the formatting is consistent.
 */
import { $$, copyText, esc, icons } from "../utils.js";

export const doiUrl = (pub) => `https://doi.org/${pub.doi}`;

/** Author list with Erick's name in bold. */
function authorsHtml(pub) {
  return pub.authors.map((a, i) => (i === pub.me ? `<strong>${esc(a)}</strong>` : esc(a))).join(", ");
}

/** "Callahan et al., 2024" */
export function shortCite(pub) {
  const last = pub.authors[0].split(" ").pop();
  return `${last}${pub.authors.length > 1 ? " et al." : ""}, ${pub.year}`;
}

/** Full reference: Authors, "Title," Journal Volume, Article (Year). */
export function citationHtml(pub) {
  return `${authorsHtml(pub)}, “<span class="cite__title">${esc(pub.title)}</span>,” <em>${esc(pub.journal)}</em> ${esc(pub.volume)}, ${esc(pub.article)} (${pub.year}).`;
}

/** BibTeX entry generated from the structured fields. */
export function bibtex(pub) {
  const authors = pub.authors.join(" and ");
  return `@article{${pub.id},
  author  = {${authors}},
  title   = {${pub.title}},
  journal = {${pub.journal}},
  volume  = {${pub.volume}},
  pages   = {${pub.article}},
  year    = {${pub.year}},
  doi     = {${pub.doi}}
}`;
}

/** Citation block with DOI link and Copy BibTeX button. `extra` adds more actions. */
export function citationBlock(pub, extra = "") {
  return `
  <div class="cite card" data-pub="${esc(pub.id)}">
    <p class="cite__text">${citationHtml(pub)}</p>
    <div class="cite__actions">
      <a class="cite__doi" href="${doiUrl(pub)}" target="_blank" rel="noopener">doi:${esc(pub.doi)}</a>
      <button class="cite__btn" type="button" data-bibtex="${esc(pub.id)}">${icons.copy}<span>Copy BibTeX</span></button>
      ${extra}
    </div>
  </div>`;
}

/** Wires every "Copy BibTeX" button inside `root`. */
export function bindCitationButtons(root, getPublication) {
  $$("[data-bibtex]", root).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const ok = await copyText(bibtex(getPublication(btn.dataset.bibtex)));
      const label = btn.querySelector("span");
      btn.classList.toggle("is-done", ok);
      label.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => { btn.classList.remove("is-done"); label.textContent = "Copy BibTeX"; }, 1800);
    });
  });
}
