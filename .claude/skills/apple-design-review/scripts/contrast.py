#!/usr/bin/env python3
"""WCAG 2.x contrast ratio for colour pairs.

Usage:
  python contrast.py "#5a6478" "#ffffff"            # one pair
  python contrast.py "#e8401e/#f5f1e8" "#fff/#000"  # several pairs, fg/bg
  python contrast.py --alpha "rgba(0,167,182,0.1)" "#ffffff"  # composite fg over bg first

Prints the ratio and which thresholds it meets:
  text      4.5:1  (body text, WCAG AA; Apple cites this minimum)
  large     3:1    (text >= 24px regular or >= 18.66px bold, WCAG AA)
  non-text  3:1    (icons, control borders, focus rings)
"""
import re
import sys


def parse(color: str):
    c = color.strip().lower()
    if c.startswith("#"):
        h = c[1:]
        if len(h) in (3, 4):
            h = "".join(ch * 2 for ch in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    m = re.match(r"rgba?\(([^)]+)\)", c)
    if m:
        parts = [p.strip() for p in re.split(r"[ ,/]+", m.group(1)) if p.strip()]
        r, g, b = (float(p) for p in parts[:3])
        a = float(parts[3].rstrip("%")) / (100 if parts[3].endswith("%") else 1) if len(parts) > 3 else 1.0
        return r, g, b, a
    raise ValueError(f"Unsupported colour: {color!r} (use #hex or rgb()/rgba())")


def composite(fg, bg):
    r, g, b, a = fg
    br, bgc, bb, _ = bg
    return (r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a), 1.0)


def luminance(rgb):
    def ch(v):
        v = v / 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def ratio(fg, bg):
    if fg[3] < 1:
        fg = composite(fg, bg)
    l1, l2 = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def main(argv):
    args = [a for a in argv if a != "--alpha"]
    # "fg/bg" pairs, unless exactly two plain colours were given.
    is_pair = lambda a: "/" in a and not a.lstrip().lower().startswith("rgb")
    if len(args) == 2 and not any(is_pair(a) for a in args):
        pairs = [(args[0], args[1])]
    else:
        pairs = [tuple(a.split("/", 1)) for a in args]
    for fg, bg in pairs:
        r = ratio(parse(fg), parse(bg))
        verdict = ", ".join(
            f"{name} {'pass' if r >= need else 'FAIL'}"
            for name, need in (("text 4.5", 4.5), ("large 3", 3.0), ("non-text 3", 3.0))
        )
        print(f"{fg} on {bg}: {r:.2f}:1  ({verdict})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1:])
