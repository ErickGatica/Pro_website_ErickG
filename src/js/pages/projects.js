/**
 * Other projects: teaching material, open textbook, essays, code.
 */
import { site } from "../config.js";
import { otherProjects, previewSrc } from "../data.js";
import { esc, icons } from "../utils.js";
import { observeReveals, stagger } from "../components/reveal.js";

export const typeChips = (types) => types.map((t) => `<span class="chip chip--${t}">${t}</span>`).join("");

function projectCard(p) {
  const cover = p.previews?.[0];
  return `
  <a class="card pcard reveal" href="#/projects/${esc(p.id)}" id="project-${esc(p.id)}">
    <div class="pcard__cover">${cover ? `<img src="${previewSrc(cover)}" alt="Cover of ${esc(p.title)}" loading="lazy" width="420" height="544" />` : icons.book}</div>
    <div class="pcard__body">
      <div class="pcard__chips">${typeChips(p.types)}<span class="chip chip--plain">${esc(p.language)}</span></div>
      <h3>${esc(p.title)}</h3>
      ${p.subtitle ? `<div class="pcard__sub">${esc(p.subtitle)}</div>` : ""}
      <p>${esc(p.short)}</p>
      <span class="rcard__go">Open ${icons.arrow}</span>
    </div>
  </a>`;
}

export const projects = {
  title: () => `Projects | ${site.name}`,
  render: () => `
  <section class="container page-top">
    <div class="section-head">
      <div>
        <span class="eyebrow">Other projects</span>
        <h1 class="display" style="margin-top:.8rem">Teaching, writing <span class="grad-text">&amp; code</span></h1>
      </div>
      <p class="lead">Material I've made outside my main research: open course material from my years teaching in Chile, essays, and tools as they become public.</p>
    </div>
    <div class="grid grid--2">${otherProjects().map(projectCard).join("")}</div>
  </section>`,
  mount(root) {
    stagger([...root.querySelectorAll(".pcard")]);
    observeReveals(root);
  },
};
