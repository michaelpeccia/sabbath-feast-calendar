"""Builds the app icon (design D: Kingdom Life emblem on a calendar page, violet background)
in every size Android and Google Play need, plus the launch screens.

Source: assets/logo/kingdom-life-ministry-logo.png (the real Kingdom Life Ministry logo).
Only the emblem above the words is used. The logo itself is never redrawn.

Run from the app folder:  python tools/make_icons.py
Needs Pillow:  pip install pillow
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
LOGO = os.path.join(ROOT, "assets", "logo", "kingdom-life-ministry-logo.png")

VIOLET = (139, 124, 240, 255)   # #8b7cf0 icon background
NAVY = (27, 22, 64, 255)        # #1b1640 calendar page and rings
GOLD = (227, 194, 122, 255)     # #e3c27a calendar header
MIDNIGHT = (18, 15, 43, 255)    # #120f2b launch screen background
WORK = 2048                      # draw big, then shrink, for clean edges


_EMBLEM = None


def emblem():
    """The crown, light and open book, cut from the logo above the words."""
    global _EMBLEM
    if _EMBLEM is not None:
        return _EMBLEM
    logo = Image.open(LOGO).convert("RGBA")
    alpha = logo.getchannel("A")
    # The words are the first wide band in the lower half. Just above them, the book narrows to its
    # spine; cut right below the narrowest row so the whole book stays and no letters come along.
    def span(y):
        xs = [x for x in range(logo.width) if alpha.getpixel((x, y)) > 40]
        return (max(xs) - min(xs)) if xs else 0
    counts = [sum(1 for x in range(logo.width) if alpha.getpixel((x, y)) > 40) for y in range(logo.height)]
    words = next((y for y in range(logo.height // 2, logo.height) if counts[y] > logo.width * 0.6), logo.height)
    window = [y for y in range(max(logo.height // 2, words - 12), words) if counts[y] > 0]
    cut = (min(window, key=span) + 1) if window else words
    top = logo.crop((0, 0, logo.width, cut))
    # Trim to the visible emblem (ignore faint edge pixels from the original's anti-aliasing).
    solid = top.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    _EMBLEM = top.crop(solid.getbbox())
    return _EMBLEM


def calendar_layer(size, scale=1.0):
    """Transparent square with the calendar page and emblem, laid out on a 512 grid."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    k = size / 512 * scale
    off = size / 2 - 256 * k

    def box(x0, y0, x1, y1):
        return [off + x0 * k, off + y0 * k, off + x1 * k, off + y1 * k]

    d.rounded_rectangle(box(86, 104, 426, 424), radius=44 * k, fill=NAVY)
    # Gold header: rounded at the top, square where it meets the page.
    d.rounded_rectangle(box(86, 104, 426, 184), radius=44 * k, fill=GOLD)
    d.rectangle(box(86, 144, 426, 184), fill=GOLD)
    d.rounded_rectangle(box(156, 74, 180, 140), radius=12 * k, fill=NAVY)
    d.rounded_rectangle(box(332, 74, 356, 140), radius=12 * k, fill=NAVY)

    em = emblem()
    # Fit inside the page below the gold header: at most 271 wide and 196 tall (512 grid).
    fit = min(271 / em.width, 196 / em.height)
    w = int(em.width * fit * k)
    h = int(em.height * fit * k)
    em = em.resize((w, h), Image.LANCZOS)
    x = int(size / 2 - w / 2)
    y = int(off + (184 + (424 - 184 - h / k) / 2) * k)  # centered in the page
    im.alpha_composite(em, (x, y))
    return im


def full_icon(size, shape):
    """Background plus calendar. shape: 'square' (Play Store), 'rounded' or 'circle'."""
    big = Image.new("RGBA", (WORK, WORK), (0, 0, 0, 0))
    bg = Image.new("RGBA", (WORK, WORK), VIOLET)
    mask = Image.new("L", (WORK, WORK), 0)
    md = ImageDraw.Draw(mask)
    if shape == "square":
        md.rectangle([0, 0, WORK, WORK], fill=255)
        content = calendar_layer(WORK)
    elif shape == "rounded":
        md.rounded_rectangle([0, 0, WORK - 1, WORK - 1], radius=WORK * 0.22, fill=255)
        content = calendar_layer(WORK)
    else:
        md.ellipse([0, 0, WORK - 1, WORK - 1], fill=255)
        content = calendar_layer(WORK, scale=0.86)
    big.paste(bg, (0, 0), mask)
    big.alpha_composite(content)
    return big.resize((size, size), Image.LANCZOS)


def adaptive_foreground(size):
    """Android 8+ shaped icons: the calendar sits inside the 72dp visible area of a 108dp layer."""
    big = calendar_layer(WORK, scale=(72 / 108) * 0.96)
    return big.resize((size, size), Image.LANCZOS)


def splash(w, h):
    im = Image.new("RGBA", (w, h), MIDNIGHT)
    s = int(min(w, h) * 0.32)
    icon = full_icon(s, "rounded")
    im.alpha_composite(icon, ((w - s) // 2, (h - s) // 2))
    return im.convert("RGB")


DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def main():
    for name, mult in DENSITIES.items():
        folder = os.path.join(RES, "mipmap-" + name)
        os.makedirs(folder, exist_ok=True)
        full_icon(int(48 * mult), "rounded").save(os.path.join(folder, "ic_launcher.png"))
        full_icon(int(48 * mult), "circle").save(os.path.join(folder, "ic_launcher_round.png"))
        adaptive_foreground(int(108 * mult)).save(os.path.join(folder, "ic_launcher_foreground.png"))

    # Launch screens: replace every existing splash.png, keeping its size.
    for dirpath, _, files in os.walk(RES):
        if "splash.png" in files:
            p = os.path.join(dirpath, "splash.png")
            w, h = Image.open(p).size
            splash(w, h).save(p)

    store = os.path.join(ROOT, "store")
    os.makedirs(store, exist_ok=True)
    full_icon(512, "square").save(os.path.join(store, "play-store-icon-512.png"))
    full_icon(1024, "rounded").save(os.path.join(store, "app-icon-1024.png"))
    print("Icons written.")


if __name__ == "__main__":
    main()
