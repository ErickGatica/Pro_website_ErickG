/**
 * Other-project detail. For the algebra book: description, stats, table of
 * contents, page previews (lightbox), license, download or "coming soon",
 * and changelog.
 */
import { site } from "../config.js";
import { getOtherProject, previewSrc } from "../data.js";
import { $$, esc, icons } from "../utils.js";
import { statsHtml } from "../components/stats.js";
import { openLightbox } from "../components/lightbox.js";
import { observeReveals } from "../components/reveal.js";
import { typeChips } from "./projects.js";

function downloadBlock(p) {
  if (p.pdf) {
    return `<a class="btn btn--primary" href="${esc(p.pdf)}" target="_blank" rel="noopener" id="book-download">${icons.download} Download PDF</a>`;
  }
  return `<div class="book__soon"><b>PDF coming soon</b>${esc(p.pdfNote ?? "")}</div>`;
}

function coverColumn(p) {
  const cover = p.previews?.[0];
  return `
  <div class="book__cover">
    ${cover ? `<button class="book__cover-img" type="button" data-preview="0" aria-label="Open page previews"><img src="${previewSrc(cover, "full")}" alt="Cover of ${esc(p.title)}" width="1100" height="1424" /></button>` : ""}
    <div class="book__download">${downloadBlock(p)}</div>
    ${p.license ? `<span class="license">${icons.cc} License: ${esc(p.license)}</span>` : ""}
  </div>`;
}

function tocSection(p) {
  if (!p.toc?.length) return "";
  return `
  <section class="detail__section" aria-labelledby="toc-title">
    <h2 id="toc-title">Contents</h2>
    <ol class="toc">${p.toc.map((c) => `<li class="${/^[A-Z] ·/.test(c) ? "toc__appendix" : ""}">${esc(c)}</li>`).join("")}</ol>
  </section>`;
}

function previewsSection(p) {
  if (!p.previews?.length) return "";
  return `
  <section class="detail__section" aria-labelledby="prev-title">
    <h2 id="prev-title">Page previews</h2>
    <div class="previews">${p.previews.map((pg, i) => `
      <button type="button" data-preview="${i}" aria-label="Open page ${pg.slice(1)}"><img src="${previewSrc(pg)}" alt="Page ${pg.slice(1)}" loading="lazy" width="420" height="544" /></button>`).join("")}
    </div>
  </section>`;
}

function changelogSection(p) {
  if (!p.changelog?.length) return "";
  return `
  <section class="detail__section" aria-labelledby="log-title">
    <h2 id="log-title">What's new in this edition</h2>
    <ul class="changelog">${p.changelog.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
  </section>`;
}

export const projectDetail = {
  title: (id) => `${getOtherProject(id)?.title ?? "Project"} | ${site.name}`,
  render(id) {
    const p = getOtherProject(id);
    if (!p) return null;
    return `
    <article class="container page-top">
      <a class="back" href="#/projects" id="back-projects">${icons.arrow} All projects</a>
      <div class="book">
        ${coverColumn(p)}
        <div>
          <header class="detail__head">
            <div class="detail__chips">${typeChips(p.types)}<span class="chip chip--plain">${esc(p.language)}</span>${p.year ? `<span class="chip chip--plain">${esc(p.year)}</span>` : ""}</div>
            <h1 class="detail__title">${esc(p.title)}</h1>
            ${p.subtitle ? `<p class="lead">${esc(p.subtitle)}</p>` : ""}
          </header>
          <div class="prose" style="margin-top:1.5rem">${p.description.map((d) => `<p>${esc(d)}</p>`).join("")}</div>
          ${p.stats ? `<div style="margin-top:1.8rem">${statsHtml(p.stats)}</div>` : ""}
          ${tocSection(p)}
          ${previewsSection(p)}
          ${changelogSection(p)}
        </div>
      </div>
    </article>`;
  },
  mount(root, id) {
    const p = getOtherProject(id);
    if (!p?.previews) return;
    const items = p.previews.map((pg) => ({ src: previewSrc(pg, "full"), alt: `${p.title}, page ${pg.slice(1)}`, caption: `${esc(p.title)} · page ${pg.slice(1)}` }));
    $$("[data-preview]", root).forEach((b) => b.addEventListener("click", () => openLightbox(items, +b.dataset.preview)));
    observeReveals(root);
  },
};
