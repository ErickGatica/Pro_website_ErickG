/**
 * Entry point: load content, render the shell (nav + footer), start the router.
 */
import { loadData } from "./data.js";
import { createRouter } from "./router.js";
import { initNav } from "./components/nav.js";
import { renderFooter } from "./components/footer.js";
import { playLaserWipe } from "./components/laser-wipe.js";
import { home } from "./pages/home.js";
import { research } from "./pages/research.js";
import { researchDetail } from "./pages/research-detail.js";
import { projects } from "./pages/projects.js";
import { projectDetail } from "./pages/project-detail.js";
import { publications } from "./pages/publications.js";
import { cv } from "./pages/cv.js";
import { about } from "./pages/about.js";
import { notFound } from "./pages/not-found.js";

const routes = {
  "": home,
  research,
  "research/:id": researchDetail,
  projects,
  "projects/:id": projectDetail,
  publications,
  cv,
  about,
};

function showLoadError(outlet, err) {
  outlet.innerHTML = `<section class="notfound container"><div>
    <h1 class="h2">Couldn't load the site content</h1>
    <p class="lead" style="margin:1rem auto 0">${err.message}. If you opened index.html directly, run a local server instead (see README).</p>
  </div></section>`;
}

async function start() {
  const outlet = document.getElementById("app");
  try {
    await loadData();
  } catch (err) {
    showLoadError(outlet, err);
    return;
  }

  document.getElementById("footer-slot").outerHTML = renderFooter();
  const nav = initNav();
  createRouter({
    routes,
    notFound,
    outlet,
    onBeforeSwap: playLaserWipe,
    onChange: (name) => nav.setActive(name),
  }).start();
}

start();
