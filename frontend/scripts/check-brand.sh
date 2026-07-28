#!/usr/bin/env bash
# Брэндийн нэрийг кодод шууд бичихээс сэргийлнэ.
#
# Платформын нэр ЗӨВХӨН `src/brand.config.ts` дотор байх ёстой (болон
# `components/landing/copy.ts` — тэр нь зориудаар брэндийн маркетингийн текст).
# Өөр газар гарвал энэ шалгалт унана.
#
# Яагаад: өмнө нь брэнд 37 файлд тархсанаас upstream merge бүрд зохиомол
# conflict үүсдэг байв; мөн `ring-dgov`-ийн «Ring System» нэр template рүү
# гацаж, тэндээс гурван платформ руу хуулагдсан.
#
# Дэлгэрэнгүй: vision-gerege-mn/UI_CORE_PLAN.md §3.4
set -euo pipefail
cd "$(dirname "$0")/.."

# Флот дахь бүх платформын нэр — аль нь ч кодод шууд байж болохгүй.
PATTERN='Gerege Template Platform V3\.0|Gerege App|Gerege POS|Gerege Kiosk|Gerege Wallet|Ring System|Government Template Platform'

hits=$(grep -rInE "$PATTERN" src \
        --exclude=brand.config.ts \
        --exclude-dir=landing \
        || true)

if [ -n "$hits" ]; then
  echo "✗ Брэндийн нэр кодод шууд бичигдсэн байна:"
  echo
  echo "$hits" | sed 's/^/    /'
  echo
  echo "  Засах: src/brand.config.ts -ийн brand.name / brand.short -ыг ашиглана."
  echo "         Хуудасны гарчигт: pageTitle('<хуудасны нэр>')"
  exit 1
fi

echo "✓ Брэнд зөвхөн brand.config.ts дотор."
