#!/usr/bin/env bash
# Gerege Template Platform V3.0
# Gerege Systems Development Team болон Claude AI хамтран бүтээв, 2026.
#
# Аппын дүрсийг web-ийн брэнд зурагнаас (frontend/public/brand.webp) үүсгэнэ.
# Зөвхөн macOS-ийн суурин хэрэгслүүд — sips + iconutil.
#
# Хэрэглээ (desktop/TemplateDesktop дотроос):  npm run icon

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
source_image="$root/frontend/public/brand.webp"
out="$here/../resources/icon.icns"

if [[ ! -f "$source_image" ]]; then
  echo "Эх зураг олдсонгүй: $source_image" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

iconset="$work/icon.iconset"
mkdir -p "$iconset"

# 1024px суурь PNG — бусад бүх хэмжээ эндээс жижигрэнэ.
sips -s format png -z 1024 1024 "$source_image" --out "$work/base.png" >/dev/null

for size in 16 32 128 256 512; do
  sips -s format png -z "$size" "$size" "$work/base.png" --out "$iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -s format png -z "$double" "$double" "$work/base.png" --out "$iconset/icon_${size}x${size}@2x.png" >/dev/null
done

mkdir -p "$(dirname "$out")"
iconutil --convert icns "$iconset" --output "$out"
echo "Үүслээ: $out"
