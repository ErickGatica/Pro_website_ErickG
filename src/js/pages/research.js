/**
 * Research: project cards grouped by era, with an era filter.
 */
import { site } from "../config.js";
import { projects } from "../data.js";
import { $$ } from "../utils.js";
import { eraLabel, researchCard } from "../components/research-card.js";
import { observeReveals, sizeCardTraces, stagger } from "../components/reveal.js";

const ERAS = ["phd", "msc"];
const FILTERS = [["all", "All"], ["phd", "Ph.D. · CU Boulder"], ["msc", "M.Sc. & Chem. Eng. · USACH"]];

function eraSection(era) {
  const list = projects().filter((p) => p.era === era);
  return `
  <section class="era" data-era-section="${era}" aria-label="${eraLabel(era)}">
    <div class="era__head"><h2>${era === "phd" ? "Ph.D. · University of Colorado Boulder" : "M.Sc. & Chemical Engineering · University of Santiago of Chile"}</h2><div class="draw-line"></div></div>
    <div class="grid grid--2">${list.map(researchCard).join("")}</div>
  </section>`;
}

/** Shows only the chosen era (or all). */
function applyFilter(root, era) {
  $$("[data-filter]", root).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === era)));
  $$("[data-era-section]", root).forEach((s) => { s.hidden = era !== "all" && s.dataset.eraSection !== era; });
  const shown = era === "all" ? projects().length : projects().filter((p) => p.era === era).length;
  root.querySelector(".filters__count").textContent = `${shown} project${shown === 1 ? "" : "s"}`;
  observeReveals(root);
  sizeCardTraces(root);
}

export const research = {
  title: () => `Research | ${site.name}`,
  render: () => `
  <section class="container page-top">
    <div class="section-head">
      <div>
        <span class="eyebrow">Research</span>
        <h1 class="display" style="margin-top:.8rem">Light, heat &amp; <span class="grad-text">molecules</span></h1>
      </div>
      <p class="lead">From solar thermal storage in Chile to laser sensors on running engines in Colorado: the common thread is measuring and modelling how energy moves through gases and materials.</p>
    </div>
    <div class="filters">
      <div class="segmented" role="group" aria-label="Filter by period">
        ${FILTERS.map(([k, label]) => `<button type="button" data-filter="${k}" aria-pressed="${k === "all"}">${label}</button>`).join("")}
      </div>
      <span class="filters__count"></span>
    </div>
    ${ERAS.map(eraSection).join("")}
  </section>`,
  mount(root) {
    $$("[data-filter]", root).forEach((b) => b.addEventListener("click", () => applyFilter(root, b.dataset.filter)));
    $$(".grid", root).forEach((g) => stagger([...g.children]));
    applyFilter(root, "all");
  },
};
