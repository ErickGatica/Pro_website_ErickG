/**
 * Footer: rendered once, outside the routed outlet.
 */
import { site } from "../config.js";
import { esc } from "../utils.js";

/** Builds an external link, or nothing when the URL is empty. */
const extLink = (url, label, id) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener" id="${id}">${label}</a>` : "");

export function renderFooter() {
  return `
  <footer class="footer">
    <div class="container">
      <div class="footer__top">
        <div>
          <div class="footer__name">${esc(site.name)}</div>
          <p class="footer__role">${esc(site.role)} · ${esc(site.affiliation)}. ${esc(site.tagline)}</p>
        </div>
        <div class="footer__cols">
          <nav class="footer__col" aria-label="Footer: site">
            <h4>Site</h4>
            <a href="#/research">Research</a>
            <a href="#/projects">Projects</a>
            <a href="#/publications">Publications</a>
            <a href="#/cv">CV</a>
            <a href="#/about">About</a>
          </nav>
          <nav class="footer__col" aria-label="Footer: elsewhere">
            <h4>Elsewhere</h4>
            <a href="mailto:${esc(site.email)}" id="footer-email">Email</a>
            ${extLink(site.linkedin, "LinkedIn", "footer-linkedin")}
            ${extLink(site.github, "GitHub", "footer-github")}
            ${extLink(site.photography, "Photography", "footer-photography")}
          </nav>
        </div>
      </div>
      <div class="footer__bottom">
        <span>© ${new Date().getFullYear()} ${esc(site.name)}. Paper figures are reproduced from the cited publications.</span>
        <span>${esc(site.location)} · Hecho con cariño desde ${esc(site.origin)}</span>
      </div>
    </div>
  </footer>`;
}
