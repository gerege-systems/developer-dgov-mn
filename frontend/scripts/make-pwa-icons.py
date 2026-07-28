#!/usr/bin/env python3
# Gerege Template Platform V3.0
# Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.

"""PWA-ийн дүрсүүдийг репо доторх брэнд маркаас үүсгэнэ.

Гаралт → frontend/public/icons/
  icon-192.png            192x192, purpose "any"   (эх маркийн дугуйруу булан хэвээр)
  icon-512.png            512x512, purpose "any"
  icon-512-maskable.png   512x512, purpose "maskable" — булан хүртэл дүүрэн (full-bleed)
  apple-touch-icon.png    180x180, ил тод хэсэггүй (iOS өөрөө маскална)

Maskable-ийн аюулгүй бүс: маркийг ЖИЖИГРҮҮЛЭХГҮЙ — эх зурган дээр дугуй марк нь
өргөний ~66%-ийг эзэлдэг тул төвийн 80% аюулгүй бүсэд аль хэдийн багтдаг. Хийх
ёстой цорын ганц зүйл нь дугуйруу булангийн ИЛ ТОД хэсгийг брэндийн хөх өнгөөр
дүүргэж, дөрвөлжинг бүтэн болгох (маскаар тайрахад цагаан ирмэг гарахгүй).

Шаардлага: Pillow (`pip install pillow`). Дүрсийг repo-д commit хийдэг тул энэ
скриптийг зөвхөн марк өөрчлөгдөх үед ажиллуулна.

Хэрэглээ (frontend/ дотроос):  npm run icons:pwa
"""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - зөвхөн хэрэгсэл дутуу үед
    sys.exit("Pillow олдсонгүй. Суулгах: pip install pillow")

FRONTEND = Path(__file__).resolve().parent.parent
REPO = FRONTEND.parent
OUT_DIR = FRONTEND / "public" / "icons"

# Эрэмбэ: хамгийн өндөр нягтралтай эх сурвалжийг эхэлж авна.
SOURCES = [
    REPO / "docs-site" / "docs" / "assets" / "logo.webp",  # 1040x1040
    FRONTEND / "public" / "brand.webp",                    # 512x512
]


def load_source() -> Image.Image:
    for path in SOURCES:
        if path.is_file():
            print(f"Эх сурвалж: {path.relative_to(REPO)}")
            return Image.open(path).convert("RGBA")
    sys.exit("Брэнд марк олдсонгүй: " + ", ".join(str(p) for p in SOURCES))


def brand_color(img: Image.Image) -> tuple[int, int, int]:
    """Дэвсгэрийн хөхийг зурганаас өөрөөс нь түүнэ — гар аргаар hex бичихгүй.

    Дээд ирмэгийн голоос (булангийн ил тод бүсээс гадуур, марк эхлэхээс дээгүүр)
    түүвэрлэнэ.
    """
    w, _ = img.size
    r, g, b, _ = img.getpixel((w // 2, max(2, w // 40)))
    return (r, g, b)


# Эх маркийг ийш нь томсгож голоос нь тайрна — ингэснээр дугуйруу булангийн
# зөөлөн ирмэг зурагнаас бүрэн гарч, дэвсгэр жигд болно. Дугуй марк 66% → ~74%
# болж томроход ч maskable-ийн 80% аюулгүй бүсэд хэвээр багтана.
MASKABLE_ZOOM = 1.12


def full_bleed(img: Image.Image, size: int, bg: tuple[int, int, int]) -> Image.Image:
    """Дугуйруу булантай маркийг жигд дүүрэн дөрвөлжин болгоно."""
    canvas = Image.new("RGB", (size, size), bg)
    inner = round(size * MASKABLE_ZOOM)
    scaled = img.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(scaled, (offset, offset), scaled)
    return canvas


def main() -> None:
    src = load_source()
    bg = brand_color(src)
    print(f"Брэнд дэвсгэр: #{bg[0]:02X}{bg[1]:02X}{bg[2]:02X}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # purpose "any" — эх маркийг хэвээр (ил тод булантай) жижигрүүлнэ.
    for size in (192, 512):
        out = OUT_DIR / f"icon-{size}.png"
        src.resize((size, size), Image.LANCZOS).save(out, "PNG", optimize=True)
        print(f"  {out.relative_to(FRONTEND)}")

    # purpose "maskable" — булан хүртэл дүүрэн.
    maskable = OUT_DIR / "icon-512-maskable.png"
    full_bleed(src, 512, bg).save(maskable, "PNG", optimize=True)
    print(f"  {maskable.relative_to(FRONTEND)}")

    # iOS — ил тод хэсэггүй байх ёстой (эс бөгөөс хар дэвсгэр гарна).
    apple = OUT_DIR / "apple-touch-icon.png"
    full_bleed(src, 180, bg).save(apple, "PNG", optimize=True)
    print(f"  {apple.relative_to(FRONTEND)}")


if __name__ == "__main__":
    main()
