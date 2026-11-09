/**
 * CV: summary, experience / education / leadership timelines with the CV
 * bullet points, skills, courses, and the PDF download.
 */
import { site } from "../config.js";
import { cv as cvData } from "../data.js";
import { esc, icons } from "../utils.js";
import { observeReveals, trackTimelines } from "../components/reveal.js";

const LEGEND = [["research", "Research", "var(--blue)"], ["teaching", "Teaching", "var(--teal)"], ["industry", "Industry", "var(--gold)"], ["education", "Education", "var(--purple)"], ["leadership", "Leadership", "var(--red)"]];

function timelineItem(e) {
  return `
  <li class="tl-item tl-item--${e.kind}">
    <div class="tl-item__head">
      <h3>${esc(e.title)}</h3>
      <span class="tl-item__dates">${esc(e.dates)}</span>
    </div>
    <div class="tl-item__org">${esc(e.org)} <span>· ${esc(e.place)}</span></div>
    ${e.bullets?.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
  </li>`;
}

const timeline = (title, list) => `
  <section class="cv-block" aria-label="${esc(title)}">
    <h2>${esc(title)}</h2>
    <ol class="timeline">${list.map(timelineItem).join("")}</ol>
  </section>`;

function skillsCard(skills) {
  return `
  <div class="card skills">
    ${skills.map((g) => `<div><h3>${esc(g.group)}</h3><div class="tags">${g.items.map((i) => `<span class="tag">${esc(i)}</span>`).join("")}</div></div>`).join("")}
  </div>`;
}

function coursesSection(courses) {
  return `
  <section class="cv-block" aria-label="Courses and projects">
    <h2>Courses &amp; projects</h2>
    <div class="courses">${courses.map((c) => `
      <div class="card course reveal">
        <h3>${esc(c.title)}</h3>
        <small>${esc(c.org)} · ${esc(c.dates)}</small>
        ${c.detail ? `<p>${esc(c.detail)}</p>` : ""}
      </div>`).join("")}</div>
  </section>`;
}

export const cv = {
  title: () => `CV | ${site.name}`,
  render() {
    const d = cvData();
    return `
    <section class="container page-top">
      <div class="cv-head">
        <div class="portrait"><img src="assets/img/profile-400.webp" alt="Erick Gatica Candia" width="400" height="400" /></div>
        <div>
          <span class="eyebrow">Curriculum vitae</span>
          <h1 class="h2" style="margin-top:.6rem">${esc(site.name)}</h1>
          <p class="muted" style="margin-top:.3rem">${esc(site.role)} · M.Sc. &amp; B.S. in Chemical Engineering</p>
          <div class="btn-row" style="margin-top:1rem">
            <a class="btn btn--primary" href="${esc(site.cvPdf)}" target="_blank" rel="noopener" id="cv-download">${icons.download} Download CV (PDF)</a>
            <a class="btn" href="mailto:${esc(site.email)}" id="cv-email">${icons.mail} ${esc(site.email)}</a>
          </div>
        </div>
      </div>

      <div class="cv-layout">
        <div>
          <p class="lead" style="max-width:none">${esc(d.summary)}</p>
          <div class="legend" style="margin-top:2rem">${LEGEND.map(([, label, c]) => `<span style="--c:${c}">${label}</span>`).join("")}</div>
          ${timeline("Experience", d.experience)}
          ${timeline("Education", d.education)}
          ${timeline("Volunteering & leadership", d.leadership)}
          ${coursesSection(d.courses)}
        </div>
        <aside>
          <h2 class="h3" style="font-size:1.1rem">Skills &amp; languages</h2>
          ${skillsCard(d.skills)}
        </aside>
      </div>
    </section>`;
  },
  mount(root) {
    observeReveals(root);
    return trackTimelines(root);
  },
};
