#!/usr/bin/env python3
"""
Export the site's own images (not paper figures):
  - profile photo crops          -> assets/img/profile-{400,800}.webp
  - social-preview card          -> assets/img/og-image.jpg (1200x630)
  - algebra book page previews   -> assets/book/previews/{full,thumb}/p<N>.webp

Requires: pip install pymupdf pillow
Usage:    python3 tools/export_site_images.py
"""
import io
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "assets" / "img"
PREVIEWS = ROOT / "assets" / "book" / "previews"

PROFILE_SRC = ROOT / "resources" / "photos" / "Profile_photo.jpeg"
PROFILE_CROP = (158, 120, 1758, 1720)        # square around the face (source is 2016x2118)
BOOK_PDF = ROOT / "book" / "main.pdf"
BOOK_PAGES = [0, 6, 22, 40, 106]             # 0-based; pages with only own text/math (no third-party images)

BG = (11, 12, 16)
RED, BLUE, TEXT, MUTED = (252, 98, 85), (88, 196, 221), (236, 233, 226), (139, 147, 161)
FONT = "/System/Library/Fonts/Helvetica.ttc"


def save_webp(img, path, width, quality=84):
    path.parent.mkdir(parents=True, exist_ok=True)
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"✓ {path.relative_to(ROOT)}  {img.width}×{img.height}  {path.stat().st_size // 1024} KB")


def export_profile():
    photo = Image.open(PROFILE_SRC).convert("RGB").crop(PROFILE_CROP)
    for w in (400, 800):
        save_webp(photo, IMG / f"profile-{w}.webp", w, quality=80)
    return photo


def draw_grid(draw, w, h, step=40):
    for x in range(0, w, step):
        draw.line([(x, 0), (x, h)], fill=(20, 32, 38))
    for y in range(0, h, step):
        draw.line([(0, y), (w, y)], fill=(20, 32, 38))


def draw_laser(card, y, x1):
    """Glowing red beam: wide blurred stroke under a thin bright one."""
    glow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).line([(0, y), (x1, y)], fill=RED + (200,), width=14)
    card.alpha_composite(glow.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(card).line([(0, y), (x1, y)], fill=(255, 190, 180, 255), width=3)


def export_og_image(photo):
    W, H = 1200, 630
    card = Image.new("RGBA", (W, H), BG + (255,))
    draw = ImageDraw.Draw(card)
    draw_grid(draw, W, H)
    draw_laser(card, 470, 760)

    face = photo.resize((380, 380), Image.LANCZOS)
    mask = Image.new("L", face.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 379, 379), fill=255)
    draw.ellipse((768, 116, 1168, 516), outline=BLUE, width=3)
    card.paste(face, (778, 126), mask)

    big, mid, small = ImageFont.truetype(FONT, 66), ImageFont.truetype(FONT, 30), ImageFont.truetype(FONT, 24)
    draw.text((70, 150), "Erick Gatica Candia", font=big, fill=TEXT)
    draw.text((70, 245), "Laser absorption spectroscopy", font=mid, fill=BLUE)
    draw.text((70, 285), "for cleaner combustion", font=mid, fill=BLUE)
    draw.text((70, 360), "Ph.D. Student · Mechanical Engineering", font=small, fill=MUTED)
    draw.text((70, 392), "University of Colorado Boulder · Fulbright Scholar", font=small, fill=MUTED)
    out = IMG / "og-image.jpg"
    card.convert("RGB").save(out, "JPEG", quality=88)
    print(f"✓ {out.relative_to(ROOT)}")


def export_book_previews():
    doc = pymupdf.open(BOOK_PDF)
    for n in BOOK_PAGES:
        pix = doc[n].get_pixmap(dpi=150, alpha=False)
        page = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        save_webp(page, PREVIEWS / "full" / f"p{n + 1}.webp", 1100)
        save_webp(page, PREVIEWS / "thumb" / f"p{n + 1}.webp", 420)


if __name__ == "__main__":
    IMG.mkdir(parents=True, exist_ok=True)
    export_og_image(export_profile())
    export_book_previews()
