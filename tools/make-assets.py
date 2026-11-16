#!/usr/bin/env python3
"""Build prototype assets from the original sharenote-xyz art (kept as-is except legacy text removal).
- bill-blank.webp  : sharenote-example.png with the legacy '1K' corners, subtitle, 'SCRYPT·1024' band and decorative QR painted out
- logo.webp        : the original SN circuit monogram (transparent)
- era-2..5.webp    : History of Value illustrations
"""
from pathlib import Path
from statistics import median
import random
from PIL import Image, ImageDraw, ImageFilter

SRC = Path("/u/flzpace/xgit/orgs/soprinter/sharenote-xyz/public")
OUT = Path(__file__).resolve().parent / "assets"
OUT.mkdir(exist_ok=True)
random.seed(1723)

bill = Image.open(SRC / "sharenote-example.png").convert("RGB")
W, H = bill.size  # 1202 x 722

# 1. bottom band: tile the clean band segment (x 812-900) over the legacy text (x 278-812)
seg = bill.crop((812, 646, 900, 694))
x = 276
while x < 812:
    bill.paste(seg.crop((0, 0, min(88, 812 - x), 48)), (x, 646))
    x += 88

# 2. subtitle 'PROOF-OF-WORK RECEIPT NOTE': copy the paper texture from just below it
paper = bill.crop((292, 181, 818, 208))
bill.paste(paper, (292, 146))
bill.paste(paper.crop((0, 0, 526, 6)), (292, 172))

# 2b. decorative QR: replace with the paper texture just above it; the page prints a real QR of the record there
bill.paste(bill.crop((64, 290, 206, 428)), (64, 422))

# 3. corner '1K' cartouches: flat engraved-green fill with a fine line texture
def fill_badge(box):
    region = bill.crop(box)
    px = [p for p in region.get_flattened_data() if 60 < sum(p) / 3 < 150]
    base = tuple(int(median(c[i] for c in px)) for i in range(3)) if px else (60, 130, 75)
    patch = Image.new("RGB", (box[2] - box[0], box[3] - box[1]), base)
    d = ImageDraw.Draw(patch)
    for y in range(0, patch.size[1], 3):
        shade = tuple(max(0, c - 14) for c in base)
        d.line([(0, y), (patch.size[0], y + 2)], fill=shade, width=1)
    mask = Image.new("L", patch.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, patch.size[0] - 1, patch.size[1] - 1], radius=14, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    bill.paste(patch, box[:2], mask)

fill_badge((40, 48, 132, 122))
fill_badge((1070, 48, 1162, 122))

bill.resize((1000, round(1000 * H / W)), Image.LANCZOS).save(OUT / "bill-blank.webp", quality=80, method=6)

# logo + eras
Image.open(SRC / "logo.png").resize((240, round(240 * 483 / 856)), Image.LANCZOS).save(OUT / "logo.webp", quality=90, method=6)
for n in (2, 3, 4, 5):
    Image.open(SRC / "timeline" / f"note-{n}.png").convert("RGB").resize((560, round(560 * 950 / 1490)), Image.LANCZOS).save(OUT / f"era-{n}.webp", quality=78, method=6)

for f in sorted(OUT.iterdir()):
    print(f.name, f.stat().st_size // 1024, "KB")
