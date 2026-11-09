/**
 * Content loading. All page content lives in src/data/*.json; this module
 * fetches it once at start-up and exposes small lookup helpers.
 */
const FILES = {
  projects: "src/data/projects.json",
  otherProjects: "src/data/other-projects.json",
  publications: "src/data/publications.json",
  figures: "src/data/figures.json",
  cv: "src/data/cv.json",
};

const store = {};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

/** Loads every content file in parallel. Call once before rendering pages. */
export async function loadData() {
  const entries = await Promise.all(Object.entries(FILES).map(async ([key, url]) => [key, await fetchJson(url)]));
  Object.assign(store, Object.fromEntries(entries));
}

/* Research projects */
export const projects = () => store.projects.projects;
export const getProject = (id) => projects().find((p) => p.id === id);

/* Other projects (book, essays, code); hidden ones are skipped */
export const otherProjects = () => store.otherProjects.projects.filter((p) => !p.hidden);
export const getOtherProject = (id) => otherProjects().find((p) => p.id === id);

/* Publications, newest first */
export const publications = () => [...store.publications.publications].sort((a, b) => b.year - a.year);
export const getPublication = (id) => store.publications.publications.find((p) => p.id === id);

/* CV */
export const cv = () => store.cv;

/**
 * Figures for a research project, in the order listed in projects.json.
 * Each figure gets its image URLs added.
 */
export function figuresFor(project) {
  const all = store.figures[project.id] ?? [];
  return project.figures
    .map((id) => all.find((f) => f.id === id))
    .filter(Boolean)
    .map((f) => ({
      ...f,
      full: `assets/figures/${project.id}/full/${f.id}.webp`,
      thumb: `assets/figures/${project.id}/thumb/${f.id}.webp`,
    }));
}

/** Book page preview URLs. */
export const previewSrc = (page, size = "thumb") => `assets/book/previews/${size}/${page}.webp`;
