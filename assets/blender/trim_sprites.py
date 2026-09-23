"""Crop rendered sprites to their alpha bounding box.

    python3 assets/blender/trim_sprites.py <src-dir> <dst-dir> [--pad 2]

`render_chess.py` renders every piece through one camera, so a pawn is genuinely
shorter than a king in the output. That is true to a real set, but on a board of
equal-sized squares the small pieces float with dead space around them. Trimming
each sprite to its own content lets the board CSS size each piece to fill its
square, which is what the original flat art did.

This is deliberately a separate step: the renders keep the honest proportions,
and trimming is a presentation choice applied on the way out.

Uses Pillow, so it runs under system Python rather than Blender's interpreter.
"""

import argparse
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install --user Pillow")


def trim(src, dst, pad):
    im = Image.open(src).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"{src} is fully transparent")

    left, upper, right, lower = bbox
    left = max(0, left - pad)
    upper = max(0, upper - pad)
    right = min(im.width, right + pad)
    lower = min(im.height, lower + pad)

    out = im.crop((left, upper, right, lower))
    out.save(dst, optimize=True)
    return im.size, out.size


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("src")
    parser.add_argument("dst")
    parser.add_argument("--pad", type=int, default=2,
                        help="transparent margin kept around the content")
    args = parser.parse_args()

    os.makedirs(args.dst, exist_ok=True)
    names = sorted(n for n in os.listdir(args.src) if n.endswith(".png"))
    if not names:
        sys.exit(f"no PNGs in {args.src}")

    for name in names:
        before, after = trim(os.path.join(args.src, name),
                             os.path.join(args.dst, name), args.pad)
        print(f"[trim] {name:16} {before[0]}x{before[1]} -> {after[0]}x{after[1]}")


if __name__ == "__main__":
    main()
