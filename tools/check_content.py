#!/usr/bin/env python3
"""
Content checks before publishing:
  1. every DOI in publications.json resolves (HTTP 200/30x)
  2. every figure listed in projects.json exists in figures.json and on disk
  3. every publication id referenced by a project exists

Usage: python3 tools/check_content.py   (needs internet for step 1)
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"


def load(name):
    return json.loads((DATA / name).read_text())


def check_dois(pubs):
    errors = []
    for p in pubs:
        url = f"https://doi.org/{p['doi']}"
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "site-content-check/1.0"})
        try:
            # doi.org answers with a redirect to the publisher; we only need that first hop
            opener = urllib.request.build_opener(NoRedirect)
            status = opener.open(req, timeout=15).status
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception as e:  # network problems
            status = str(e)
        ok = status in (200, 301, 302, 303, 307, 308)
        print(f"{'✓' if ok else '✗'} doi:{p['doi']}  ({status})")
        if not ok:
            errors.append(p["doi"])
    return errors


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

    def http_error_302(self, req, fp, code, msg, headers):
        return fp

    http_error_301 = http_error_303 = http_error_307 = http_error_308 = http_error_302


def check_figures(projects, figures):
    errors = []
    for proj in projects:
        known = {f["id"] for f in figures.get(proj["id"], [])}
        for fid in proj["figures"]:
            path = ROOT / "assets" / "figures" / proj["id"] / "full" / f"{fid}.webp"
            if fid not in known or not path.exists():
                errors.append(f"{proj['id']}/{fid}")
    return errors


def check_publication_links(projects, pubs):
    ids = {p["id"] for p in pubs}
    return [f"{proj['id']} → {pid}" for proj in projects for pid in proj["publications"] if pid not in ids]


def main():
    pubs = load("publications.json")["publications"]
    projects = load("projects.json")["projects"]
    figures = load("figures.json")

    problems = []
    problems += [f"missing figure {e}" for e in check_figures(projects, figures)]
    problems += [f"unknown publication {e}" for e in check_publication_links(projects, pubs)]
    if "--offline" not in sys.argv:
        problems += [f"DOI does not resolve: {e}" for e in check_dois(pubs)]

    if problems:
        print("\n".join(["", "Problems:"] + problems))
        sys.exit(1)
    print("\nAll content checks passed.")


if __name__ == "__main__":
    main()
