#!/usr/bin/env python3
"""SharenoteZ: a one-glyph font (z and Z) for Z-bits.
The z keeps its two bars; its diagonal is drawn as a slanted zero (an oval ring), because a Z-bit counts zeros.
Metrics follow Geist Mono (UPM 1000, advance 600, x-height 536, cap height 710) so the glyph drops in between its digits.
Needs fontTools + brotli:  python -m pip install fonttools brotli
Writes assets/SharenoteZ.woff2 (and .ttf for inspection).
"""
import math
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

OUT = Path(__file__).resolve().parent / "assets"


def rect(pen, x0, y0, x1, y1):  # clockwise (y up) = filled
    pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()


def ellipse(pen, cx, cy, a, b, ang, clockwise, n=96):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x, y = a * math.cos(t), b * math.sin(t)
        pts.append((round(cx + x * math.cos(ang) - y * math.sin(ang)), round(cy + x * math.sin(ang) + y * math.cos(ang))))
    if clockwise:
        pts.reverse()
    pen.moveTo(pts[0])
    for p in pts[1:]:
        pen.lineTo(p)
    pen.closePath()


def zed(x0, x1, top, bar, ring, hole_w):
    """Two bars plus a slanted zero joining bottom-left to top-right."""
    pen = TTGlyphPen(None)
    rect(pen, x0, top - bar, x1, top)          # top bar
    rect(pen, x0, 0, x1, bar)                  # bottom bar
    ax, ay = x0 + 40, bar * 0.55               # where the zero meets the bottom bar
    bx, by = x1 - 40, top - bar * 0.55         # and the top bar
    cx, cy = (ax + bx) / 2, (ay + by) / 2
    ang = math.atan2(by - ay, bx - ax)
    half = math.hypot(bx - ax, by - ay) / 2
    # keep the hole inside the space between the bars, measured along the slant
    gap = (top - 2 * bar) / 2 / math.sin(ang)
    a_out, b_out = half + ring * 0.2, hole_w / 2 + ring
    a_in, b_in = min(half - ring * 0.9, gap - 18), hole_w / 2
    ellipse(pen, cx, cy, a_out, b_out, ang, clockwise=True)    # outer: filled
    ellipse(pen, cx, cy, a_in, b_in, ang, clockwise=False)     # inner: the zero's hole
    return pen.glyph()


def notdef():
    pen = TTGlyphPen(None)
    rect(pen, 80, 0, 520, 700)
    return pen.glyph()


glyphs = {
    ".notdef": notdef(),
    "z": zed(69, 531, 536, 96, 80, 112),
    "Z": zed(48, 552, 710, 104, 88, 140),
}
fb = FontBuilder(1000, isTTF=True)
fb.setupGlyphOrder(list(glyphs))
fb.setupCharacterMap({0x7A: "z", 0x5A: "Z"})
fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics({g: (600, glyphs[g].xMin if hasattr(glyphs[g], "xMin") else 0) for g in glyphs})
fb.setupHorizontalHeader(ascent=1005, descent=-295)
fb.setupNameTable({"familyName": "SharenoteZ", "styleName": "Bold", "uniqueFontIdentifier": "SharenoteZ-Bold", "fullName": "SharenoteZ Bold", "psName": "SharenoteZ-Bold", "version": "Version 1.000"})
fb.setupOS2(sTypoAscender=1005, sTypoDescender=-295, usWinAscent=1005, usWinDescent=295, sxHeight=536, sCapHeight=710, usWeightClass=700)
fb.setupPost()
OUT.mkdir(exist_ok=True)
fb.save(str(OUT / "SharenoteZ.ttf"))
fb.font.flavor = "woff2"
fb.save(str(OUT / "SharenoteZ.woff2"))
print("SharenoteZ.woff2", (OUT / "SharenoteZ.woff2").stat().st_size, "bytes")
