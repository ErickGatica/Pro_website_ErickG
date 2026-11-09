/**
 * Key-number tiles: [{ value, unit?, label }] → stat grid.
 */
import { esc } from "../utils.js";

export function statsHtml(list = []) {
  if (!list.length) return "";
  return `<div class="stats">${list.map((s) => `
    <div class="stat">
      <div class="stat__value">${esc(s.value)}${s.unit ? `<small>${esc(s.unit)}</small>` : ""}</div>
      <div class="stat__label">${esc(s.label)}</div>
    </div>`).join("")}</div>`;
}
