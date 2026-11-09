#!/usr/bin/env python3
"""
Build the H2O line list used by the hero simulation (near 1469 nm).

Steps
  1. Fetch H2O (main isotopologue) lines from HITRAN for the padded window.
  2. Keep the lines that matter anywhere between 300 and 2000 K.
  3. Tabulate the partition function Q(T).
  4. Choose a default path length L so the peak absorbance is ~0.1.
  5. Write src/data/spectra.json (used by the site) and
     tests/reference_spectra.json (HAPI reference spectra for the JS physics test).

Requires internet the first time (HITRAN download is cached in tools/.hitran_cache/).
Requires: pip install hitran-api numpy
Usage:    python3 tools/build_spectral_data.py
"""
import json
import os
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / ".hitran_cache"
SITE_OUT = ROOT / "src" / "data" / "spectra.json"
TEST_OUT = ROOT / "tests" / "reference_spectra.json"

FETCH_RANGE = (6795.0, 6820.0)   # cm-1, padded so line wings are included
VIEW_RANGE = (6800.0, 6815.0)    # cm-1, what the plot shows (~1467.4-1470.6 nm)
T_RANGE = (300.0, 2000.0)        # K, slider range
KEEP_FRACTION = 0.001            # keep lines reaching >= 0.1 % of the strongest line (weak hot lines add up at high T)
T_REF = 296.0
C2 = 1.4387769                   # cm K, second radiation constant
DEFAULTS = {"T": 1000.0, "P": 1.0, "x": 0.10}


def fetch_lines(hapi):
    """Download (or reuse) the HITRAN table and return its columns as numpy arrays."""
    CACHE.mkdir(parents=True, exist_ok=True)
    os.chdir(CACHE)
    hapi.db_begin(".")
    if "H2O" not in hapi.tableList():
        hapi.fetch("H2O", 1, 1, *FETCH_RANGE)
    cols = ["nu", "sw", "elower", "gamma_air", "gamma_self", "n_air", "delta_air"]
    return {c: np.array(hapi.getColumn("H2O", c), dtype=float) for c in cols}


def line_strength(sw, nu, elower, T, Q):
    """HITRAN line strength scaled from 296 K to T (cm-1 / (molecule cm-2))."""
    return (sw * Q(T_REF) / Q(T)
            * np.exp(-C2 * elower * (1 / T - 1 / T_REF))
            * (1 - np.exp(-C2 * nu / T)) / (1 - np.exp(-C2 * nu / T_REF)))


def select_lines(lines, Q):
    """Keep lines whose strength reaches KEEP_FRACTION of the window maximum at some T."""
    temps = np.linspace(*T_RANGE, 35)
    strengths = np.array([line_strength(lines["sw"], lines["nu"], lines["elower"], T, Q) for T in temps])
    peak_per_line = strengths.max(axis=0)
    keep = peak_per_line >= KEEP_FRACTION * peak_per_line.max()
    return {k: v[keep] for k, v in lines.items()}


def absorbance(hapi, T, P, x, L, grid):
    """HAPI Voigt absorbance on `grid` for H2O mole fraction x and path length L (cm)."""
    _, coef = hapi.absorptionCoefficient_Voigt(
        SourceTables="H2O", HITRAN_units=False, WavenumberGrid=list(grid),
        Environment={"T": T, "p": P}, Diluent={"self": x, "air": 1 - x}, WavenumberWing=25.0)
    return np.asarray(coef) * x * L


def choose_path_length(hapi, grid):
    """Pick L (cm) so the window's peak absorbance is ~0.1 over 600-1500 K at the defaults."""
    peaks = [absorbance(hapi, T, DEFAULTS["P"], DEFAULTS["x"], 1.0, grid).max() for T in (600, 900, 1200, 1500)]
    return round(0.1 / float(np.mean(peaks)), 1)


def compact(field, value):
    """Round for a small JSON file. Line positions need absolute precision (lines are ~0.03 cm-1 wide)."""
    return round(float(value), 5) if field == "nu" else float(f"{value:.5g}")


def main():
    import hapi  # imported here so --help style reads don't need the package

    lines = fetch_lines(hapi)
    Q = lambda T: hapi.partitionSum(1, 1, T)
    kept = select_lines(lines, Q)
    # Note: HAPI references below use ALL fetched lines, so the JS test also checks
    # that dropping the weak lines doesn't change the spectrum noticeably.
    print(f"Lines: fetched {len(lines['nu'])}, kept {len(kept['nu'])}")

    grid = np.linspace(*VIEW_RANGE, 601)
    L = choose_path_length(hapi, grid)
    print(f"Default path length L = {L} cm")

    q_temps = np.arange(200, 2501, 25)
    site = {
        "source": "HITRAN2020 via HAPI, H2O (1,1)",
        "window_cm": VIEW_RANGE,
        "T_ref": T_REF,
        "mass_amu": 18.010565,
        "defaults": {**DEFAULTS, "L_cm": L},
        "Q": {"T0": 200, "dT": 25, "values": [round(float(Q(t)), 4) for t in q_temps]},
        "Q_ref": round(float(Q(T_REF)), 4),
        # one array per field keeps the JSON small and fast to parse
        "lines": {k: [compact(k, v) for v in kept[k]] for k in kept},
    }
    SITE_OUT.write_text(json.dumps(site, separators=(",", ":")) + "\n")
    print(f"Wrote {SITE_OUT.relative_to(ROOT)} ({SITE_OUT.stat().st_size / 1024:.1f} KB)")

    cases = [{"T": T, "P": P, "x": DEFAULTS["x"]} for T in (300, 1000, 1800) for P in (1.0, 3.0)]
    ref_grid = np.linspace(*VIEW_RANGE, 301)
    for c in cases:
        c["absorbance"] = [float(f"{v:.6g}") for v in absorbance(hapi, c["T"], c["P"], c["x"], L, ref_grid)]
    TEST_OUT.write_text(json.dumps({"L_cm": L, "grid": [round(v, 4) for v in ref_grid], "cases": cases}) + "\n")
    print(f"Wrote {TEST_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
