/**
 * Home: hero simulation, research focus, featured project, latest
 * publications, other projects teaser, contact call-to-action.
 */
import { site } from "../config.js";
import { figuresFor, getProject, otherProjects, previewSrc, publications } from "../data.js";
import { esc, icons } from "../utils.js";
import { heroHtml, mountHero } from "../hero/hero.js";
import { observeReveals, sizeCardTraces, stagger } from "../components/reveal.js";
import { statsHtml } from "../components/stats.js";
import { doiUrl } from "../components/citation.js";
import { cardTrace } from "../components/research-card.js";

const FOCUS = [
  {
    icon: icons.flame, color: "var(--red)", title: "Combustion diagnostics",
    text: "Real-time, in-situ laser sensors for hydrogen and natural gas engines: temperature and composition read directly from absorbed light.",
    link: "#/research/h2-engine-sensor", linkText: "Current project",
  },
  {
    icon: icons.database, color: "var(--purple)", title: "Spectroscopic databases",
    text: "Accurate high-temperature absorption data for H₂O and CO₂, the foundation every laser sensor relies on.",
    link: "#/research/dual-comb-databases", linkText: "Upcoming",
  },
  {
    icon: icons.comb, color: "var(--blue)", title: "From WMS to dual-comb",
    text: "Wavelength modulation spectroscopy for robust, fast field sensors; dual-comb spectroscopy for broadband, high-resolution measurements.",
    link: "#/research", linkText: "All research",
  },
];

function focusSection() {
  return `
  <section class="section container" aria-labelledby="focus-title">
    <div class="section-head">
      <div>
        <span class="eyebrow">Research focus</span>
        <h2 class="h2" id="focus-title">Reading molecules with light</h2>
      </div>
      <p class="lead">Every molecule absorbs light at its own set of wavelengths. Measuring that absorption with a laser tells us how hot a gas is and what it is made of, without touching it.</p>
    </div>
    <div class="grid grid--3">
      ${FOCUS.map((f) => `
        <a class="card focus reveal" href="${f.link}" style="--c:${f.color}">
          ${cardTrace()}
          <span class="focus__icon" style="--c:${f.color}">${f.icon}</span>
          <h3>${f.title}</h3>
          <p>${f.text}</p>
          <span class="focus__foot rcard__go">${f.linkText} ${icons.arrow}</span>
        </a>`).join("")}
    </div>
  </section>`;
}

function featuredSection() {
  const p = getProject(site.featuredProject);
  if (!p) return "";
  const fig = figuresFor(p)[0];
  return `
  <section class="section container" aria-labelledby="featured-title">
    <div class="section-head">
      <div>
        <span class="eyebrow">Featured · Published</span>
        <h2 class="h2" id="featured-title">Engine sensor in a shoebox</h2>
      </div>
    </div>
    <a class="card feature reveal" href="#/research/${p.id}">
      ${fig ? `<div class="feature__media"><img src="${fig.thumb}" alt="${esc(fig.caption)}" loading="lazy" width="${fig.width}" height="${fig.height}" /></div>` : ""}
      <div class="feature__body">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary[1] ?? p.short)}</p>
        ${statsHtml(p.highlights.slice(0, 4))}
        <span class="rcard__go">Read more ${icons.arrow}</span>
      </div>
    </a>
  </section>`;
}

function publicationsSection() {
  const pubs = publications().slice(0, 3);
  return `
  <section class="section container" aria-labelledby="pubs-title">
    <div class="section-head">
      <div>
        <span class="eyebrow">Latest publications</span>
        <h2 class="h2" id="pubs-title">Peer-reviewed work</h2>
      </div>
      <a class="btn btn--ghost" href="#/publications">All publications ${icons.arrow}</a>
    </div>
    <div class="pub-mini">
      ${pubs.map((pub) => `
        <a class="card reveal" href="${doiUrl(pub)}" target="_blank" rel="noopener">
          <span class="pub-mini__year">${pub.year}</span>
          <span><span class="pub-mini__title">${esc(pub.title)}</span><span class="pub-mini__journal">${esc(pub.journal)}</span></span>
          ${icons.arrowUpRight}
        </a>`).join("")}
    </div>
  </section>`;
}

function projectsTeaser() {
  const book = otherProjects()[0];
  if (!book) return "";
  return `
  <section class="section container" aria-labelledby="other-title">
    <div class="section-head">
      <div>
        <span class="eyebrow">Beyond the lab</span>
        <h2 class="h2" id="other-title">Teaching &amp; open material</h2>
      </div>
      <a class="btn btn--ghost" href="#/projects">Other projects ${icons.arrow}</a>
    </div>
    <a class="card pcard reveal" href="#/projects/${book.id}">
      <div class="pcard__cover"><img src="${previewSrc(book.previews?.[0] ?? "p1")}" alt="Cover of ${esc(book.title)}" loading="lazy" width="420" height="544" /></div>
      <div class="pcard__body">
        <div class="pcard__chips">${book.types.map((t) => `<span class="chip chip--${t}">${t}</span>`).join("")}</div>
        <h3>${esc(book.title)}</h3>
        <div class="pcard__sub">${esc(book.subtitle)}</div>
        <p>${esc(book.short)}</p>
        <span class="rcard__go">See the book ${icons.arrow}</span>
      </div>
    </a>
  </section>`;
}

function ctaSection() {
  return `
  <section class="container">
    <div class="card cta reveal">
      <div>
        <h2>Let's talk spectroscopy.</h2>
        <p>Open to collaborations on laser diagnostics, combustion sensing and spectroscopic data. I'm also happy to talk with students thinking about a Fulbright or a Ph.D. in the US.</p>
      </div>
      <div class="btn-row">
        <a class="btn btn--primary" href="mailto:${esc(site.email)}" id="cta-email">${icons.mail} Email me</a>
        <a class="btn" href="${esc(site.cvPdf)}" target="_blank" rel="noopener" id="cta-cv">${icons.download} CV (PDF)</a>
        <a class="btn" href="${esc(site.linkedin)}" target="_blank" rel="noopener" id="cta-linkedin">LinkedIn</a>
      </div>
    </div>
  </section>`;
}

export const home = {
  title: () => `${site.name} | Laser Spectroscopy & Combustion Diagnostics`,
  render: () => heroHtml() + focusSection() + featuredSection() + publicationsSection() + projectsTeaser() + ctaSection(),
  mount(root) {
    const stopHero = mountHero(root);
    stagger([...root.querySelectorAll(".focus")]);
    observeReveals(root);
    sizeCardTraces(root);
    return stopHero;
  },
};
