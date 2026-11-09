/**
 * Research project card (used on Home and Research pages) and status chip.
 */
import { figuresFor } from "../data.js";
import { esc, icons } from "../utils.js";

const STATUS_LABEL = { current: "Current", upcoming: "Upcoming", published: "Published" };
const ERA_LABEL = { phd: "Ph.D. · CU Boulder", msc: "M.Sc. · USACH" };

export const statusChip = (status) => `<span class="chip chip--${status}">${STATUS_LABEL[status] ?? status}</span>`;
export const eraLabel = (era) => ERA_LABEL[era] ?? era;

/** SVG border that draws itself in on hover (manim "Create"). */
export const cardTrace = () =>
  `<svg class="card__trace" aria-hidden="true"><rect x="0" y="0" width="100%" height="100%" rx="18" /></svg>`;

/**
 * Cover art for projects without paper figures yet: a stylized absorption
 * spectrum (current work) or comb teeth (upcoming dual-comb work).
 */
function coverArt(project) {
  if (project.status === "upcoming") {
    const teeth = Array.from({ length: 34 }, (_, i) => {
      const x = 30 + i * 16;
      const h = 70 + 50 * Math.exp(-(((i - 17) / 9) ** 2)) - (i % 7 === 3 ? 36 : 0) - (i % 11 === 5 ? 24 : 0);
      return `<line x1="${x}" y1="210" x2="${x}" y2="${210 - h}" stroke="${i % 2 ? "#b48ad0" : "#58c4dd"}" stroke-width="2.4" stroke-linecap="round"/>`;
    }).join("");
    return `<svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <line x1="20" y1="210" x2="580" y2="210" stroke="rgba(255,255,255,.25)"/>${teeth}</svg>`;
  }
  const path = Array.from({ length: 121 }, (_, i) => {
    const x = i / 120;
    const y = 0.9 * Math.exp(-(((x - 0.38) / 0.03) ** 2)) + 0.5 * Math.exp(-(((x - 0.62) / 0.025) ** 2)) + 0.25 * Math.exp(-(((x - 0.8) / 0.02) ** 2));
    return `${i ? "L" : "M"}${(30 + x * 540).toFixed(1)},${(215 - y * 150).toFixed(1)}`;
  }).join("");
  return `<svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <line x1="20" y1="40" x2="580" y2="40" stroke="#fc6255" stroke-width="2" style="filter:drop-shadow(0 0 4px #fc6255)"/>
    <line x1="30" y1="215" x2="575" y2="215" stroke="rgba(255,255,255,.25)"/>
    <path d="${path}" fill="none" stroke="#58c4dd" stroke-width="2.4" style="filter:drop-shadow(0 0 5px rgba(88,196,221,.6))"/></svg>`;
}

function cardMedia(project) {
  const cover = figuresFor(project)[0];
  const chips = `<div class="rcard__chips">${statusChip(project.status)}</div>`;
  if (!cover) return `<div class="rcard__media rcard__media--art">${coverArt(project)}${chips}</div>`;
  return `<div class="rcard__media">
    <img src="${cover.thumb}" alt="${esc(cover.caption)}" loading="lazy" decoding="async" width="${cover.width}" height="${cover.height}" />${chips}</div>`;
}

/** Full research card linking to the project detail page. */
export function researchCard(project) {
  const stats = (project.highlights ?? []).slice(0, 2).map((h) =>
    `<div>${esc(h.value)}${h.unit ? ` <small style="display:inline;color:var(--blue)">${esc(h.unit)}</small>` : ""}<small>${esc(h.label)}</small></div>`).join("");
  return `
  <a class="card rcard reveal" href="#/research/${esc(project.id)}" data-era="${project.era}" id="card-${esc(project.id)}">
    ${cardTrace()}
    ${cardMedia(project)}
    <div class="rcard__body">
      <div class="rcard__meta">${esc(eraLabel(project.era))} · ${esc(project.years)}</div>
      <h3>${esc(project.title)}</h3>
      <p>${esc(project.short)}</p>
      ${stats ? `<div class="rcard__stats">${stats}</div>` : ""}
      <span class="rcard__go">View project ${icons.arrow}</span>
    </div>
  </a>`;
}
