/**
 * 404 page.
 */
import { site } from "../config.js";
import { icons } from "../utils.js";

export const notFound = {
  title: () => `Not found | ${site.name}`,
  render: () => `
  <section class="notfound container">
    <div>
      <h1 class="display">404</h1>
      <p class="lead" style="margin:1rem auto 2rem">This wavelength is fully absorbed. Nothing made it to the detector.</p>
      <a class="btn btn--primary" href="#/" id="notfound-home">Back home ${icons.arrow}</a>
    </div>
  </section>`,
};
