# Plan: *Complemento de Álgebra*, Open Textbook Cleanup & Publication
**Author:** Erick Gatica Candia  
**Source:** `resources/Overleaf_projects/Curso_Álgebra_vespertino.zip` (Overleaf export)  
**Target:** a polished, freely downloadable PDF (Spanish) linked from `#/projects/algebra-book` on the professional site, with LaTeX source in `book/`  
**Status:** Draft plan, Nov 8, 2026

---

## 1. What's in the archive (audit)

| Item | Size | Notes |
|---|---|---|
| `Libro_EG.tex` | 8,225 lines (~213 KB), **one single file** | Main book. `article` class, 10 `\section`s, 34 subsections |
| `Introduction.tex` | 374 lines | Beamer slides (Madrid theme): course intro |
| `Curso/*.tex` | ~20 files | Older per-topic notes, exercise guides, `Cursocompleto.tex`, answer keys (`pautapep1/2.tex`) |
| `Pruebas/**` | ~30 files | Past exams (PEP1–3, PA) from 2021–2023 |
| Images | 27 files | Mix of own diagrams and **third-party internet images** |
| Logos | `DIQB-logo.pdf`, `logo_DIQ_color.pdf` | University department logos |

**Content (current chapters):**
1. Matrices · 2. Determinantes · 3. Sistemas de ecuaciones lineales · 4. Ejercicios de sistemas · 5. Espacios vectoriales · 6. Transformaciones lineales · 7. Ejercicios de espacios y transformaciones · 8. EDO de primer orden · 9. EDO de segundo orden · 10. Transformada de Laplace

### 1.1 Problems found

**Compile-breaking or wrong output**
- `\includegraphics[scale=0.1.3]{…}` in the header: invalid number.
- Broken image path `Matrices y determinantes/imagenmallado.png` (the file is actually `Curso/imagenmallado.png`).
- Most figures use **fixed width *and* height** (e.g. `width=3.6cm, height=3.2cm`), which distorts their aspect ratios.
- Obsolete or conflicting packages: `subfigure` (deprecated), `epstopdf`, `mathptmx` + `inputenc` with manual accents.

**Typesetting / consistency**
- **232 `eqnarray`** environments (bad spacing, deprecated) → `align`/`aligned`.
- 8 `$$ … $$` display blocks → `\[ … \]`.
- **~1,200 manual line breaks `\\`**, 162 `\hspace`, 74 `\vspace` used for layout instead of proper environments.
- Accents typed as `\'a`, `\'e` throughout → write UTF-8 directly with `babel[spanish]`.
- `sen(…)`/`cos(…)` typed as italic text (76×) → `\sen`/`\cos` operators (`babel-spanish` provides `\sen`).
- Dimensions typed as `mxk`, `3x3` (27×) → $m \times k$, $3 \times 3$.
- Chemistry formulas written in math mode with errors (e.g. `H3C_{6}…` missing subscript) → `mhchem` (`\ce{H3C6H5O7}`).
- **Only 2 `\label`s and 1 `\ref`** in the whole book: almost nothing is cross-referenced. Definitions, theorems and examples aren't numbered.
- Definitions, theorems, examples and solutions are plain text ("Definición:", "Solución:\\"), not environments, so they look different from page to page.
- Notation inconsistencies (e.g. a column vector written as $x^T = (\dots)$ but called the column vector itself).

**Language (Spanish grammar & spelling)**: examples found so far
- "ejemplos pr**á**ctivos" → "ejemplos **prácticos**"
- "Ingener**í**a" (slides) → "Ingeniería"
- "Ricatti" (5×) → "**Riccati**"
- "esta tabulado" → "**está** tabulado"; plus a full pass for accents, commas, and run-on sentences such as the one in §Laplace ("…ayudándose de una hasta el punto en que…").

**Incomplete content**
- Several worked problems stop after "Solución:" or after setting up the matrix, without interpreting the result (e.g. Alka-Seltzer balancing, water-distribution flow network, dairy distribution).
- The book **ends with an unsolved exercise** ($y''+6y'+8y=3e^{-2t}+2t$, "Resolver con coeficientes indeterminados y con transformada de Laplace").
- Few explicit "Ejemplo/Ejercicio" blocks: 4 and 5 occurrences respectively across 10 chapters.

**Rights / publishing**
- Third-party photos (e.g. *COREA-DEL-NORTE-750x375.jpg*, *transbordadorcolumbia.jpg*, *fosil-2.jpg*, control-room images) almost certainly can't be republished.
- University logos (USACH / DIQB) in the header: need permission, or remove for an independent edition.
- Past exams belong to the course/department. Republishing them is a decision for Erick (see D-B3).

---

## 2. Goals for the new edition
1. **Clean, modern typesetting** that compiles without warnings and looks consistent everywhere.
2. **Correct Spanish** (grammar, spelling, technical terminology).
3. **Numbered, cross-referenced** definitions, theorems, examples, exercises, equations and figures.
4. **Complete worked examples**, plus new exercises with answers per chapter.
5. **Republishable**: only own or openly licensed figures, clear license (proposed **CC BY-NC-SA 4.0**).
6. **Automatic builds**: PDF compiled by GitHub Actions and published on the website.

---

## 3. New structure

```
book/
├── main.tex                     # book class, loads preamble + chapters
├── preamble/
│   ├── packages.tex             # babel spanish, amsmath, mathtools, siunitx, mhchem,
│   │                            # graphicx, subcaption, tcolorbox, cleveref, hyperref, tikz/pgfplots
│   ├── macros.tex               # \R, \vect{}, \mat{}, \transp, \det, \rank, \Lap{}, …
│   └── environments.tex         # definicion, teorema, proposicion, ejemplo, ejercicio, solucion, nota
├── chapters/
│   ├── 00-prefacio.tex
│   ├── 01-matrices.tex
│   ├── 02-determinantes.tex
│   ├── 03-sistemas-lineales.tex
│   ├── 04-espacios-vectoriales.tex
│   ├── 05-transformaciones-lineales.tex
│   ├── 06-edo-primer-orden.tex
│   ├── 07-edo-segundo-orden.tex
│   └── 08-transformada-laplace.tex
├── appendices/
│   ├── A-soluciones.tex         # answers to end-of-chapter exercises
│   └── B-tabla-laplace.tex
├── figures/                     # own images + TikZ/pgfplots sources
├── slides/introduccion.tex      # cleaned beamer deck (optional)
└── latexmkrc
```

- The current "Ejercicios …" sections (4 and 7) become **end-of-chapter exercise sections** of their parent chapters instead of separate chapters.
- Each chapter: motivation (engineering application) → definitions/theorems → worked examples → summary box → exercises (with answers in Appendix A).

### 3.1 Visual style (matches the website, but print-friendly)
- `book` class, 11 pt, **Libertinus** or **Latin Modern** + matching math font, letter paper, generous margins.
- `tcolorbox` environments with thin left rules in the website palette (blue *Definición*, teal *Teorema*, gold *Ejemplo*, purple *Ejercicio*), light enough to print in grayscale.
- Chapter openers with a small TikZ graphic (e.g. a vector field for ODEs, a linear map acting on a grid for transformations, manim-style).
- Cover page: own design; a dark-mode cover variant for the website preview.

---

## 4. Work plan

| Step | Task | How | Output |
|---|---|---|---|
| **B0** | Extract & version | Unzip into `book/_original/` (git-ignored reference copy), set up new tree | Clean starting point |
| **B1** | Split & modernize preamble | Script splits `Libro_EG.tex` at `\section` into chapter files; `\section→\chapter`, `\subsection→\section` | Compiling skeleton |
| **B2** | Mechanical cleanup (scripted, then reviewed) | Regex passes: `\'a→á` etc.; `eqnarray→align`; `$$→\[\]`; `sen(→\sen(`; `NxM→N\times M`; remove `\\`/`\hspace` hacks where safe; fix image sizes (width only) | Diff per chapter for review |
| **B3** | Environments & labels | Wrap definitions/theorems/examples/solutions in environments; add `\label{def:…}`, `\label{eq:…}`, `\label{fig:…}`; use `\cref` | Numbered, linked book |
| **B4** | Language pass | Chapter-by-chapter grammar/spelling/terminology review (Spanish, Chilean academic register); consistent notation | Tracked list of changes |
| **B5** | Complete examples | Finish incomplete solutions (Alka-Seltzer, flow network, dairy, final ODE exercise, etc.); **verify all numeric results with SymPy** (`tools/verify_book.py`) | Every worked example complete and checked |
| **B6** | New exercises | 6–10 exercises per chapter with answers in Appendix A, several drawn from Erick's past exams (rewritten) | Exercise sets |
| **B7** | Figures | Replace third-party images with own TikZ/pgfplots drawings (meshes, flow networks, springs, Newton cooling curves, linear maps on grids); keep own diagrams, redrawn as vector graphics where possible | Rights-clean figures |
| **B8** | Build & publish | `latexmk` locally (MacTeX or Tectonic), plus GitHub Action `book.yml` (e.g. `xu-cheng/latex-action`) that builds `Complemento_de_Algebra.pdf` and page previews on every push | PDF + previews on the website |

### 4.1 Review workflow
- Work goes **one chapter per pull request** (or commit), so Erick can review diffs of the math and the wording separately.
- Mechanical (B2) and editorial (B4/B5) changes are kept in **separate commits** so math edits are easy to verify.
- Any *mathematical* change (not just formatting) is listed in a `CHANGELOG.md` with the reason.

### 4.2 Verification
- Zero LaTeX errors; zero "undefined reference" or overfull-box warnings above 5 pt.
- `tools/verify_book.py` (SymPy): recomputes determinants, inverses, RREF results, ODE solutions (e.g. checks that the Laplace-transform solution satisfies the ODE and initial conditions) for every worked example tagged `% verify:` in the source.
- Erick reads the final PDF of each chapter before it's published.

---

## 5. Example of the target style

**Before** (current):
```latex
Soluci\'on:\\
\vspace{1mm}
Debemos definir vectores con \'atomos en filas para plantear sistema matricial:
\begin{eqnarray*}
 ...
\end{eqnarray*}
```

**After:**
```latex
\begin{ejemplo}[Balance de la reacción del Alka-Seltzer]\label{ej:alka-seltzer}
  Balancee la reacción
  \[ x_1\,\ce{NaHCO3} + x_2\,\ce{H3C6H5O7} \;\longrightarrow\;
     x_3\,\ce{Na3C6H5O7} + x_4\,\ce{H2O} + x_5\,\ce{CO2}. \]
\end{ejemplo}
\begin{solucion}
  Planteando un balance por elemento (Na, H, C, O) se obtiene el sistema
  homogéneo $A\vect{x} = \vect{0}$ con
  \begin{align}
    A &= \begin{pmatrix} 1 & 0 & -3 & 0 & 0 \\ \dots \end{pmatrix}, \label{eq:alka-matriz}
  \end{align}
  cuya forma escalonada reducida entrega $\vect{x} = t\,(3,1,1,3,3)^{\transp}$.
  Con $t=1$: $3\,\ce{NaHCO3} + \ce{H3C6H5O7} \to \ce{Na3C6H5O7} + 3\,\ce{H2O} + 3\,\ce{CO2}$.
\end{solucion}
```

---

## 6. Decisions for Erick

| # | Question | Recommendation |
|---|---|---|
| D-B1 | License | **CC BY-NC-SA 4.0** (free to share and adapt, non-commercial, same license) |
| D-B2 | Keep USACH/DIQB branding? | Independent edition without logos; credit the course in the preface ("Material desarrollado para el curso … USACH, 2021–2023") |
| D-B3 | Include past exams (`Pruebas/`)? | Don't republish them verbatim; reuse problems in rewritten form as exercises |
| D-B4 | Include the ODE/Laplace chapters under an "Álgebra" title? | Keep them, and consider subtitle *"Álgebra lineal y ecuaciones diferenciales para ingeniería"* |
| D-B5 | LaTeX toolchain | No TeX installed on this Mac. Options: (a) install **MacTeX** or **Tectonic**, (b) compile only in GitHub Actions, (c) keep using Overleaf with the new structure. Recommend (b) + Tectonic locally |
| D-B6 | Slides | Clean up `Introduction.tex` too, or only the book for now |

---

## 7. Timeline (estimate)
| Step | Effort |
|---|---|
| B0–B2 (structure + mechanical cleanup) | 1 day |
| B3 (environments, labels) | 1–2 days |
| B4 (language) | 2 days (≈ 2 chapters per session) |
| B5–B6 (complete examples, new exercises) | 3–4 days |
| B7 (figures) | 2 days |
| B8 (CI build + website integration) | ½ day |

The website can link a **"v0.9 preview"** PDF after B3, then update to v1.0 when the remaining steps are done.

