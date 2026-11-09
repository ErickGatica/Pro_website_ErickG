/**
 * Publications: full list grouped by year, with DOI links, BibTeX copy,
 * and links to the related research project.
 */
import { site } from "../config.js";
import { getProject, getPublication, publications as allPublications } from "../data.js";
import { esc } from "../utils.js";
import { bindCitationButtons, citationBlock } from "../components/citation.js";
import { observeReveals } from "../components/reveal.js";

function groupByYear(pubs) {
  const groups = new Map();
  pubs.forEach((p) => groups.set(p.year, [...(groups.get(p.year) ?? []), p]));
  return [...groups.entries()];
}

function projectLink(pub) {
  const proj = pub.project && getProject(pub.project);
  return proj ? `<a class="cite__project" href="#/research/${proj.id}">Project page →</a>` : "";
}

function summary(pubs) {
  const journals = new Set(pubs.map((p) => p.journal)).size;
  const years = pubs.map((p) => p.year);
  return `<div class="pub-summary">
    <span><b>${pubs.length}</b>peer-reviewed articles</span>
    <span><b>${journals}</b>journals</span>
    <span><b>${Math.min(...years)}–${Math.max(...years)}</b></span>
  </div>`;
}

export const publications = {
  title: () => `Publications | ${site.name}`,
  render() {
    const pubs = allPublications();
    return `
    <section class="container page-top">
      <div class="section-head">
        <div>
          <span class="eyebrow">Publications</span>
          <h1 class="display" style="margin-top:.8rem">Papers</h1>
        </div>
        <p class="lead">Peer-reviewed journal articles. My name is underlined in red; every DOI links to the publisher.</p>
      </div>
      ${summary(pubs)}
      ${groupByYear(pubs).map(([year, list]) => `
        <div class="pub-year reveal">
          <div class="pub-year__label">${year}</div>
          <div class="pub-year__list">${list.map((p) => `<div class="pub-item">${citationBlock(p, projectLink(p))}</div>`).join("")}</div>
        </div>`).join("")}
    </section>`;
  },
  mount(root) {
    bindCitationButtons(root, getPublication);
    observeReveals(root);
  },
};
