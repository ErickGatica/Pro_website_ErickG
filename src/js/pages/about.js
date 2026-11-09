/**
 * About & contact: bio, portrait, contact links, quick facts.
 */
import { site } from "../config.js";
import { esc, icons } from "../utils.js";
import { observeReveals } from "../components/reveal.js";

const BIO = [
  "I'm a Chilean engineer and a Fulbright Scholar doing my Ph.D. in Mechanical Engineering at the University of Colorado Boulder. In the Precision Laser Diagnostics Lab with Prof. Greg Rieker, I build laser absorption spectroscopy sensors: instruments that read temperature and gas composition straight from the light molecules absorb.",
  "My current project is a CO₂ and H₂O sensor for hydrogen combustion engines. I previously worked with wavelength modulation spectroscopy on natural gas engines, and I'm now moving into dual-comb spectroscopy and high-temperature spectroscopic databases.",
  "Before Boulder, I studied Chemical Engineering at the University of Santiago of Chile (first in my class, then an M.Sc. with maximum distinction), working on solar energy storage with phase change materials, drying and desalination. I've taught for many years, from differential equations recitations to process control lectures, and wrote an open algebra textbook for engineering students.",
  "Outside the lab I'm usually outdoors with a camera.",
];

const FACTS = [
  ["Based in", site.location],
  ["From", site.origin],
  ["Languages", "Spanish · English"],
  ["Fellowship", "Fulbright Scholar"],
];

function contactLink({ href, icon, label, sub, color, id, external = true }) {
  return `
  <a class="card" href="${esc(href)}" ${external ? 'target="_blank" rel="noopener"' : ""} id="${id}" style="--c:${color}">
    <span class="contact-list__icon">${icon}</span>
    <span>${esc(label)}<small>${esc(sub)}</small></span>
    ${icons.arrowUpRight}
  </a>`;
}

export const about = {
  title: () => `About | ${site.name}`,
  render: () => `
  <section class="container page-top">
    <div class="about">
      <div class="portrait portrait--lg reveal"><img src="assets/img/profile-800.webp" alt="Erick Gatica Candia smiling outdoors in Boulder, with the Flatirons behind him" width="800" height="800" /></div>
      <div>
        <span class="eyebrow">About</span>
        <h1 class="display" style="margin-top:.8rem">Hi, I'm <span class="grad-text">Erick</span>.</h1>
        <div class="prose">${BIO.map((p) => `<p>${esc(p)}</p>`).join("")}</div>

        <div class="contact-list">
          ${contactLink({ href: `mailto:${site.email}`, icon: icons.mail, label: "Email", sub: site.email, color: "var(--blue)", id: "about-email", external: false })}
          ${contactLink({ href: site.linkedin, icon: icons.linkedin, label: "LinkedIn", sub: "erick-gatica-candia", color: "var(--teal)", id: "about-linkedin" })}
          ${contactLink({ href: site.github, icon: icons.github, label: "GitHub", sub: "ErickGatica", color: "var(--purple)", id: "about-github" })}
          ${contactLink({ href: site.photography, icon: icons.camera, label: "Photography", sub: "Landscapes, wildlife & portraits", color: "var(--gold)", id: "about-photography" })}
        </div>

        <div class="facts">${FACTS.map(([k, v]) => `<div class="card fact"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div>
      </div>
    </div>
  </section>`,
  mount(root) {
    observeReveals(root);
  },
};
