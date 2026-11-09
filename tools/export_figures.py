#!/usr/bin/env python3
"""
Export paper figures to WebP for the website.

Reads tools/figures.json, renders each figure's page region from the PDFs in
resources/ (git-ignored) at 300 dpi, trims the white margin, and writes:
  assets/figures/<project>/full/<id>.webp   (max 1600 px wide)
  assets/figures/<project>/thumb/<id>.webp  (600 px wide)
  src/data/figures.json                     (captions + sizes, used by the site)

The figure region is detected automatically: the area of the caption's column
between the last paragraph above the caption and the caption itself. Override
with "clip": [x0, y0, x1, y1] (PDF points) in figures.json when needed.

Requires: pip install pymupdf pillow
Usage:    python3 tools/export_figures.py [--only <project>]
"""
import io
import json
import re
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / "resources"
OUT = ROOT / "assets" / "figures"
DATA = ROOT / "src" / "data" / "figures.json"
DPI = 300
FULL_W, THUMB_W = 1600, 600


def columns(page_w):
    mid = page_w / 2
    return {"left": (34, mid - 2), "right": (mid + 2, page_w - 34), "full": (34, page_w - 34)}


def find_caption(page, n):
    pat = re.compile(rf"^(Fig\.|Figure)\s*{n}[\.:]")
    for b in page.get_text("blocks"):
        text = b[4].strip().replace("\n", " ")
        if pat.match(text):
            return pymupdf.Rect(b[:4]), re.sub(r"\s+", " ", text)
    raise ValueError(f"caption for Fig. {n} not found")


def auto_clip(page, cap):
    W = page.rect.width
    cols = columns(W)
    if cap.x1 < W / 2 + 4:
        col = cols["left"]
    elif cap.x0 > W / 2 - 4:
        col = cols["right"]
    else:
        col = cols["full"]
    x0, x1 = col
    top = 50.0
    for b in page.get_text("blocks"):
        r = pymupdf.Rect(b[:4])
        text = b[4].strip()
        if r.y1 > cap.y0 - 1 or r.x1 < x0 or r.x0 > x1:
            continue
        # body paragraphs are long and span most of the column; figure labels are not.
        # Other captions/tables above also bound the figure.
        is_para = len(text) > 150 and r.width > 0.6 * (x1 - x0)
        is_caption = re.match(r"^(Fig\.|Figure|Table)\s*\d+", text) is not None
        if is_para or is_caption:
            top = max(top, r.y1)
    return pymupdf.Rect(x0, top + 2, x1, cap.y0 - 2)


def trim(img, pad=16):
    bg = Image.new(img.mode, img.size, (255, 255, 255))
    diff = ImageChops.difference(img, bg).convert("L").point(lambda v: 255 if v > 18 else 0)
    box = diff.getbbox()
    if not box:
        return img
    x0, y0, x1, y1 = box
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def save(img, path, width):
    path.parent.mkdir(parents=True, exist_ok=True)
    if img.width > width:
        img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(path, "WEBP", quality=86, method=6)
    return img.size


def main():
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    spec = json.loads((ROOT / "tools" / "figures.json").read_text())
    manifest = json.loads(DATA.read_text()) if DATA.exists() and only else {}
    docs = {}
    for f in spec["figures"]:
        if only and f["project"] != only:
            continue
        doc = docs.setdefault(f["pdf"], pymupdf.open(RES / f["pdf"]))
        page = doc[f["page"]]
        cap_rect, caption = find_caption(page, f["fig"])
        clip = pymupdf.Rect(f["clip"]) if "clip" in f else auto_clip(page, cap_rect)
        pix = page.get_pixmap(dpi=DPI, clip=clip, alpha=False)
        img = trim(Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB"))
        base = OUT / f["project"]
        w, h = save(img, base / "full" / f"{f['id']}.webp", FULL_W)
        save(img, base / "thumb" / f"{f['id']}.webp", THUMB_W)
        # Strip the "Fig. N." prefix and the publisher's colour-reference note
        caption = re.sub(r"^(Fig\.|Figure)\s*\d+[\.:]\s*", "", caption)
        caption = re.sub(r"\s*\(For interpretation of the references.*$", "", caption)
        manifest.setdefault(f["project"], [])
        manifest[f["project"]] = [m for m in manifest[f["project"]] if m["id"] != f["id"]]
        manifest[f["project"]].append({"id": f["id"], "fig": f["fig"], "caption": caption, "width": w, "height": h})
        print(f"✓ {f['project']}/{f['id']}  {w}×{h}  clip={[round(v) for v in clip]}")
    DATA.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
