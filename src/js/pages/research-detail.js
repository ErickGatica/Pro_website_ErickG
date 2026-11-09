/**
 * Research project detail: summary, role, key numbers, paper figures
 * (with lightbox and credits), full citations, previous/next project.
 */
import { site } from "../config.js";
import { figuresFor, getProject, getPublication, projects } from "../data.js";
import { esc, icons } from "../utils.js";
import { eraLabel, statusChip } from "../components/research-card.js";
import { statsHtml } from "../components/stats.js";
import { bindCitationButtons, citationBlock } from "../components/citation.js";
import { bindFigureLightbox, figureHtml, sourcePublication } from "../components/figure.js";
import { observeReveals, sizeCardTraces } from "../components/reveal.js";

const pubsOf = (p) => p.publications.map(getPublication).filter(Boolean);

function header(p) {
  return `
  <a class="back" href="#/research" id="back-research">${icons.arrow} All research</a>
  <header class="detail__head">
    <div class="detail__chips">${statusChip(p.status)}<span class="chip chip--plain">${esc(eraLabel(p.era))}</span></div>
    <h1 class="detail__title">${esc(p.title)}</h1>
    <div class="detail__meta"><span>${esc(p.place)}</span><span>${esc(p.years)}</span></div>
  </header>`;
}

function figuresSection(p, figs) {
  if (!figs.length) return "";
  const pubs = pubsOf(p);
  return `
  <section class="detail__section" aria-labelledby="figs-title">
    <h2 id="figs-title">Figures</h2>
    <div class="figs">${figs.map((f, i) => figureHtml(f, sourcePublication(f, pubs), i)).join("")}</div>
  </section>`;
}

function citationsSection(p) {
  const pubs = pubsOf(p);
  if (!pubs.length) return "";
  return `
  <section class="detail__section" aria-labelledby="cite-title">
    <h2 id="cite-title">${pubs.length > 1 ? "Publications" : "Publication"}</h2>
    <div class="grid">${pubs.map((pub) => citationBlock(pub)).join("")}</div>
  </section>`;
}

function aside(p) {
  return `
  <aside class="detail__aside">
    ${p.role ? `<div class="detail__role"><b>My role</b>${esc(p.role)}</div>` : ""}
    ${statsHtml(p.highlights)}
    <div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    ${p.note ? `<p class="detail__note">${esc(p.note)}</p>` : ""}
  </aside>`;
}

function pager(p) {
  const list = projects();
  const i = list.findIndex((x) => x.id === p.id);
  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  return `
  <nav class="pager" aria-label="More projects">
    <a class="card" href="#/research/${prev.id}"><small>← Previous</small><span>${esc(prev.title)}</span></a>
    <a class="card" href="#/research/${next.id}"><small>Next →</small><span>${esc(next.title)}</span></a>
  </nav>`;
}

export const researchDetail = {
  title: (id) => `${getProject(id)?.title ?? "Research"} | ${site.name}`,
  render(id) {
    const p = getProject(id);
    if (!p) return null;
    return `
    <article class="container page-top">
      ${header(p)}
      <div class="detail__layout">
        <div>
          <div class="prose">${p.summary.map((s) => `<p>${esc(s)}</p>`).join("")}</div>
          ${figuresSection(p, figuresFor(p))}
          ${citationsSection(p)}
        </div>
        ${aside(p)}
      </div>
      ${pager(p)}
    </article>`;
  },
  mount(root, id) {
    const p = getProject(id);
    if (!p) return;
    const pubs = pubsOf(p);
    bindFigureLightbox(root, figuresFor(p), (f) => sourcePublication(f, pubs));
    bindCitationButtons(root, getPublication);
    observeReveals(root);
    sizeCardTraces(root);
  },
};
